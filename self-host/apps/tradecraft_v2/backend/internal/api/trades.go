package api

import (
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/shopspring/decimal"

	"tradecraft/internal/store"
	"tradecraft/internal/timeinput"
)

// tradeInput is what the owner types. Numbers are strings; optional ones may be absent, null or "".
type tradeInput struct {
	AccountID         string     `json:"accountId"`
	Instrument        string     `json:"instrument"`
	Direction         string     `json:"direction"`
	Size              string     `json:"size"`
	EntryPrice        string     `json:"entryPrice"`
	EntryAt           string     `json:"entryAt"`
	ExitPrice         string     `json:"exitPrice"`
	ExitAt            string     `json:"exitAt"`
	DollarsPerPoint   *string    `json:"dollarsPerPoint"`
	Cost              *string    `json:"cost"`
	StopPrice         *string    `json:"stopPrice"`
	TypedResult       *string    `json:"typedResult"`
	Thesis            *string    `json:"thesis"`
	ExpectedUpdatedAt *time.Time `json:"expectedUpdatedAt"`
}

type tradeJSON struct {
	ID              string            `json:"id"`
	AccountID       string            `json:"accountId"`
	AccountName     string            `json:"accountName"`
	Currency        string            `json:"currency"`
	Instrument      string            `json:"instrument"`
	Direction       string            `json:"direction"`
	Size            string            `json:"size"`
	EntryPrice      string            `json:"entryPrice"`
	EntryAt         string            `json:"entryAt"`
	ExitPrice       string            `json:"exitPrice"`
	ExitAt          string            `json:"exitAt"`
	DollarsPerPoint *string           `json:"dollarsPerPoint"`
	Cost            string            `json:"cost"`
	StopPrice       *string           `json:"stopPrice"`
	TypedResult     *string           `json:"typedResult"`
	Thesis          *string           `json:"thesis"`
	GrossResult     *string           `json:"grossResult"`
	NetResult       *string           `json:"netResult"`
	Risk            *string           `json:"risk"`
	RMultiple       *string           `json:"rMultiple"`
	TradingDay      string            `json:"tradingDay"`
	Reasons         map[string]string `json:"reasons"`
	Deleted         bool              `json:"deleted"`
	UpdatedAt       string            `json:"updatedAt"`
}

// riskReason says why risk (and so R) is a dash, in the words the screens use.
func riskReason(stop, dollarsPerPoint *string) string {
	switch {
	case stop == nil && dollarsPerPoint == nil:
		return "needs a stop and dollars per point"
	case stop == nil:
		return "no stop recorded"
	case dollarsPerPoint == nil:
		return "needs dollars per point"
	default:
		return "stop equals entry"
	}
}

func toTrade(r store.TradeDetail, loc *time.Location) tradeJSON {
	t := tradeJSON{
		ID: r.ID, AccountID: r.AccountID, AccountName: r.AccountName, Currency: r.AccountCurrency,
		Instrument: r.Instrument, Direction: r.Direction, Size: outDecimal(r.Size),
		EntryPrice: outDecimal(r.EntryPrice), EntryAt: r.EntryAt.In(loc).Format(time.RFC3339),
		ExitPrice: outDecimal(r.ExitPrice), ExitAt: r.ExitAt.In(loc).Format(time.RFC3339),
		DollarsPerPoint: outDecimalPtr(r.DollarsPerPoint), Cost: outDecimal(r.Cost),
		StopPrice: outDecimalPtr(r.StopPrice), TypedResult: outDecimalPtr(r.TypedResult), Thesis: r.Thesis,
		GrossResult: outDecimalPtr(r.GrossResult), NetResult: outDecimalPtr(r.NetResult),
		Risk: outDecimalPtr(r.Risk), RMultiple: outDecimalPtr(r.RMultiple),
		Reasons: map[string]string{}, Deleted: r.Deleted, UpdatedAt: fmtTime(r.UpdatedAt),
	}
	if r.TradingDay != nil {
		t.TradingDay = r.TradingDay.Format("2006-01-02")
	}
	if r.GrossResult == nil {
		t.Reasons["grossResult"] = "needs dollars per point"
	}
	if r.Risk == nil {
		t.Reasons["risk"] = riskReason(r.StopPrice, r.DollarsPerPoint)
		t.Reasons["rMultiple"] = t.Reasons["risk"]
	}
	return t
}

