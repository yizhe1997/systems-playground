package api

import (
	"slices"
	"time"

	"github.com/gofiber/fiber/v2"

	"tradecraft/internal/store"
)

type weeklyDayJSON struct {
	Date           string            `json:"date"`
	Status         string            `json:"status"`
	Trades         int               `json:"trades"`
	NetResult      *string           `json:"netResult"`
	PlanFollowed   planFollowedJSON  `json:"planFollowed"`
	Answers        *dailyAnswersJSON `json:"answers"`
	MentalGrade    *int              `json:"mentalGrade"`
	TechnicalGrade *int              `json:"technicalGrade"`
}

type dailyAnswersJSON struct {
	DidWell      string `json:"didWell"`
	CouldImprove string `json:"couldImprove"`
	NextFocus    string `json:"nextFocus"`
}

type weeklyJSON struct {
	AccountID    string  `json:"accountId"`
	AccountName  string  `json:"accountName"`
	Currency     string  `json:"currency"`
	Today        string  `json:"today"`
	WeekStart    string  `json:"weekStart"`
	WeekEnd      string  `json:"weekEnd"`
	State        string  `json:"state"`
	ReviewedAt   *string `json:"reviewedAt"`
	PreviousWeek string  `json:"previousWeek"`
	NextWeek     string  `json:"nextWeek"`
	Focus        struct {
		Week  focusJSON `json:"week"`
		Month focusJSON `json:"month"`
	} `json:"focus"`
	Days  []weeklyDayJSON `json:"days"`
	Stats statsJSON       `json:"stats"`
}

// loadWeek reads the week of an account that holds a day: its seven days as they are, the figures of the whole week
// (from the same SQL functions as a day, so they are the sum of the days), and the focus. Nothing here is stored.
func (s *Server) loadWeek(c *fiber.Ctx, acct store.GetAccountRow, day time.Time) (weeklyJSON, error) {
	ctx := c.Context()
	var out weeklyJSON
	b, err := s.q.Bounds(ctx, day)
	if err != nil {
		return out, err
	}
	today, err := s.q.AccountToday(ctx, acct.ID)
	if err != nil {
		return out, err
	}
	ws, we := b.WeekStart, b.WeekEnd
	out.AccountID, out.AccountName, out.Currency, out.Today = acct.ID, acct.Name, acct.Currency, dayText(today)
	out.WeekStart, out.WeekEnd = dayText(ws), dayText(we)
	out.PreviousWeek, out.NextWeek = dayText(plusDays(ws, -7)), dayText(plusDays(ws, 7))
	if out.State, err = s.q.WeekState(ctx, store.WeekStateParams{AccountID: acct.ID, WeekStart: ws}); err != nil {
		return out, err
	}
	if out.ReviewedAt, err = s.weekMark(c, acct.ID, ws); err != nil {
		return out, err
	}
	if out.Focus.Week, err = s.focusFor(ctx, "week", ws, we); err != nil {
		return out, err
	}
	// the month of the week's Sunday, the one the week is listed under
	mb, err := s.q.Bounds(ctx, we)
	if err != nil {
		return out, err
	}
	if out.Focus.Month, err = s.focusFor(ctx, "month", mb.MonthStart, mb.MonthEnd); err != nil {
		return out, err
	}
	if out.Stats, err = s.buildStats(ctx, acct.ID, acct.Currency, ws, we); err != nil {
		return out, err
	}
	listed, err := s.q.ListDays(ctx, acct.ID, ws, we)
	if err != nil {
		return out, err
	}
	reviews, err := s.q.ReviewsInRange(ctx, store.ReviewsInRangeParams{AccountID: acct.ID, FromDay: ws, ToDay: we})
	if err != nil {
		return out, err
	}
	out.Days = make([]weeklyDayJSON, 0, 7)
	for d := ws; !d.After(we); d = plusDays(d, 1) {
		row := weeklyDayJSON{Date: dayText(d)}
		i := slices.IndexFunc(listed, func(x store.ListedDay) bool { return x.Day.Equal(d) })
		var state string
		if i >= 0 {
			row.Trades, row.NetResult, row.PlanFollowed = int(listed[i].Stats.Trades), outDecimalPtr(listed[i].Stats.NetResult), plan(listed[i].Stats)
			state = listed[i].State
		}
		switch {
		case d.After(today):
			row.Status = "not_yet"
		case state != "":
			row.Status = state
		default:
			row.Status = "no_trades"
		}
		if j := slices.IndexFunc(reviews, func(r store.ReviewsInRangeRow) bool { return r.TradingDay.Equal(d) }); j >= 0 {
			r := reviews[j]
			row.Answers = &dailyAnswersJSON{DidWell: r.DidWell, CouldImprove: r.CouldImprove, NextFocus: r.NextFocus}
			row.MentalGrade, row.TechnicalGrade = intPtr(r.MentalGrade), intPtr(r.TechnicalGrade)
		}
		out.Days = append(out.Days, row)
	}
	return out, nil
}

func (s *Server) getWeekly(c *fiber.Ctx) error {
	acct, err := s.accountFor(c, c.Query("accountId"))
	if err != nil {
		return err
	}
	day, ok := parseDay(c.Query("date"))
	if !ok {
		return invalid("weekly review", []fieldError{{"date", "Choose a date like 2025-10-01."}})
	}
	out, err := s.loadWeek(c, acct, day)
	if err != nil {
		return err
	}
	return c.JSON(out)
}

type weekMarkInput struct {
	AccountID string `json:"accountId"`
	Date      string `json:"date"`
}

// markWeek is the only thing a weekly review stores: that it was marked, and when. There is no way to remove it.
func (s *Server) markWeek(c *fiber.Ctx) error {
	ctx := c.Context()
	var in weekMarkInput
	if err := readBody(c, &in); err != nil {
		return err
	}
	acct, err := s.accountFor(c, in.AccountID)
	if err != nil {
		return err
	}
	day, ok := parseDay(in.Date)
	if !ok {
		return invalid("weekly review", []fieldError{{"date", "Choose a date like 2025-10-01."}})
	}
	b, err := s.q.Bounds(ctx, day)
	if err != nil {
		return err
	}
	today, err := s.q.AccountToday(ctx, acct.ID)
	if err != nil {
		return err
	}
	if b.WeekStart.After(today) {
		return invalid("weekly review", []fieldError{{"date", msgWeekNotYet}})
	}
	if err := s.q.MarkWeek(ctx, store.MarkWeekParams{AccountID: acct.ID, WeekStart: b.WeekStart}); err != nil {
		return err
	}
	out, err := s.loadWeek(c, acct, day)
	if err != nil {
		return err
	}
	return c.JSON(out)
}
