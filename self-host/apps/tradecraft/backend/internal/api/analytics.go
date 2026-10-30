package api

import (
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/shopspring/decimal"

	"tradecraft/internal/analytics"
	"tradecraft/internal/store"
)

// Feature 005: Home and Analytics. A read-only route: it creates, changes and deletes nothing, writes no audit entry
// and adds nothing to the export. The figures are made by internal/analytics from the rows of one query.

type analyticsJSON struct {
	From         string            `json:"from"`
	To           string            `json:"to"`
	AccountID    *string           `json:"accountId"`
	Band         string            `json:"band"`
	TimeZone     string            `json:"timeZone"`
	Blocks       []analytics.Block `json:"blocks"`
	OtherPeriods int               `json:"otherPeriods"`
}

// scope is the period and the accounts of a request, read and checked once.
type scope struct {
	from, to  time.Time
	accountID *string
}

const maxRangeYears = 20

// parseScope reads from, to and accountId. A bad value is a 422 naming the field; an account that does not exist is 404.
func (s *Server) parseScope(c *fiber.Ctx) (scope, []fieldError, error) {
	var sc scope
	var fe []fieldError
	day := func(field, label string) time.Time {
		v := c.Query(field)
		if v == "" {
			fe = append(fe, fieldError{field, label + " is required, a date like 2026-10-01."})
			return time.Time{}
		}
		t, ok := parseDay(v)
		if !ok {
			fe = append(fe, fieldError{field, label + " must be a date like 2026-10-01."})
			return time.Time{}
		}
		return t
	}
	sc.from, sc.to = day("from", "From"), day("to", "To")
	if !sc.from.IsZero() && !sc.to.IsZero() {
		if sc.to.Before(sc.from) {
			fe = append(fe, fieldError{"to", "The end is before the start. Choose an end on or after " + dayText(sc.from) + "."})
		} else if sc.to.After(sc.from.AddDate(maxRangeYears, 0, 0)) {
			fe = append(fe, fieldError{"to", "Choose a period of at most 20 years."})
		}
	}
	if v := c.Query("accountId"); v != "" {
		if !uuidText.MatchString(v) {
			fe = append(fe, fieldError{"accountId", "Choose an account."})
		} else {
			sc.accountID = &v
		}
	}
	if len(fe) > 0 {
		return sc, fe, nil
	}
	if sc.accountID != nil {
		if _, err := s.accountFor(c, *sc.accountID); err != nil {
			return sc, nil, err
		}
	}
	return sc, nil, nil
}

// analyticsRows reads the trades of a scope as analytics rows (trading-day, entry-time, id order).
func (s *Server) analyticsRows(c *fiber.Ctx, sc scope) ([]analytics.Row, error) {
	rows, err := s.q.AnalyticsRows(c.Context(), store.AnalyticsRowsParams{FromDay: sc.from, ToDay: sc.to, AccountID: sc.accountID})
	if err != nil {
		return nil, err
	}
	out := make([]analytics.Row, 0, len(rows))
	for _, r := range rows {
		row := analytics.Row{
			TradeID: r.TradeID, AccountID: r.AccountID, AccountName: r.AccountName, Currency: r.Currency,
			AccountArchived: r.AccountArchived, AccountKind: r.AccountKind, Day: r.TradingDay, EntryAt: r.EntryAt,
			Hour: int(r.EntryHour), Weekday: int(r.Weekday), Instrument: r.Instrument, Direction: r.Direction,
			MistakeIDs: r.MistakeIds, MistakeNames: r.MistakeNames,
		}
		// a trade always has a net result (the database requires dollars per point or a typed result)
		if r.NetResult != nil {
			row.Net = decimal.RequireFromString(*r.NetResult)
		}
		if r.RMultiple != nil {
			v := decimal.RequireFromString(*r.RMultiple)
			row.R = &v
		}
		if r.PlanFollowed != nil {
			row.Plan = *r.PlanFollowed
		}
		out = append(out, row)
	}
	return out, nil
}

// getAnalytics answers every figure of Home and Analytics for a period and an account scope, one block per currency.
func (s *Server) getAnalytics(c *fiber.Ctx) error {
	sc, fe, err := s.parseScope(c)
	if err != nil {
		return err
	}
	band, msg := analytics.ParseBand(c.Query("band"))
	if msg != "" {
		fe = append(fe, fieldError{"band", msg})
	}
	if len(fe) > 0 {
		return invalid("filter", fe)
	}
	ctx := c.Context()
	rows, err := s.analyticsRows(c, sc)
	if err != nil {
		return err
	}
	day, err := s.q.AnalyticsDayRecords(ctx, store.AnalyticsDayRecordsParams{FromDay: sc.from, ToDay: sc.to, AccountID: sc.accountID})
	if err != nil {
		return err
	}
	dayRecords := map[string]map[string]int{}
	for _, d := range day {
		if dayRecords[d.AccountID] == nil {
			dayRecords[d.AccountID] = map[string]int{}
		}
		dayRecords[d.AccountID][d.MistakeID] = int(d.Records)
	}
	loc, err := s.journalLocation(ctx)
	if err != nil {
		return err
	}
	out := analyticsJSON{From: dayText(sc.from), To: dayText(sc.to), AccountID: sc.accountID, Band: band.String(), TimeZone: loc.String(),
		Blocks: analytics.BuildBlocks(rows, analytics.Params{Band: band}, dayRecords)}
	if len(rows) == 0 {
		// an empty period or an empty journal: tell them apart (Home's empty states)
		n, err := s.q.ScopeTradeCount(ctx, sc.accountID)
		if err != nil {
			return err
		}
		out.OtherPeriods = int(n)
	}
	return c.JSON(out)
}