// blank reports whether an optional typed value is absent.
func blank(p *string) bool { return p == nil || strings.TrimSpace(*p) == "" }

// decimalField reads one required number into text, adding a field error when it is wrong.
func decimalField(fe *[]fieldError, field, label, v string, positive bool) (string, decimal.Decimal) {
	d, text, msg := parseDecimal(v)
	if msg == "" && positive && !d.IsPositive() {
		msg = label + " must be above zero."
	}
	if msg != "" {
		*fe = append(*fe, fieldError{field, msg})
		return "", decimal.Zero
	}
	return text, d
}

// optionalDecimal reads an optional number (null when blank). With positive, zero and below are refused.
func optionalDecimal(fe *[]fieldError, field, label string, p *string, positive bool) *string {
	if blank(p) {
		return nil
	}
	text, _ := decimalField(fe, field, label, *p, positive)
	if text == "" {
		return nil
	}
	return &text
}

// tradeFields is the validated trade, ready for the database.
type tradeFields struct {
	accountID                  string
	instrument, direction      string
	size, entryPrice, exitPrice string
	entryAt, exitAt            time.Time
	dollarsPerPoint, stopPrice *string
	typedResult, thesis        *string
	cost                       string
}

// validateTrade checks the typed trade in the order of data-model.md and answers every problem at once,
// in the order of the form. checkAccountActive is true for a new trade and for a trade moved to another account.
func (s *Server) validateTrade(c *fiber.Ctx, in tradeInput, loc *time.Location, checkAccountActive bool) (tradeFields, error) {
	var fe []fieldError
	f := tradeFields{}

	if !uuidText.MatchString(in.AccountID) {
		fe = append(fe, fieldError{"accountId", "Choose an account."})
	} else if acct, err := s.q.GetAccount(c.Context(), in.AccountID); errors.Is(err, pgx.ErrNoRows) {
		fe = append(fe, fieldError{"accountId", "Choose an account."})
	} else if err != nil {
		return f, err
	} else if checkAccountActive && acct.Archived {
		fe = append(fe, fieldError{"accountId", "That account is archived. Choose an active account."})
	} else {
		f.accountID = in.AccountID
	}

	f.instrument = strings.TrimSpace(in.Instrument)
	switch {
	case f.instrument == "":
		fe = append(fe, fieldError{"instrument", "Instrument is required."})
	case utf8.RuneCountInString(f.instrument) > 40:
		fe = append(fe, fieldError{"instrument", "Instrument can be at most 40 characters."})
	}

	if in.Direction != "long" && in.Direction != "short" {
		fe = append(fe, fieldError{"direction", "Choose long or short."})
	}
	f.direction = in.Direction

	if strings.TrimSpace(in.Size) == "" {
		fe = append(fe, fieldError{"size", "Size is required."})
	} else {
		f.size, _ = decimalField(&fe, "size", "Size", in.Size, true)
	}

	entryBlank, exitBlank := strings.TrimSpace(in.EntryPrice) == "", strings.TrimSpace(in.ExitPrice) == ""
	switch {
	case entryBlank && exitBlank:
		fe = append(fe, fieldError{"entryPrice", "Entry price and exit price are required."})
	case entryBlank:
		fe = append(fe, fieldError{"entryPrice", "Entry price is required."})
	case exitBlank:
		fe = append(fe, fieldError{"exitPrice", "Exit price is required."})
	}
	if !entryBlank {
		f.entryPrice, _ = decimalField(&fe, "entryPrice", "Entry price", in.EntryPrice, true)
	}
	if !exitBlank {
		f.exitPrice, _ = decimalField(&fe, "exitPrice", "Exit price", in.ExitPrice, true)
	}

	// times: a minute of slack past the current time
	limit := s.now().Add(time.Minute)
	readTime := func(field, label, v string) (time.Time, bool) {
		if strings.TrimSpace(v) == "" {
			fe = append(fe, fieldError{field, label + " time is required."})
			return time.Time{}, false
		}
		t, err := timeinput.Parse(v, loc)
		if err != nil {
			fe = append(fe, fieldError{field, err.Error()})
			return time.Time{}, false
		}
		return t, true
	}
	entryAt, entryOK := readTime("entryAt", "Entry", in.EntryAt)
	exitAt, exitOK := readTime("exitAt", "Exit", in.ExitAt)
	f.entryAt, f.exitAt = entryAt, exitAt
	futureReported := false
	if entryOK && entryAt.After(limit) {
		fe = append(fe, fieldError{"entryAt", "Times cannot be in the future."})
		futureReported = true
	}
	if exitOK && exitAt.After(limit) && !futureReported {
		fe = append(fe, fieldError{"exitAt", "Times cannot be in the future."})
	}
	if entryOK && exitOK && exitAt.Before(entryAt) {
		fe = append(fe, fieldError{"exitAt", "Exit must not be earlier than the entry."})
	}

	f.dollarsPerPoint = optionalDecimal(&fe, "dollarsPerPoint", "Dollars per point", in.DollarsPerPoint, true)
	f.cost = "0"
	if !blank(in.Cost) {
		d, text, msg := parseDecimal(*in.Cost)
		switch {
		case msg != "":
			fe = append(fe, fieldError{"cost", msg})
		case d.IsNegative():
			fe = append(fe, fieldError{"cost", "Costs cannot be negative."})
		default:
			f.cost = text
		}
	}
	f.stopPrice = optionalDecimal(&fe, "stopPrice", "Stop price", in.StopPrice, true)

	if blank(in.DollarsPerPoint) {
		if blank(in.TypedResult) {
			fe = append(fe, fieldError{"typedResult", "Result is required while dollars per point is blank."})
		} else {
			f.typedResult = optionalDecimal(&fe, "typedResult", "Result", in.TypedResult, false)
		}
	} // with dollars per point present, a typed result is discarded

	if in.Thesis != nil && strings.TrimSpace(*in.Thesis) != "" {
		if utf8.RuneCountInString(*in.Thesis) > 5000 {
			fe = append(fe, fieldError{"thesis", "Thesis can be at most 5,000 characters."})
		} else {
			f.thesis = in.Thesis
		}
	}

	if len(fe) > 0 {
		return f, invalid("trade", fe)
	}
	return f, nil
}

