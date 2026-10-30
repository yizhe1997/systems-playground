package api

import (
	"github.com/gofiber/fiber/v2"

	"tradecraft/internal/store"
)

// Feature 005: Home's "needs you" panel. A read-only route that lists what is waiting for the owner in a scope, from the
// same day and week states as the Reviews screens (day_state and week_state), so the two never disagree.

const needsYouCap = 20

type needsDayJSON struct {
	AccountID   string `json:"accountId"`
	AccountName string `json:"accountName"`
	Day         string `json:"day"`
	Trades      int    `json:"trades"`
}

type needsTradeJSON struct {
	TradeID     string `json:"tradeId"`
	AccountID   string `json:"accountId"`
	AccountName string `json:"accountName"`
	Instrument  string `json:"instrument"`
	Direction   string `json:"direction"`
	EntryAt     string `json:"entryAt"`
	TradingDay  string `json:"tradingDay"`
}

type needsWeekJSON struct {
	AccountID   string `json:"accountId"`
	AccountName string `json:"accountName"`
	WeekStart   string `json:"weekStart"`
	WeekEnd     string `json:"weekEnd"`
}

type needsYouJSON struct {
	MissingDays struct {
		Total int            `json:"total"`
		Items []needsDayJSON `json:"items"`
	} `json:"missingDays"`
	NotJudged struct {
		Total int              `json:"total"`
		Items []needsTradeJSON `json:"items"`
	} `json:"notJudged"`
	MissingWeeks struct {
		Total int             `json:"total"`
		Items []needsWeekJSON `json:"items"`
	} `json:"missingWeeks"`
}

func (s *Server) getNeedsYou(c *fiber.Ctx) error {
	sc, fe, err := s.parseScope(c)
	if err != nil {
		return err
	}
	if len(fe) > 0 {
		return invalid("filter", fe)
	}
	ctx := c.Context()
	loc, err := s.journalLocation(ctx)
	if err != nil {
		return err
	}
	var out needsYouJSON
	out.MissingDays.Items, out.NotJudged.Items, out.MissingWeeks.Items = []needsDayJSON{}, []needsTradeJSON{}, []needsWeekJSON{}

	days, err := s.q.NeedsYouMissingDays(ctx, store.NeedsYouMissingDaysParams{FromDay: sc.from, ToDay: sc.to, AccountID: sc.accountID, MaxRows: needsYouCap})
	if err != nil {
		return err
	}
	for _, d := range days {
		out.MissingDays.Total = int(d.Total)
		out.MissingDays.Items = append(out.MissingDays.Items, needsDayJSON{AccountID: d.AccountID, AccountName: d.AccountName, Day: dayText(d.TradingDay), Trades: int(d.Trades)})
	}
	trades, err := s.q.NeedsYouNotJudged(ctx, store.NeedsYouNotJudgedParams{FromDay: sc.from, ToDay: sc.to, AccountID: sc.accountID, MaxRows: needsYouCap})
	if err != nil {
		return err
	}
	for _, t := range trades {
		out.NotJudged.Total = int(t.Total)
		out.NotJudged.Items = append(out.NotJudged.Items, needsTradeJSON{TradeID: t.TradeID, AccountID: t.AccountID, AccountName: t.AccountName,
			Instrument: t.Instrument, Direction: t.Direction, EntryAt: t.EntryAt.In(loc).Format("2006-01-02T15:04:05-07:00"), TradingDay: dayText(t.TradingDay)})
	}
	weeks, err := s.q.NeedsYouMissingWeeks(ctx, store.NeedsYouMissingWeeksParams{FromDay: sc.from, ToDay: sc.to, AccountID: sc.accountID, MaxRows: needsYouCap})
	if err != nil {
		return err
	}
	for _, w := range weeks {
		out.MissingWeeks.Total = int(w.Total)
		out.MissingWeeks.Items = append(out.MissingWeeks.Items, needsWeekJSON{AccountID: w.AccountID, AccountName: w.AccountName, WeekStart: dayText(w.WeekStart), WeekEnd: dayText(plusDays(w.WeekStart, 6))})
	}
	return c.JSON(out)
}
