package api

import (
	"errors"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"tradecraft/internal/store"
)

type dayRowJSON struct {
	Date         string           `json:"date"`
	State        *string          `json:"state"`
	Trades       int              `json:"trades"`
	NetResult    *string          `json:"netResult"`
	Currency     string           `json:"currency"`
	PlanFollowed planFollowedJSON `json:"planFollowed"`
	Mistakes     int              `json:"mistakes"`
}

type weekBlockJSON struct {
	WeekStart  string  `json:"weekStart"`
	WeekEnd    string  `json:"weekEnd"`
	Current    bool    `json:"current"`
	State      string  `json:"state"`
	ReviewedAt *string `json:"reviewedAt"`
	Summary    struct {
		DaysWithTrades int `json:"daysWithTrades"`
		Reviewed       int `json:"reviewed"`
		Draft          int `json:"draft"`
		Missing        int `json:"missing"`
	} `json:"summary"`
	Days []dayRowJSON `json:"days"`
}

type reviewsMonthJSON struct {
	AccountID     string    `json:"accountId"`
	AccountName   string    `json:"accountName"`
	Month         string    `json:"month"`
	Today         string    `json:"today"`
	PreviousMonth string    `json:"previousMonth"`
	NextMonth     string    `json:"nextMonth"`
	MonthFocus    focusJSON `json:"monthFocus"`
	Filters       struct {
		Missing  int `json:"missing"`
		Draft    int `json:"draft"`
		Reviewed int `json:"reviewed"`
	} `json:"filters"`
	Weeks []weekBlockJSON `json:"weeks"`
}

func stateText(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// weekMark is when a week was marked reviewed, if it was.
func (s *Server) weekMark(c *fiber.Ctx, accountID string, weekStart time.Time) (*string, error) {
	t, err := s.q.WeekMark(c.Context(), store.WeekMarkParams{AccountID: accountID, WeekStart: weekStart})
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return timePtr(&t), nil
}

// listReviews is screen S0: one month of an account, as weeks that end in the month, newest first.
func (s *Server) listReviews(c *fiber.Ctx) error {
	ctx := c.Context()
	acct, err := s.accountFor(c, c.Query("accountId"))
	if err != nil {
		return err
	}
	today, err := s.q.AccountToday(ctx, acct.ID)
	if err != nil {
		return err
	}
	anchor := today
	if m := c.Query("month"); m != "" {
		t, ok := parseMonth(m)
		if !ok {
			return invalid("filter", []fieldError{{"month", "Choose a month like 2025-10."}})
		}
		anchor = t
	}
	mb, err := s.q.Bounds(ctx, anchor)
	if err != nil {
		return err
	}
	out := reviewsMonthJSON{
		AccountID: acct.ID, AccountName: acct.Name, Month: monthOf(mb.MonthStart), Today: dayText(today),
		PreviousMonth: monthOf(mb.MonthStart.AddDate(0, -1, 0)), NextMonth: monthOf(mb.MonthStart.AddDate(0, 1, 0)), Weeks: []weekBlockJSON{},
	}
	if out.MonthFocus, err = s.focusFor(ctx, "month", mb.MonthStart, mb.MonthEnd); err != nil {
		return err
	}
	starts, err := s.q.WeeksEndingIn(ctx, store.WeeksEndingInParams{MonthStart: mb.MonthStart, MonthEnd: mb.MonthEnd})
	if err != nil {
		return err
	}
	if len(starts) == 0 {
		return c.JSON(out)
	}
	// starts are newest first: one read for the whole range, then each week takes its own days
	newest, oldest := starts[0], starts[len(starts)-1]
	days, err := s.q.ListDays(ctx, acct.ID, oldest, plusDays(newest, 6))
	if err != nil {
		return err
	}
	for _, ws := range starts {
		we := plusDays(ws, 6)
		st, err := s.q.WeekState(ctx, store.WeekStateParams{AccountID: acct.ID, WeekStart: ws})
		if err != nil {
			return err
		}
		mark, err := s.weekMark(c, acct.ID, ws)
		if err != nil {
			return err
		}
		w := weekBlockJSON{WeekStart: dayText(ws), WeekEnd: dayText(we), Current: !today.Before(ws) && !today.After(we), State: st, ReviewedAt: mark, Days: []dayRowJSON{}}
		for _, d := range days {
			if d.Day.Before(ws) || d.Day.After(we) {
				continue
			}
			w.Days = append(w.Days, dayRowJSON{
				Date: dayText(d.Day), State: stateText(d.State), Trades: int(d.Stats.Trades), NetResult: outDecimalPtr(d.Stats.NetResult),
				Currency: acct.Currency, PlanFollowed: plan(d.Stats), Mistakes: int(d.Stats.MistakeTags),
			})
			if d.Stats.Trades > 0 {
				w.Summary.DaysWithTrades++
			}
			switch d.State {
			case "reviewed":
				w.Summary.Reviewed++
				out.Filters.Reviewed++
			case "draft":
				w.Summary.Draft++
				out.Filters.Draft++
			case "missing":
				w.Summary.Missing++
				out.Filters.Missing++
			}
		}
		out.Weeks = append(out.Weeks, w)
	}
	return c.JSON(out)
}
