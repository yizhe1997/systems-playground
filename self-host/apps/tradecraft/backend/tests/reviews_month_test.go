package tests

import (
	"net/url"
	"testing"
)

func getMonth(t *testing.T, acct, month string) resp {
	t.Helper()
	r := call(t, "GET", "/reviews?"+url.Values{"accountId": {acct}, "month": {month}}.Encode(), nil)
	mustStatus(t, r, 200)
	return r
}

func weekStarts(r resp) []string {
	var out []string
	for _, w := range r.body["weeks"].([]any) {
		out = append(out, w.(map[string]any)["weekStart"].(string))
	}
	return out
}

func dayRows(w map[string]any) []map[string]any {
	var out []map[string]any
	for _, d := range w["days"].([]any) {
		out = append(out, d.(map[string]any))
	}
	return out
}

// Scenario M: a week is listed under the month its Sunday falls in.
func TestScenarioMWeekIsUnderTheMonthItEndsIn(t *testing.T) {
	reset(t)
	s := sampleDay(t) // Wed 1 Oct, in the week of 29 Sep to 5 Oct
	oct := getMonth(t, s.acct, "2025-10")
	if got := weekStarts(oct); len(got) != 5 || got[len(got)-1] != "2025-10-06" && got[0] != "2025-10-27" {
		t.Logf("weeks listed in October: %v", got)
	}
	found := false
	for _, w := range oct.body["weeks"].([]any) {
		wm := w.(map[string]any)
		if wm["weekStart"] == "2025-09-29" {
			found = true
			wantStr(t, "week end", wm["weekEnd"].(string), "2025-10-05")
			days := dayRows(wm)
			if len(days) != 1 || days[0]["date"] != "2025-10-01" || num(days[0]["trades"]) != 3 {
				t.Errorf("days of the week: %v", days)
			}
			wantStr(t, "day state", days[0]["state"].(string), "missing")
			wantNum(t, "day net", days[0]["netResult"].(string), "45")
			sm := wm["summary"].(map[string]any)
			if num(sm["daysWithTrades"]) != 1 || num(sm["missing"]) != 1 || num(sm["reviewed"]) != 0 {
				t.Errorf("summary: %v", sm)
			}
			wantStr(t, "week state", wm["state"].(string), "missing")
		}
	}
	if !found {
		t.Errorf("the week of 29 Sep is missing from October: %v", weekStarts(oct))
	}
	// and not under September
	for _, ws := range weekStarts(getMonth(t, s.acct, "2025-09")) {
		if ws == "2025-09-29" {
			t.Error("the week of 29 Sep is listed under September")
		}
	}
	wantStr(t, "previous month", oct.str("previousMonth"), "2025-09")
	wantStr(t, "next month", oct.str("nextMonth"), "2025-11")
}

func TestFilterCountsEqualTheDaysListed(t *testing.T) {
	reset(t)
	s := sampleDay(t)                                                                   // 1 Oct missing
	trade(t, sampleTrade(s.acct, "2025-10-07T09:00", "2025-10-07T09:30", "100", "101")) // 7 Oct missing
	trade(t, sampleTrade(s.acct, "2025-10-08T09:00", "2025-10-08T09:30", "100", "101")) // 8 Oct will be draft
	trade(t, sampleTrade(s.acct, "2025-10-09T09:00", "2025-10-09T09:30", "100", "101")) // 9 Oct will be reviewed
	saveDay(t, map[string]any{"accountId": s.acct, "date": "2025-10-08", "didWell": "x"})
	saveDay(t, map[string]any{"accountId": s.acct, "date": "2025-10-09", "markReviewed": true})
	saveDay(t, map[string]any{"accountId": s.acct, "date": "2025-10-10", "didWell": "a day with no trades"}) // a draft with no trades is listed
	r := getMonth(t, s.acct, "2025-10")
	f := r.body["filters"].(map[string]any)
	if num(f["missing"]) != 2 || num(f["draft"]) != 2 || num(f["reviewed"]) != 1 {
		t.Errorf("filters: %v", f)
	}
	listed := 0
	for _, w := range r.body["weeks"].([]any) {
		listed += len(dayRows(w.(map[string]any)))
	}
	if listed != 5 {
		t.Errorf("%d days listed, want 5", listed)
	}
	// days with no trades and no review are not listed
	for _, w := range r.body["weeks"].([]any) {
		for _, d := range dayRows(w.(map[string]any)) {
			if d["date"] == "2025-10-02" {
				t.Error("an empty day is listed")
			}
		}
	}
}

