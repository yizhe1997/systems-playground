package analytics

import (
	"testing"
)

func TestTheCurveIsTheRunningResultByTradingDay(t *testing.T) {
	c := Curve(refRows())
	want := []string{"120", "30", "90", "-60", "140", "220", "180", "290", "220", "370", "280", "340"}
	if len(c) != len(want) {
		t.Fatalf("%d points", len(c))
	}
	for i, w := range want {
		if c[i].Cumulative != w {
			t.Errorf("point %d: %s, want %s", i, c[i].Cumulative, w)
		}
	}
	// two trades on one day are one point
	rows := rowsOf("10", "20")
	rows[1].Day = rows[0].Day
	if c := Curve(rows); len(c) != 1 || c[0].Result != "30" || c[0].Cumulative != "30" {
		t.Errorf("one day: %+v", c)
	}
	if c := Curve(nil); c == nil || len(c) != 0 {
		t.Errorf("empty: %v", c)
	}
}

func TestEachDayHasItsOwnPlanFigureAndTheAccountToOpen(t *testing.T) {
	rows := refRows()
	d := Days(rows)
	if len(d) != 12 || d[3].Day != "2026-10-06" || d[3].Result != "-150" || d[3].Plan.NotFollowed != 1 || d[3].Plan.Of != 1 || d[3].OpenAccountID != "Funded 50K" {
		t.Errorf("6 Oct: %+v", d[3])
	}
	if d[1].Plan.NotJudged != 1 {
		t.Errorf("2 Oct is not judged: %+v", d[1].Plan)
	}
	// a day with trades in two accounts opens the account with more trades, a tie goes to the name that sorts first
	two := rowsOf("10", "20", "30")
	for i := range two {
		two[i].Day = two[0].Day
	}
	two[0].AccountID, two[0].AccountName = "b", "Beta"
	two[1].AccountID, two[1].AccountName = "a", "Alpha"
	two[2].AccountID, two[2].AccountName = "b", "Beta"
	if d := Days(two); len(d) != 1 || d[0].OpenAccountID != "b" || d[0].Trades != 3 {
		t.Errorf("most trades: %+v", d)
	}
	two[2].AccountID, two[2].AccountName = "a", "Alpha"
	if d := Days(two); d[0].OpenAccountID != "a" { // Alpha 2, Beta 1
		t.Errorf("most trades again: %+v", d)
	}
	two[2].AccountID, two[2].AccountName = "c", "Gamma"
	two[0].AccountID, two[0].AccountName = "b", "Beta" // one each of Beta, Alpha, Gamma: a tie goes to Alpha
	if d := Days(two); d[0].OpenAccountID != "a" {
		t.Errorf("a tie: %+v", d)
	}
}

type want struct {
	key     string
	trades  int
	net     string
	wins    int
	counted int
	follow  int
}

func checkRows(t *testing.T, name string, got []BreakdownRow, wants []want) {
	t.Helper()
	if len(got) != len(wants) {
		t.Fatalf("%s: %d rows, want %d: %+v", name, len(got), len(wants), got)
	}
	for i, w := range wants {
		g := got[i]
		net := ""
		if g.NetResult != nil {
			net = *g.NetResult
		}
		if g.Key != w.key || g.Trades != w.trades || net != w.net || g.Wins != w.wins || g.Counted != w.counted || g.Plan.Followed != w.follow || g.Plan.Of != w.trades {
			t.Errorf("%s row %d: %+v, want %+v", name, i, g, w)
		}
	}
}

