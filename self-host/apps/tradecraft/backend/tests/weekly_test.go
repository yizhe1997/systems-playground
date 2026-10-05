package tests

import (
	"net/url"
	"strconv"
	"testing"
	"time"
)

func weekly(t *testing.T, acct, date string) resp {
	t.Helper()
	r := call(t, "GET", "/weekly?"+url.Values{"accountId": {acct}, "date": {date}}.Encode(), nil)
	mustStatus(t, r, 200)
	return r
}

func weekDays(r resp) []map[string]any {
	var out []map[string]any
	for _, d := range r.body["days"].([]any) {
		out = append(out, d.(map[string]any))
	}
	return out
}

func markWeek(t *testing.T, acct, date string) resp {
	t.Helper()
	return call(t, "POST", "/weekly/mark", map[string]any{"accountId": acct, "date": date})
}

// Scenario L: seven days Monday to Sunday with their statuses; a missing day's trades still count in the week.
func TestScenarioLWeekAsItsDays(t *testing.T) {
	reset(t)
	s := sampleDay(t) // Wed 1 Oct; the clock is Wed 15 Oct, so the week of 29 Sep has ended
	trade(t, sampleTrade(s.acct, "2025-09-29T09:00", "2025-09-29T09:30", "100", "101"))
	mustStatus(t, saveDay(t, map[string]any{"accountId": s.acct, "date": "2025-10-01", "didWell": "Waited", "mentalGrade": 4, "markReviewed": true}), 200)
	mustStatus(t, saveDay(t, map[string]any{"accountId": s.acct, "date": "2025-10-02", "couldImprove": "Size"}), 200)

	r := weekly(t, s.acct, "2025-10-03") // any day of the week
	wantStr(t, "start", r.str("weekStart"), "2025-09-29")
	wantStr(t, "end", r.str("weekEnd"), "2025-10-05")
	wantStr(t, "previous", r.str("previousWeek"), "2025-09-22")
	wantStr(t, "next", r.str("nextWeek"), "2025-10-06")
	wantStr(t, "state", r.str("state"), "missing")
	want := []string{"missing", "no_trades", "reviewed", "draft", "no_trades", "no_trades", "no_trades"}
	days := weekDays(r)
	if len(days) != 7 {
		t.Fatalf("days: %d", len(days))
	}
	for i, d := range days {
		if d["status"] != want[i] {
			t.Errorf("day %v: %v, want %s", d["date"], d["status"], want[i])
		}
	}
	// the missing Monday is counted: 4 trades, net 65.00, and the figures are the sum of the days
	if num(figure(r, "stats", "trades")) != 4 || figure(r, "stats", "netResult") != "65" && figure(r, "stats", "netResult") != "65.00" {
		t.Errorf("week figures: %v", r.body["stats"])
	}
	sum, trades := 0.0, 0
	for _, d := range days {
		trades += num(d["trades"])
		if n, ok := d["netResult"].(string); ok {
			f, _ := strconv.ParseFloat(n, 64)
			sum += f
		}
	}
	if trades != 4 || sum != 65 {
		t.Errorf("sum of the days: %d trades, %v", trades, sum)
	}
	// what was written is read from the days, with the grade; a day without a review has no answers
	if a := days[2]["answers"].(map[string]any); a["didWell"] != "Waited" || num(days[2]["mentalGrade"]) != 4 {
		t.Errorf("Wednesday: %v", days[2])
	}
	if days[0]["answers"] != nil {
		t.Errorf("the missing Monday has answers: %v", days[0]["answers"])
	}
	// the focus of the week and of the month the week is listed under
	mustStatus(t, putFocus(t, "week", "2025-10-01", "A+ only"), 200)
	mustStatus(t, putFocus(t, "month", "2025-10-01", "Grade every trade"), 200)
	r = weekly(t, s.acct, "2025-09-29")
	wantStr(t, "week focus", figure(r, "focus", "week", "body").(string), "A+ only")
	wantStr(t, "month focus", figure(r, "focus", "month", "body").(string), "Grade every trade")
	mustStatus(t, call(t, "GET", "/weekly?accountId="+s.acct+"&date=nope", nil), 422)
	mustStatus(t, call(t, "GET", "/weekly?accountId=00000000-0000-0000-0000-000000000000&date=2025-10-01", nil), 404)
}

func TestWeekStatesNotYetAndTheCurrentWeek(t *testing.T) {
	reset(t)
	a := account(t, "Funded", "USD", "")
	// the account's today comes from the database clock, so the week is built around it
	today, err := time.Parse("2006-01-02", scalar(t, "(SELECT account_today('"+a+"')::text)"))
	if err != nil {
		t.Fatal(err)
	}
	d := today.Format("2006-01-02")
	clock = time.Now() // the app clock follows the database clock, so a trade early today is not in the future
	trade(t, sampleTrade(a, d+"T00:00", d+"T00:30", "100", "101"))
	r := weekly(t, a, d)
	wantStr(t, "current week is never missing", r.str("state"), "not_reviewed")
	for _, day := range weekDays(r) {
		want := "no_trades"
		switch {
		case day["date"] == d:
			want = "today"
		case day["date"].(string) > d:
			want = "not_yet"
		}
		if day["status"] != want {
			t.Errorf("day %v: %v, want %s", day["date"], day["status"], want)
		}
	}
	// a week that has not started cannot be marked; the current one can
	f := markWeek(t, a, today.AddDate(0, 0, 7).Format("2006-01-02"))
	mustStatus(t, f, 422)
	wantStr(t, "message", f.fields()["date"], "This week has not started yet.")
	mustStatus(t, markWeek(t, a, d), 200)
}

func TestMarkingAWeekStoresOnlyTheMark(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	count := func(table string) string { return scalar(t, "(SELECT count(*) FROM "+table+")") }
	before := map[string]string{}
	tables := []string{"daily_review", "trade_judgement", "trade_mistake", "day_mistake", "focus", "trade"}
	for _, tb := range tables {
		before[tb] = count(tb)
	}
	weekly(t, s.acct, "2025-10-01") // reading stores nothing
	if count("weekly_review_mark") != "0" {
		t.Fatal("reading a week stored a mark")
	}
	first := markWeek(t, s.acct, "2025-10-01")
	mustStatus(t, first, 200)
	wantStr(t, "state", first.str("state"), "reviewed")
	if first.str("reviewedAt") == "" {
		t.Fatal("no time on the mark")
	}
	second := markWeek(t, s.acct, "2025-10-05") // a second call, any day of the week, changes nothing
	mustStatus(t, second, 200)
	wantStr(t, "same time", second.str("reviewedAt"), first.str("reviewedAt"))
	if count("weekly_review_mark") != "1" {
		t.Errorf("marks: %s", count("weekly_review_mark"))
	}
	for _, tb := range tables {
		if count(tb) != before[tb] {
			t.Errorf("%s changed: %s to %s", tb, before[tb], count(tb))
		}
	}
	// FR-021a: there is no way to remove a mark
	for _, m := range []string{"DELETE", "PUT"} {
		if r := call(t, m, "/weekly/mark", map[string]any{"accountId": s.acct, "date": "2025-10-01"}); r.status != 404 && r.status != 405 {
			t.Errorf("%s /weekly/mark answered %d", m, r.status)
		}
	}
}