func TestTodayIsNeverMissingAndTheCurrentWeekIsOpen(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "")
	insertTradeAt(t, acct, "now() - interval '1 minute'")
	today := scalar(t, "account_today($1::uuid)", acct)
	r := getMonth(t, acct, today[:7])
	var cur map[string]any
	for _, w := range r.body["weeks"].([]any) {
		if w.(map[string]any)["current"] == true {
			cur = w.(map[string]any)
		}
	}
	if cur == nil {
		t.Fatalf("no current week among %v", weekStarts(r))
	}
	if cur["state"] == "missing" {
		t.Error("the current week is Missing")
	}
	var seen bool
	for _, d := range dayRows(cur) {
		if d["date"] == today {
			seen = true
			wantStr(t, "state of today", d["state"].(string), "today")
		}
	}
	if !seen {
		t.Errorf("today is not listed: %v", cur)
	}
	wantStr(t, "today", r.str("today"), today)
}

// Scenario N: a 17:30 exit of the 17:00 account belongs to the next day, in the list and in the calendar.
func TestScenarioNEveningExitBelongsToTheNextDay(t *testing.T) {
	reset(t)
	acct := account(t, "Funded 50K", "USD", "17:00")
	trade(t, sampleTrade(acct, "2025-10-01T17:00", "2025-10-01T17:30", "100", "101"))
	r := getMonth(t, acct, "2025-10")
	var dates []string
	for _, w := range r.body["weeks"].([]any) {
		for _, d := range dayRows(w.(map[string]any)) {
			dates = append(dates, d["date"].(string))
		}
	}
	if len(dates) != 1 || dates[0] != "2025-10-02" {
		t.Errorf("listed days: %v, want [2025-10-02]", dates)
	}
	cal := call(t, "GET", "/reviews/calendar?"+url.Values{"accountId": {acct}, "month": {"2025-10"}}.Encode(), nil)
	mustStatus(t, cal, 200)
	days := cal.body["days"].([]any)
	if len(days) != 1 || days[0].(map[string]any)["date"] != "2025-10-02" || days[0].(map[string]any)["missing"] != true {
		t.Errorf("calendar days: %v", days)
	}
}

func TestCalendarMarksWeeksAndOffersMonths(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	trade(t, sampleTrade(s.acct, "2025-08-12T09:00", "2025-08-12T09:30", "100", "101"))
	saveDay(t, map[string]any{"accountId": s.acct, "date": "2025-06-03", "didWell": "a review in June, no trades"})
	mustStatus(t, call(t, "POST", "/accounts/"+s.acct+"/archive", nil), 200) // an archived account still has its reviews

	cal := call(t, "GET", "/reviews/calendar?"+url.Values{"accountId": {s.acct}, "month": {"2025-10"}}.Encode(), nil)
	mustStatus(t, cal, 200)
	weeks := cal.body["weeks"].([]any)
	first := weeks[0].(map[string]any)
	wantStr(t, "first week of the picker", first["weekStart"].(string), "2025-09-29")
	wantStr(t, "its state", first["state"].(string), "missing")
	months := cal.body["months"].([]any)
	var got []string
	for _, m := range months {
		got = append(got, m.(string))
	}
	// the current month (the database clock) plus the months with trades or reviews, newest first
	want := []string{"2025-10", "2025-08", "2025-06"}
	cur := scalar(t, "to_char(account_today($1::uuid), 'YYYY-MM')", s.acct)
	if got[0] != cur || len(got) != 4 || got[1] != want[0] || got[2] != want[1] || got[3] != want[2] {
		t.Errorf("month list %v, want [%s %v]", got, cur, want)
	}
	mustStatus(t, call(t, "GET", "/reviews/calendar?accountId="+s.acct+"&month=2025-13", nil), 422)
	mustStatus(t, call(t, "GET", "/reviews?accountId="+s.acct+"&month=October", nil), 422)
	mustStatus(t, call(t, "GET", "/reviews?accountId=00000000-0000-0000-0000-000000000000", nil), 404)
}

func TestMonthDefaultsToTheAccountsCurrentMonth(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "")
	r := call(t, "GET", "/reviews?accountId="+acct, nil)
	mustStatus(t, r, 200)
	today := scalar(t, "account_today($1::uuid)", acct)
	wantStr(t, "month", r.str("month"), today[:7])
	if len(r.body["weeks"].([]any)) == 0 {
		t.Error("no weeks listed for the current month")
	}
	// a month with nothing in it still lists its weeks, with no days
	empty := getMonth(t, acct, "2025-01")
	for _, w := range empty.body["weeks"].([]any) {
		if len(dayRows(w.(map[string]any))) != 0 {
			t.Errorf("days in an empty month: %v", w)
		}
	}
}
