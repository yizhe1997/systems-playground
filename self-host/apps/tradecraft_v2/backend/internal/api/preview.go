package api

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"tradecraft/internal/store"
	"tradecraft/internal/timeinput"
)

// previewInput is whatever has been typed so far, as typed. Every field is optional.
type previewInput struct {
	AccountID       *string `json:"accountId"`
	Instrument      *string `json:"instrument"`
	Direction       *string `json:"direction"`
	Size            *string `json:"size"`
	EntryPrice      *string `json:"entryPrice"`
	EntryAt         *string `json:"entryAt"`
	ExitPrice       *string `json:"exitPrice"`
	ExitAt          *string `json:"exitAt"`
	DollarsPerPoint *string `json:"dollarsPerPoint"`
	Cost            *string `json:"cost"`
	StopPrice       *string `json:"stopPrice"`
	TypedResult     *string `json:"typedResult"`
}

type previewJSON struct {
	GrossResult *string           `json:"grossResult"`
	Costs       *string           `json:"costs"`
	NetResult   *string           `json:"netResult"`
	Risk        *string           `json:"risk"`
	RMultiple   *string           `json:"rMultiple"`
	TradingDay  *string           `json:"tradingDay"`
	Reasons     map[string]string `json:"reasons"`
}

func nonEmpty(s string) *string {
	if s == "" {
		return nil
	}
	v := outDecimal(s)
	return &v
}

// previewTrade works out the figures for a form that may be empty or half typed. It never refuses: an input it
// cannot read counts as missing, and each figure that cannot be worked out is null with its plain reason. The
// figures come from the same SQL functions as the stored columns.
func (s *Server) previewTrade(c *fiber.Ctx) error {
	var in previewInput
	if err := readBody(c, &in); err != nil {
		return err
	}
	ctx := c.Context()
	reasons := map[string]string{}
	notNumber := map[string]bool{}

	// num reads a typed number; a malformed one counts as missing and is remembered as "not a number".
	num := func(key string, p *string) *string {
		if blank(p) {
			return nil
		}
		_, text, msg := parseDecimal(*p)
		if msg != "" {
			notNumber[key] = true
			return nil
		}
		return &text
	}
	arg := store.PreviewTradeParams{
		Size: num("size", in.Size), EntryPrice: num("entryPrice", in.EntryPrice), ExitPrice: num("exitPrice", in.ExitPrice),
		DollarsPerPoint: num("dollarsPerPoint", in.DollarsPerPoint), StopPrice: num("stopPrice", in.StopPrice),
		TypedResult: num("typedResult", in.TypedResult),
	}
	if in.Direction != nil && (*in.Direction == "long" || *in.Direction == "short") {
		arg.Direction = in.Direction
	}
	zero := "0"
	if blank(in.Cost) {
		arg.Cost = &zero
	} else {
		arg.Cost = num("cost", in.Cost)
	}

	loc, err := s.journalLocation(ctx)
	if err != nil {
		return err
	}
	var timeReason string
	switch {
	case blank(in.ExitAt):
		timeReason = "needs an exit time"
	default:
		t, err := timeinput.Parse(*in.ExitAt, loc)
		if err != nil {
			timeReason = err.Error()
		} else {
			arg.ExitAt = &t
		}
	}
	var accountReason string
	if in.AccountID == nil || !uuidText.MatchString(*in.AccountID) {
		accountReason = "needs an account"
	} else if _, err := s.q.GetAccount(ctx, *in.AccountID); errors.Is(err, pgx.ErrNoRows) {
		accountReason = "needs an account"
	} else if err != nil {
		return err
	} else {
		arg.AccountID = in.AccountID
	}

	row, err := s.q.PreviewTrade(ctx, arg)
	if err != nil {
		return err
	}
	out := previewJSON{
		GrossResult: nonEmpty(row.GrossResult), NetResult: nonEmpty(row.NetResult),
		Risk: nonEmpty(row.Risk), RMultiple: nonEmpty(row.RMultiple), Reasons: reasons,
	}
	if row.TradingDay != "" { // a date, not a decimal: sent as the database wrote it
		out.TradingDay = &row.TradingDay
	}

	anyBad := func(keys ...string) bool {
		for _, k := range keys {
			if notNumber[k] {
				return true
			}
		}
		return false
	}

	if out.GrossResult == nil {
		if anyBad("size", "entryPrice", "exitPrice", "dollarsPerPoint") {
			reasons["grossResult"] = "not a number"
		} else {
			reasons["grossResult"] = "needs prices, size and dollars per point"
		}
	}
	if arg.DollarsPerPoint == nil { // a typed result is already after costs
		reasons["costs"] = "a typed result is already after costs"
	} else {
		out.Costs = arg.Cost
		if arg.Cost == nil {
			reasons["costs"] = "not a number"
		}
	}
	if out.NetResult == nil {
		switch {
		case anyBad("typedResult", "cost", "dollarsPerPoint"):
			reasons["netResult"] = "not a number"
		case arg.DollarsPerPoint == nil:
			reasons["netResult"] = "type the result, or add dollars per point"
		default:
			reasons["netResult"] = reasons["grossResult"]
		}
	}
	if out.Risk == nil {
		switch {
		case anyBad("stopPrice", "size", "entryPrice", "dollarsPerPoint"):
			reasons["risk"] = "not a number"
		case arg.Size != nil && arg.EntryPrice != nil:
			reasons["risk"] = riskReason(arg.StopPrice, arg.DollarsPerPoint)
		default:
			reasons["risk"] = "needs a stop and dollars per point"
		}
	}
	if out.RMultiple == nil {
		reasons["rMultiple"] = "needs a net result and a risk"
	}
	if out.TradingDay == nil {
		switch {
		case timeReason != "":
			reasons["tradingDay"] = timeReason
		default:
			reasons["tradingDay"] = accountReason
		}
	}
	return c.JSON(out)
}