func (s *Server) loadTrade(c *fiber.Ctx, id string, loc *time.Location) (tradeJSON, error) {
	r, err := s.q.GetTrade(c.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		return tradeJSON{}, notFound("trade")
	}
	if err != nil {
		return tradeJSON{}, err
	}
	return toTrade(r, loc), nil
}

func (s *Server) createTrade(c *fiber.Ctx) error {
	var in tradeInput
	if err := readBody(c, &in); err != nil {
		return err
	}
	loc, err := s.journalLocation(c.Context())
	if err != nil {
		return err
	}
	f, err := s.validateTrade(c, in, loc, true)
	if err != nil {
		return err
	}
	id, err := s.q.InsertTrade(c.Context(), store.InsertTradeParams{
		AccountID: f.accountID, Instrument: f.instrument, Direction: f.direction, Size: f.size,
		EntryPrice: f.entryPrice, ExitPrice: f.exitPrice, EntryAt: f.entryAt, ExitAt: f.exitAt,
		DollarsPerPoint: f.dollarsPerPoint, Cost: f.cost, StopPrice: f.stopPrice,
		TypedResult: f.typedResult, Thesis: f.thesis,
	})
	if err != nil {
		return err
	}
	t, err := s.loadTrade(c, id, loc)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(t)
}