func TestTheFiveBreakdownsOfTheReferenceMonth(t *testing.T) {
	b := BreakdownsOf(refRows(), Params{})
	checkRows(t, "weekday", b.Weekday, []want{
		{"1", 2, "20", 1, 2, 1}, {"2", 4, "170", 3, 4, 2}, {"3", 0, "", 0, 0, 0}, {"4", 4, "160", 2, 4, 2}, {"5", 2, "-10", 1, 2, 1}})
	checkRows(t, "hour", b.Hour, []want{{"9", 6, "500", 5, 6, 5}, {"10", 6, "-160", 2, 6, 1}})
	checkRows(t, "instrument", b.Instrument, []want{{"ES", 4, "-140", 1, 4, 0}, {"NQ", 8, "480", 6, 8, 6}})
	checkRows(t, "direction", b.Direction, []want{{"long", 9, "620", 7, 9, 6}, {"short", 3, "-280", 0, 3, 0}})
	checkRows(t, "account", b.Account, []want{{"Alpha 2", 4, "50", 2, 4, 1}, {"Funded 50K", 8, "290", 5, 8, 5}})
	if b.Weekday[2].NetResult != nil || b.Weekday[2].Label != "Wednesday" {
		t.Errorf("a weekday with no trades has no result: %+v", b.Weekday[2])
	}
	if b.Hour[0].Label != "09:00 to 09:59" || b.Direction[0].Label != "Long" {
		t.Errorf("labels: %q %q", b.Hour[0].Label, b.Direction[0].Label)
	}
	// every breakdown adds up to the whole: the same trades, the same net
	for name, rs := range map[string][]BreakdownRow{"weekday": b.Weekday, "hour": b.Hour, "instrument": b.Instrument, "direction": b.Direction, "account": b.Account} {
		n, sum := 0, dec("0")
		for _, r := range rs {
			n += r.Trades
			if r.NetResult != nil {
				sum = sum.Add(dec(*r.NetResult))
			}
		}
		if n != 12 || sum.String() != "340" {
			t.Errorf("%s adds up to %d trades and %s", name, n, sum)
		}
	}
}

func TestWeekendsAreListedOnlyWhenTheyHaveTrades(t *testing.T) {
	rows := rowsOf("10", "20")
	rows[0].Weekday, rows[1].Weekday = 6, 2
	b := BreakdownsOf(rows, Params{})
	if len(b.Weekday) != 6 || b.Weekday[5].Key != "6" || b.Weekday[5].Trades != 1 {
		t.Errorf("a Saturday trade adds a Saturday row: %+v", b.Weekday)
	}
	rows[0].Weekday = 1
	if b := BreakdownsOf(rows, Params{}); len(b.Weekday) != 5 {
		t.Errorf("no weekend trades, five rows: %d", len(b.Weekday))
	}
}

func TestTheBandChangesTheWinCountOfARow(t *testing.T) {
	b := BreakdownsOf(refRows(), Params{Band: dec("40")})
	// Monday: +60 and -40 (set aside): one win of one counted
	if m := b.Weekday[0]; m.Trades != 2 || m.Counted != 1 || m.Wins != 1 || *m.NetResult != "20" {
		t.Errorf("Monday with a band: %+v", m)
	}
}

func TestTheReplayOfTheReferenceMonthAndOfTheSampleDay(t *testing.T) {
	r := ReplayOf(refRows())
	wantLines := []struct {
		key    string
		trades int
		net    string
	}{{"followed", 6, "720"}, {"notFollowed", 3, "-280"}, {"notJudged", 3, "-100"}, {"actual", 12, "340"}, {"without", 9, "620"}}
	for i, w := range wantLines {
		if g := r.Lines[i]; g.Key != w.key || g.Trades != w.trades || g.NetResult != w.net {
			t.Errorf("line %d: %+v, want %+v", i, g, w)
		}
	}
	if r.Judged != 9 || r.Of != 12 {
		t.Errorf("judged %d of %d", r.Judged, r.Of)
	}
	// the lines add up
	sum := dec(r.Lines[0].NetResult).Add(dec(r.Lines[1].NetResult)).Add(dec(r.Lines[2].NetResult))
	if sum.String() != r.Lines[3].NetResult {
		t.Errorf("followed + not followed + not judged = %s, actual %s", sum, r.Lines[3].NetResult)
	}

	// the sample day of feature 001: +300 Yes, -125 Yes, -130 No
	day := rowsOf("300", "-125", "-130")
	day[0].Plan, day[1].Plan, day[2].Plan = PlanYes, PlanYes, PlanNo
	s := ReplayOf(day)
	if s.Lines[3].NetResult != "45" || s.Lines[1].NetResult != "-130" || s.Lines[4].NetResult != "175" || s.Judged != 3 || s.Of != 3 {
		t.Errorf("sample day: %+v", s)
	}
}

