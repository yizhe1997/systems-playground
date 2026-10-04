package api

import (
	"sort"

	"github.com/gofiber/fiber/v2"

	"tradecraft/internal/store"
)

// reviewsCalendar answers what the day picker, the week picker and the month list mark and offer.
func (s *Server) reviewsCalendar(c *fiber.Ctx) error {
	ctx := c.Context()
	acct, err := s.accountFor(c, c.Query("accountId"))
	if err != nil {
		return err
	}
	first, ok := parseMonth(c.Query("month"))
	if !ok {
		return invalid("filter", []fieldError{{"month", "Choose a month like 2025-10."}})
	}
	b, err := s.q.Bounds(ctx, first)
	if err != nil {
		return err
	}
	type dayMark struct {
		Date      string `json:"date"`
		HasTrades bool   `json:"hasTrades"`
		Missing   bool   `json:"missing"`
	}
	type weekMarkJSON struct {
		WeekStart string `json:"weekStart"`
		State     string `json:"state"`
	}
	out := struct {
		Month  string         `json:"month"`
		Days   []dayMark      `json:"days"`
		Weeks  []weekMarkJSON `json:"weeks"`
		Months []string       `json:"months"`
	}{Month: monthOf(b.MonthStart), Days: []dayMark{}, Weeks: []weekMarkJSON{}, Months: []string{}}

	days, err := s.q.CalendarDays(ctx, store.CalendarDaysParams{AccountID: acct.ID, FromDay: b.MonthStart, ToDay: b.MonthEnd})
	if err != nil {
		return err
	}
	for _, d := range days {
		out.Days = append(out.Days, dayMark{Date: dayText(d.Day), HasTrades: true, Missing: d.Missing})
	}
	// every week that overlaps the month, from the one the 1st falls in
	wb, err := s.q.Bounds(ctx, b.MonthStart)
	if err != nil {
		return err
	}
	for ws := wb.WeekStart; !ws.After(b.MonthEnd); ws = plusDays(ws, 7) {
		st, err := s.q.WeekState(ctx, store.WeekStateParams{AccountID: acct.ID, WeekStart: ws})
		if err != nil {
			return err
		}
		out.Weeks = append(out.Weeks, weekMarkJSON{WeekStart: dayText(ws), State: st})
	}
	// the month list: months with trades or reviews, plus the account's current month, newest first
	months, err := s.q.MonthsWithActivity(ctx, acct.ID)
	if err != nil {
		return err
	}
	today, err := s.q.AccountToday(ctx, acct.ID)
	if err != nil {
		return err
	}
	seen := map[string]bool{}
	for _, m := range append(months, monthOf(today)) {
		if !seen[m] {
			seen[m] = true
			out.Months = append(out.Months, m)
		}
	}
	sort.Sort(sort.Reverse(sort.StringSlice(out.Months)))
	return c.JSON(out)
}