func (s *Server) getTrade(c *fiber.Ctx) error {
	id, err := pathID(c, "trade")
	if err != nil {
		return err
	}
	loc, err := s.journalLocation(c.Context())
	if err != nil {
		return err
	}
	t, err := s.loadTrade(c, id, loc)
	if err != nil {
		return err
	}
	return c.JSON(t)
}

func (s *Server) updateTrade(c *fiber.Ctx) error {
	id, err := pathID(c, "trade")
	if err != nil {
		return err
	}
	var in tradeInput
	if err := readBody(c, &in); err != nil {
		return err
	}
	loc, err := s.journalLocation(c.Context())
	if err != nil {
		return err
	}
	existing, err := s.loadTrade(c, id, loc)
	if err != nil {
		return err
	}
	// an existing trade of an archived account stays editable; only a move to another account needs an active one
	f, err := s.validateTrade(c, in, loc, in.AccountID != existing.AccountID)
	if err != nil {
		return err
	}
	_, err = s.q.UpdateTrade(c.Context(), store.UpdateTradeParams{
		ID: id, AccountID: f.accountID, Instrument: f.instrument, Direction: f.direction, Size: f.size,
		EntryPrice: f.entryPrice, ExitPrice: f.exitPrice, EntryAt: f.entryAt, ExitAt: f.exitAt,
		DollarsPerPoint: f.dollarsPerPoint, Cost: f.cost, StopPrice: f.stopPrice,
		TypedResult: f.typedResult, Thesis: f.thesis, ExpectedUpdatedAt: in.ExpectedUpdatedAt,
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return conflict("trade")
	}
	if err != nil {
		return err
	}
	t, err := s.loadTrade(c, id, loc)
	if err != nil {
		return err
	}
	return c.JSON(t)
}

func (s *Server) deleteTrade(c *fiber.Ctx) error { return s.setDeleted(c, true) }
func (s *Server) restoreTrade(c *fiber.Ctx) error { return s.setDeleted(c, false) }

func (s *Server) setDeleted(c *fiber.Ctx, del bool) error {
	id, err := pathID(c, "trade")
	if err != nil {
		return err
	}
	if del {
		_, err = s.q.SoftDeleteTrade(c.Context(), id)
	} else {
		_, err = s.q.RestoreTrade(c.Context(), id)
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return notFound("trade")
	}
	if err != nil {
		return err
	}
	loc, err := s.journalLocation(c.Context())
	if err != nil {
		return err
	}
	t, err := s.loadTrade(c, id, loc)
	if err != nil {
		return err
	}
	return c.JSON(t)
}

func (s *Server) listTrades(c *fiber.Ctx) error {
	p := store.ListTradesParams{Deleted: c.QueryBool("deleted", false)}
	var fe []fieldError
	if v := c.Query("accountId"); v != "" {
		if !uuidText.MatchString(v) {
			fe = append(fe, fieldError{"accountId", "Choose an account."})
		} else {
			p.AccountID = &v
		}
	}
	day := func(field, label string) *time.Time {
		v := c.Query(field)
		if v == "" {
			return nil
		}
		t, err := time.Parse("2006-01-02", v)
		if err != nil {
			fe = append(fe, fieldError{field, label + " must be a date like 2025-10-01."})
			return nil
		}
		return &t
	}
	p.FromDay, p.ToDay = day("from", "From"), day("to", "To")
	if p.FromDay != nil && p.ToDay != nil && p.FromDay.After(*p.ToDay) {
		fe = append(fe, fieldError{"to", "To must not be earlier than From."})
	}
	if len(fe) > 0 {
		return invalid("filter", fe)
	}
	rows, err := s.q.ListTrades(c.Context(), p)
	if err != nil {
		return err
	}
	loc, err := s.journalLocation(c.Context())
	if err != nil {
		return err
	}
	out := make([]tradeJSON, 0, len(rows))
	for _, r := range rows {
		out = append(out, toTrade(r, loc))
	}
	return c.JSON(out)
}