func TestAProfitablePlanBreakingTradeIsAPositiveLeak(t *testing.T) {
	rows := rowsOf("100", "50")
	rows[0].Plan, rows[1].Plan = PlanYes, PlanNo
	r := ReplayOf(rows)
	if r.Lines[1].NetResult != "50" || r.Lines[4].NetResult != "100" || r.Lines[3].NetResult != "150" {
		t.Errorf("%+v", r.Lines)
	}
}

func TestNothingJudgedLeavesEverythingInTheResultWithout(t *testing.T) {
	r := ReplayOf(rowsOf("10", "-4"))
	if r.Judged != 0 || r.Lines[2].Trades != 2 || r.Lines[4].NetResult != "6" || r.Lines[1].NetResult != "0" || r.Lines[1].Trades != 0 {
		t.Errorf("%+v", r)
	}
}

func TestTheCostOfEachMistake(t *testing.T) {
	rows := refRows()
	day := map[string]map[string]int{"Alpha 2": {"Moved stop": 1}, "Funded 50K": {"Oversized": 4}} // a day record; Oversized has no trade
	c := MistakeCosts(rows, day)
	if len(c) != 2 {
		t.Fatalf("%d mistakes: %+v", len(c), c)
	}
	chased, moved := c[0], c[1]
	if chased.Name != "Chased entry" || chased.Trades != 2 || chased.NetResult != "-240" || chased.Plan.NotFollowed != 2 || chased.Records != 2 {
		t.Errorf("chased entry: %+v", chased)
	}
	// Moved stop: one trade (-90) and one whole-day record of an account in the block
	if moved.Name != "Moved stop" || moved.Trades != 1 || moved.NetResult != "-90" || moved.Records != 2 {
		t.Errorf("moved stop: %+v", moved)
	}
	if c := MistakeCosts(rowsOf("10"), nil); c == nil || len(c) != 0 {
		t.Errorf("no tags: %v", c)
	}
}

func TestBlocksAreOnePerCurrencyAndNothingCrosses(t *testing.T) {
	rows := refRows()
	eur := rowsOf("100", "-50", "20")
	for i := range eur {
		eur[i].Currency, eur[i].AccountID, eur[i].AccountName = "EUR", "Beta EUR", "Beta EUR"
		eur[i].Plan = PlanYes
	}
	rows = append(rows, eur...)
	blocks := BuildBlocks(rows, Params{}, nil)
	if len(blocks) != 2 || blocks[0].Currency != "EUR" || blocks[1].Currency != "USD" {
		t.Fatalf("blocks: %d", len(blocks))
	}
	if blocks[0].Trades != 3 || *blocks[0].Statistics[0].Value != "70" || blocks[1].Trades != 12 || *blocks[1].Statistics[0].Value != "340" {
		t.Errorf("EUR %d trades %s; USD %d trades %s", blocks[0].Trades, *blocks[0].Statistics[0].Value, blocks[1].Trades, *blocks[1].Statistics[0].Value)
	}
	if len(blocks[1].Accounts) != 2 || blocks[1].Accounts[0].Name != "Alpha 2" {
		t.Errorf("accounts: %+v", blocks[1].Accounts)
	}
	if got := BuildBlocks(nil, Params{}, nil); got == nil || len(got) != 0 {
		t.Errorf("no rows: %v", got)
	}
}
