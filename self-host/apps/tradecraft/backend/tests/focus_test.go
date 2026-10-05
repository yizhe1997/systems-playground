package tests

import (
	"strings"
	"testing"
)

func putFocus(t *testing.T, period, date, body string, extra ...any) resp {
	t.Helper()
	in := map[string]any{"period": period, "date": date, "body": body}
	if len(extra) == 1 {
		in["expectedUpdatedAt"] = extra[0]
	}
	return call(t, "PUT", "/focus", in)
}

// Scenario K: a week focus and a month focus are shared by every account and follow the trading day of a review.
func TestScenarioKFocusFollowsThePeriod(t *testing.T) {
	reset(t)
	a := account(t, "Funded", "USD", "")
	b := account(t, "Practice", "USD", "")
	mustStatus(t, putFocus(t, "week", "2025-10-01", "A+ setups only."), 200)
	mustStatus(t, putFocus(t, "month", "2025-10-20", "Grade every trade."), 200)

	// three reviews in the week (two accounts) show both lines
	for _, c := range []struct{ acct, date string }{{a, "2025-10-01"}, {a, "2025-10-05"}, {b, "2025-10-03"}} {
		d := getDay(t, c.acct, c.date)
		wantStr(t, "week "+c.date, figure(d, "focus", "week", "body").(string), "A+ setups only.")
		wantStr(t, "month "+c.date, figure(d, "focus", "month", "body").(string), "Grade every trade.")
	}
	// the next week shows the month and nothing for the week
	d := getDay(t, a, "2025-10-06")
	if figure(d, "focus", "week", "body") != nil {
		t.Errorf("next week has a focus: %v", figure(d, "focus", "week"))
	}
	wantStr(t, "month in the next week", figure(d, "focus", "month", "body").(string), "Grade every trade.")
	// a week crossing two months belongs to its own Monday, the month to the viewed day
	d = getDay(t, a, "2025-09-30")
	wantStr(t, "crossing week", figure(d, "focus", "week", "body").(string), "A+ setups only.")
	if figure(d, "focus", "month", "body") != nil {
		t.Errorf("September has no focus: %v", figure(d, "focus", "month"))
	}
	g := call(t, "GET", "/focus?period=week&date=2025-10-02", nil)
	mustStatus(t, g, 200)
	wantStr(t, "start", g.str("periodStart"), "2025-09-29")
	wantStr(t, "end", g.str("periodEnd"), "2025-10-05")
}

func TestFocusWriteReplaceClear(t *testing.T) {
	reset(t)
	first := putFocus(t, "week", "2025-10-01", "One")
	mustStatus(t, first, 200)
	// replace needs the version token
	mustStatus(t, putFocus(t, "week", "2025-10-01", "Two"), 409)
	second := putFocus(t, "week", "2025-10-01", "Two", first.str("updatedAt"))
	mustStatus(t, second, 200)
	wantStr(t, "body", second.str("body"), "Two")
	r := putFocus(t, "week", "2025-10-01", "Stale", first.str("updatedAt"))
	mustStatus(t, r, 409)
	wantStr(t, "message", r.str("message"), "This focus was changed elsewhere. Reload to see the latest version.")
	// an empty body clears; a stale clear is refused; clearing nothing is fine
	mustStatus(t, putFocus(t, "week", "2025-10-01", "", first.str("updatedAt")), 409)
	c := putFocus(t, "week", "2025-10-01", "", second.str("updatedAt"))
	mustStatus(t, c, 200)
	if c.body["body"] != nil || c.body["updatedAt"] != nil {
		t.Errorf("cleared: %s", c.raw)
	}
	mustStatus(t, putFocus(t, "week", "2025-10-01", ""), 200)
	// Undo of a clear writes the old text back
	mustStatus(t, putFocus(t, "week", "2025-10-01", "Two"), 200)
}

func TestFocusLengthCountsCharacters(t *testing.T) {
	reset(t)
	mustStatus(t, putFocus(t, "month", "2025-10-01", strings.Repeat("x", 280)), 200)
	r := putFocus(t, "month", "2025-10-01", strings.Repeat("x", 281))
	mustStatus(t, r, 422)
	wantStr(t, "message", r.fields()["body"], "Too long: 1 character over. Shorten it to save.")
	r = putFocus(t, "month", "2025-10-01", strings.Repeat("x", 307))
	wantStr(t, "message", r.fields()["body"], "Too long: 27 characters over. Shorten it to save.")
	// counted as characters, not bytes: 280 of a three-byte character is accepted
	mustStatus(t, putFocus(t, "month", "2025-11-01", strings.Repeat("€", 280)), 200)
	mustStatus(t, putFocus(t, "month", "2025-11-01", strings.Repeat("€", 281), call(t, "GET", "/focus?period=month&date=2025-11-01", nil).str("updatedAt")), 422)
	mustStatus(t, putFocus(t, "year", "2025-10-01", "x"), 422)
	mustStatus(t, putFocus(t, "week", "nope", "x"), 422)
}
