package api

import (
	"errors"
	"slices"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"tradecraft/internal/store"
)

type judgementJSON struct {
	TradeID      string   `json:"tradeId"`
	PlanFollowed *string  `json:"planFollowed"`
	Label        *string  `json:"label"`
	MistakeIDs   []string `json:"mistakeIds"`
	UpdatedAt    *string  `json:"updatedAt"`
	IsLoss       bool     `json:"isLoss"`
	IsWin        bool     `json:"isWin"`
	ValidLoss    struct {
		Available bool    `json:"available"`
		Reason    *string `json:"reason"`
	} `json:"validLoss"`
	Trade dayTradeJSON `json:"trade"`
}

// validLossReason says why "valid loss" cannot be chosen for a trade with this plan answer, or "" when it can.
func validLossReason(isLoss bool, plan *string) string {
	switch {
	case !isLoss:
		return msgNotALoss
	case plan == nil || *plan != "yes":
		return msgPlanNotFollowed
	}
	return ""
}

func fromDayTradeRow(r store.GetDayTradeRow) store.DayTradesRow {
	return store.DayTradesRow{
		ID: r.ID, Instrument: r.Instrument, Direction: r.Direction, Size: r.Size, EntryAt: r.EntryAt, ExitAt: r.ExitAt,
		Currency: r.Currency, NetResult: r.NetResult, Risk: r.Risk, RMultiple: r.RMultiple, StopPrice: r.StopPrice,
		DollarsPerPoint: r.DollarsPerPoint, Thesis: r.Thesis, PlanFollowed: r.PlanFollowed, Label: r.Label, Mistakes: r.Mistakes,
	}
}

// loadJudgement assembles the judgement of a live trade (404 for an unknown or deleted trade).
func (s *Server) loadJudgement(c *fiber.Ctx, q *store.Queries, id string) (judgementJSON, error) {
	ctx := c.Context()
	var out judgementJSON
	loc, err := s.journalLocation(ctx)
	if err != nil {
		return out, err
	}
	row, err := q.GetDayTrade(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return out, notFound("trade")
	}
	if err != nil {
		return out, err
	}
	out.TradeID, out.PlanFollowed, out.Label = row.ID, row.PlanFollowed, row.Label
	out.IsLoss, out.IsWin = row.IsLoss, row.IsWin
	out.Trade = toDayTrade(fromDayTradeRow(row), loc)
	if reason := validLossReason(row.IsLoss, row.PlanFollowed); reason != "" {
		out.ValidLoss.Reason = &reason
	} else {
		out.ValidLoss.Available = true
	}
	j, err := q.GetJudgement(ctx, id)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
	case err != nil:
		return out, err
	default:
		u := fmtTime(j.UpdatedAt)
		out.UpdatedAt = &u
	}
	ids, err := q.JudgementTagIDs(ctx, id)
	if err != nil {
		return out, err
	}
	out.MistakeIDs = ids
	if out.MistakeIDs == nil {
		out.MistakeIDs = []string{}
	}
	return out, nil
}

func (s *Server) getJudgement(c *fiber.Ctx) error {
	id, err := pathID(c, "trade")
	if err != nil {
		return err
	}
	out, err := s.loadJudgement(c, s.q, id)
	if err != nil {
		return err
	}
	return c.JSON(out)
}

type judgementInput struct {
	PlanFollowed      *string    `json:"planFollowed"`
	Label             *string    `json:"label"`
	MistakeIDs        []string   `json:"mistakeIds"`
	ExpectedUpdatedAt *time.Time `json:"expectedUpdatedAt"`
}

// saveJudgement replaces a trade's plan answer, label and mistake tags. The rules (valid loss only for a loss with a
// plan answer of yes) are held by the database as well; this gives the plain messages.
func (s *Server) saveJudgement(c *fiber.Ctx) error {
	ctx := c.Context()
	id, err := pathID(c, "trade")
	if err != nil {
		return err
	}
	var in judgementInput
	if err := readBody(c, &in); err != nil {
		return err
	}
	row, err := s.q.GetDayTrade(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return notFound("trade")
	}
	if err != nil {
		return err
	}
	var fe []fieldError
	if in.PlanFollowed != nil && !slices.Contains([]string{"yes", "partly", "no"}, *in.PlanFollowed) {
		fe = append(fe, fieldError{"planFollowed", "Choose Yes, Partly or No."})
	}
	if in.Label != nil && !slices.Contains([]string{"valid_loss", "mistake"}, *in.Label) {
		fe = append(fe, fieldError{"label", "Choose Valid loss or Mistake."})
	}
	if len(fe) == 0 && in.Label != nil && *in.Label == "valid_loss" {
		if reason := validLossReason(row.IsLoss, in.PlanFollowed); reason != "" {
			fe = append(fe, fieldError{"label", reason})
		}
	}
	// a mistake can be tagged when it is in use, or when the trade already carries it (a retired one stays)
	current, err := s.q.JudgementTagIDs(ctx, id)
	if err != nil {
		return err
	}
	var fresh []string
	for _, m := range in.MistakeIDs {
		if !uuidText.MatchString(m) {
			fe = append(fe, fieldError{"mistakeIds", "Choose mistakes from the list."})
			break
		}
		if !slices.Contains(current, m) {
			fresh = append(fresh, m)
		}
	}
	if len(fe) == 0 && len(fresh) > 0 {
		n, err := s.q.CountUsableMistakes(ctx, fresh)
		if err != nil {
			return err
		}
		if int(n) != len(slices.Compact(slices.Sorted(slices.Values(fresh)))) {
			fe = append(fe, fieldError{"mistakeIds", "Choose mistakes from the list."})
		}
	}
	if len(fe) > 0 {
		return invalid("judgement", fe)
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // a no-op after commit
	q := s.q.WithTx(tx)
	_, err = q.SaveJudgement(ctx, store.SaveJudgementParams{TradeID: id, PlanFollowed: in.PlanFollowed, Label: in.Label, ExpectedUpdatedAt: in.ExpectedUpdatedAt})
	if errors.Is(err, pgx.ErrNoRows) {
		return conflict("judgement")
	}
	if err != nil {
		return err
	}
	if err := q.ClearTradeTags(ctx, id); err != nil {
		return err
	}
	for _, m := range slices.Compact(slices.Sorted(slices.Values(in.MistakeIDs))) {
		if err := q.AddTradeTag(ctx, store.AddTradeTagParams{TradeID: id, MistakeID: m}); err != nil {
			return err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	out, err := s.loadJudgement(c, s.q, id)
	if err != nil {
		return err
	}
	return c.JSON(out)
}
