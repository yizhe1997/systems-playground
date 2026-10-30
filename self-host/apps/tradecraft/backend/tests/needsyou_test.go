package tests

import (
	"encoding/json"
	"testing"
)

// Feature 005, user story 4: Home's "needs you" list equals what the Reviews screens call Missing and not judged.

type needsDoc struct {
	MissingDays struct {
		Total int
		Items []struct {
			AccountID, AccountName, Day string
			Trades                      int
		}
	}
	NotJudged struct {
		Total int
		Items []struct{ TradeID, AccountName, Instrument, Direction, EntryAt, TradingDay string }
	}
	MissingWeeks struct {
		Total int
		Items []struct{ AccountID, AccountName, WeekStart, WeekEnd string }
	}
}

func getNeeds(t *testing.T, query string) needsDoc {
	t.Helper()
	r := call(t, "GET", "/needs-you?"+query, nil)
	mustStatus(t, r, 200)
	var d needsDoc
	if err := json.Unmarshal(r.raw, &d); err != nil {
		t.Fatalf("%v: %s", err, r.raw)
	}
	return d
}

func TestNeedsYouEqualsTheReviewsScreens(t *testing.T) {
	m := referenceMonth(t)
	d := getNeeds(t, october)
	// all twelve days ended with trades and no review: newest first
	if d.MissingDays.Total != 12 || len(d.MissingDays.Items) != 12 || d.MissingDays.Items[0].Day != "2026-10-27" || d.MissingDays.Items[11].Day != "2026-10-01" {
		t.Fatalf("missing days: %d of %d, first %s", len(d.MissingDays.Items), d.MissingDays.Total, d.MissingDays.Items[0].Day)
	}
	// every listed day is Missing on the daily review screen (and the screen agrees on the account)
	for _, it := range d.MissingDays.Items {
		r := call(t, "GET", "/reviews/day?accountId="+it.AccountID+"&date="+it.Day, nil)
		mustStatus(t, r, 200)
		if r.str("state") != "missing" {
			t.Errorf("%s is %q on the daily review", it.Day, r.str("state"))
		}
	}
	// three trades are not judged yet, newest first
	if d.NotJudged.Total != 3 || len(d.NotJudged.Items) != 3 || d.NotJudged.Items[0].TradingDay != "2026-10-27" || d.NotJudged.Items[2].TradingDay != "2026-10-02" {
		t.Errorf("not judged: %+v", d.NotJudged)
	}
	if d.NotJudged.Items[0].Instrument != "ES" || d.NotJudged.Items[0].Direction != "long" || len(d.NotJudged.Items[0].EntryAt) < 19 {
		t.Errorf("not judged item: %+v", d.NotJudged.Items[0])
	}
	// the weeks: every week with a trade has ended except the current one, whatever today is (the count is not pinned)
	weeks := d.MissingWeeks.Total
	if weeks < 4 || len(d.MissingWeeks.Items) != weeks {
		t.Errorf("missing weeks: %d", weeks)
	}
	if w := d.MissingWeeks.Items[0]; w.WeekEnd == "" || w.AccountName == "" {
		t.Errorf("week item: %+v", w)
	}

	// each fix removes its line: a saved review, a judgement and a marked week
	exec(t, `INSERT INTO daily_review (account_id, trading_day, did_well, could_improve, next_focus) VALUES ($1, '2026-10-06', 'x', '', '')`, m.funded)
	judge(t, d.NotJudged.Items[0].TradeID, "yes", "")
	exec(t, `INSERT INTO weekly_review_mark (account_id, week_start) VALUES ($1, '2026-10-05')`, m.funded)
	after := getNeeds(t, october)
	if after.MissingDays.Total != 11 || after.NotJudged.Total != 2 || after.MissingWeeks.Total != weeks-1 {
		t.Errorf("after the fixes: days %d, not judged %d, weeks %d (was %d)", after.MissingDays.Total, after.NotJudged.Total, after.MissingWeeks.Total, weeks)
	}
}

func TestNeedsYouScopeAndCap(t *testing.T) {
	m := referenceMonth(t)
	// a Backtest account: its days are never Missing, its unjudged trades only appear when it is chosen
	bt := accountOfKind(t, "NQ ORB backtest", "backtest")
	trade(t, sampleTrade(bt, "2026-10-14T09:41", "2026-10-14T09:58", "1000", "1500"))
	live := getNeeds(t, october)
	if live.MissingDays.Total != 12 || live.NotJudged.Total != 3 {
		t.Errorf("live scope: %d days, %d not judged", live.MissingDays.Total, live.NotJudged.Total)
	}
	chosen := getNeeds(t, october+"&accountId="+bt)
	if chosen.MissingDays.Total != 0 || chosen.NotJudged.Total != 1 || chosen.MissingWeeks.Total != 0 {
		t.Errorf("the Backtest account: %+v", chosen)
	}
	// one account is only that account
	if a := getNeeds(t, october+"&accountId="+m.alpha); a.MissingDays.Total != 4 || a.NotJudged.Total != 2 {
		t.Errorf("Alpha 2: %d days, %d not judged", a.MissingDays.Total, a.NotJudged.Total)
	}
	// more than twenty: the list stops at twenty and the total says how many there are
	many := account(t, "Many", "USD", "")
	for i := 1; i <= 25; i++ {
		day := "2026-09-" + twoDigit(i%28+1)
		trade(t, sampleTrade(many, day+"T09:41", day+"T09:58", "1000", "1001"))
	}
	c := getNeeds(t, "from=2026-09-01&to=2026-09-30&accountId="+many)
	if c.NotJudged.Total != 25 || len(c.NotJudged.Items) != 20 || c.MissingDays.Total < 20 || len(c.MissingDays.Items) != 20 {
		t.Errorf("cap: not judged %d (%d listed), days %d (%d listed)", c.NotJudged.Total, len(c.NotJudged.Items), c.MissingDays.Total, len(c.MissingDays.Items))
	}
	// parameter rules are the analytics route's
	for name, q := range map[string]string{"no dates": "", "end before start": "from=2026-10-31&to=2026-10-01", "bad account": october + "&accountId=nope"} {
		if r := call(t, "GET", "/needs-you?"+q, nil); r.status != 422 {
			t.Errorf("%s: %d", name, r.status)
		}
	}
	if r := call(t, "GET", "/needs-you?"+october+"&accountId=00000000-0000-0000-0000-000000000000", nil); r.status != 404 {
		t.Errorf("unknown account: %d", r.status)
	}
}

func twoDigit(n int) string {
	if n < 10 {
		return "0" + string(rune('0'+n))
	}
	return string(rune('0'+n/10)) + string(rune('0'+n%10))
}
