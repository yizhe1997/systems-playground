package tests

import (
	"testing"
)

func scalar(t *testing.T, query string, args ...any) string {
	t.Helper()
	var s *string
	if err := pool.QueryRow(contextBG(), "SELECT ("+query+")::text", args...).Scan(&s); err != nil {
		t.Fatalf("%s: %v", query, err)
	}
	if s == nil {
		return ""
	}
	return *s
}

func dayState(t *testing.T, acct, day string) string {
	return scalar(t, "day_state($1::uuid, $2::date)", acct, day)
}

func weekState(t *testing.T, acct, monday string) string {
	return scalar(t, "week_state($1::uuid, $2::date)", acct, monday)
}

// insertAt puts a live trade on the account straight into the database at an exit instant (the database clock decides
// what today is, so these tests place trades relative to now()).
func insertTradeAt(t *testing.T, acct, exitExpr string) {
	t.Helper()
	exec(t, `INSERT INTO trade (account_id, instrument, direction, size, entry_price, exit_price, entry_at, exit_at, dollars_per_point, cost)
	         VALUES ($1, 'NQ', 'long', 1, 100, 101, `+exitExpr+` - interval '30 minutes', `+exitExpr+`, 20, 0)`, acct)
}

func TestDayStatesFollowTheRules(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "")
	today := scalar(t, "account_today($1::uuid)", acct)
	if today == "" {
		t.Fatal("no today")
	}
	// no trades and no review: no state
	if got := dayState(t, acct, "2025-10-01"); got != "" {
		t.Errorf("empty day: %q", got)
	}
	// a past day with a live trade and no review is Missing
	s := sampleDay(t)
	if got := dayState(t, s.acct, "2025-10-01"); got != "missing" {
		t.Errorf("past day with trades: %q, want missing", got)
	}
	// saving anything makes it a Draft, reviewing makes it Reviewed
	exec(t, `INSERT INTO daily_review (account_id, trading_day) VALUES ($1, '2025-10-01')`, s.acct)
	if got := dayState(t, s.acct, "2025-10-01"); got != "draft" {
		t.Errorf("saved: %q, want draft", got)
	}
	exec(t, `UPDATE daily_review SET reviewed_at = now() WHERE account_id = $1`, s.acct)
	if got := dayState(t, s.acct, "2025-10-01"); got != "reviewed" {
		t.Errorf("reviewed: %q", got)
	}
	// a saved review on a day with no trades keeps its state
	exec(t, `INSERT INTO daily_review (account_id, trading_day) VALUES ($1, '2025-10-02')`, s.acct)
	if got := dayState(t, s.acct, "2025-10-02"); got != "draft" {
		t.Errorf("review on an empty day: %q, want draft", got)
	}
	// today: a live trade and nothing saved is "today", never Missing
	insertTradeAt(t, acct, "now() - interval '1 minute'")
	if got := dayState(t, acct, today); got != "today" {
		t.Errorf("today with trades: %q, want today", got)
	}
	// once it has been saved it is a draft like any other day
	exec(t, `INSERT INTO daily_review (account_id, trading_day) VALUES ($1, $2::date)`, acct, today)
	if got := dayState(t, acct, today); got != "draft" {
		t.Errorf("today saved: %q, want draft", got)
	}
}

func TestDeletedTradesDoNotMakeADayMissing(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "")
	id := trade(t, sampleTrade(acct, "2025-10-01T09:00", "2025-10-01T09:30", "100", "101")).str("id")
	if got := dayState(t, acct, "2025-10-01"); got != "missing" {
		t.Fatalf("before delete: %q", got)
	}
	mustStatus(t, call(t, "DELETE", "/trades/"+id, nil), 200)
	if got := dayState(t, acct, "2025-10-01"); got != "" {
		t.Errorf("after delete: %q, want no state", got)
	}
}

// "Today" belongs to the account: the trading day of the current moment, which for an evening start is tomorrow at 17:30.
func TestTodayFollowsTheAccountsTradingDay(t *testing.T) {
	reset(t)
	acct := account(t, "Funded 50K", "USD", "17:00")
	want := scalar(t, `trading_day(now(), 'America/Chicago', '17:00'::time)`)
	if got := scalar(t, "account_today($1::uuid)", acct); got != want {
		t.Errorf("account_today = %s, want %s", got, want)
	}
	// the rule itself at the boundary, in the worked example of the domain document
	if got := scalar(t, `trading_day('2025-10-07 17:30-05'::timestamptz, 'America/Chicago', '17:00'::time)`); got != "2025-10-08" {
		t.Errorf("17:30 exit: %s", got)
	}
	// and the zone follows the journal setting
	mustStatus(t, call(t, "PUT", "/settings", map[string]any{"timeZone": "Asia/Tokyo"}), 200)
	want = scalar(t, `trading_day(now(), 'Asia/Tokyo', '17:00'::time)`)
	if got := scalar(t, "account_today($1::uuid)", acct); got != want {
		t.Errorf("after the zone change: %s, want %s", got, want)
	}
}

func TestWeekStates(t *testing.T) {
	reset(t)
	s := sampleDay(t) // trades on Wed 1 Oct 2025, in the week of Mon 29 Sep
	if got := weekState(t, s.acct, "2025-09-29"); got != "missing" {
		t.Errorf("a past week with trades and no mark: %q, want missing", got)
	}
	if got := weekState(t, s.acct, "2025-10-06"); got != "not_reviewed" {
		t.Errorf("a past week with no trades: %q, want not_reviewed", got)
	}
	exec(t, `INSERT INTO weekly_review_mark (account_id, week_start) VALUES ($1, '2025-09-29')`, s.acct)
	if got := weekState(t, s.acct, "2025-09-29"); got != "reviewed" {
		t.Errorf("marked: %q", got)
	}
	// the current week is never missing, even with trades
	cur := scalar(t, "week_start(account_today($1::uuid))", s.acct)
	insertTradeAt(t, s.acct, "now() - interval '1 minute'")
	if got := weekState(t, s.acct, cur); got != "not_reviewed" {
		t.Errorf("the current week: %q, want not_reviewed", got)
	}
	// a week mark is only ever a Monday
	if _, err := pool.Exec(contextBG(), `INSERT INTO weekly_review_mark (account_id, week_start) VALUES ($1, '2025-10-01')`, s.acct); err == nil {
		t.Error("a mark on a Wednesday was accepted")
	}
}

func TestWeekStartIsMonday(t *testing.T) {
	for in, want := range map[string]string{
		"2025-10-01": "2025-09-29", // Wednesday
		"2025-09-29": "2025-09-29", // Monday
		"2025-10-05": "2025-09-29", // Sunday
		"2025-10-06": "2025-10-06",
		"2025-03-02": "2025-02-24", // across a month
	} {
		if got := scalar(t, "week_start($1::date)", in); got != want {
			t.Errorf("week_start(%s) = %s, want %s", in, got, want)
		}
	}
}
