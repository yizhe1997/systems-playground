package analytics

import (
	"strings"
	"testing"
	"time"

	"github.com/shopspring/decimal"
)

// The reference month of specs/005-home-and-analytics/quickstart.md: twelve USD trades in October 2026.
type refTrade struct {
	day        string
	hour       int
	net        string
	r          string // "" = no stop recorded
	plan       string
	instrument string
	direction  string
	account    string
	mistakes   []string
}

var refMonth = []refTrade{
	{"2026-10-01", 9, "120", "0.60", PlanYes, "NQ", "long", "Funded 50K", nil},
	{"2026-10-02", 10, "-90", "", "", "ES", "long", "Funded 50K", nil},
	{"2026-10-05", 9, "60", "0.30", PlanYes, "NQ", "long", "Funded 50K", nil},
	{"2026-10-06", 10, "-150", "-1.50", PlanNo, "NQ", "short", "Funded 50K", []string{"Chased entry"}},
	{"2026-10-08", 9, "200", "2.00", PlanYes, "NQ", "long", "Funded 50K", nil},
	{"2026-10-09", 9, "80", "0.40", PlanYes, "NQ", "long", "Funded 50K", nil},
	{"2026-10-12", 10, "-40", "", PlanPartly, "ES", "short", "Funded 50K", nil},
	{"2026-10-13", 9, "110", "0.55", PlanYes, "NQ", "long", "Funded 50K", nil},
	{"2026-10-15", 9, "-70", "", "", "ES", "long", "Alpha 2", nil},
	{"2026-10-20", 10, "150", "0.75", PlanYes, "NQ", "long", "Alpha 2", nil},
	{"2026-10-22", 10, "-90", "-0.60", PlanNo, "NQ", "short", "Alpha 2", []string{"Chased entry", "Moved stop"}},
	{"2026-10-27", 10, "60", "", "", "ES", "long", "Alpha 2", nil},
}

func dec(s string) decimal.Decimal { return decimal.RequireFromString(s) }

func toRow(i int, t refTrade) Row {
	d, _ := time.Parse("2006-01-02", t.day)
	r := Row{TradeID: string(rune('a' + i)), AccountID: t.account, AccountName: t.account, Currency: "USD", AccountKind: "live",
		Day: d, EntryAt: d.Add(time.Duration(t.hour) * time.Hour), Hour: t.hour, Weekday: int(d.Weekday()), Instrument: t.instrument,
		Direction: t.direction, Net: dec(t.net), Plan: t.plan, MistakeNames: t.mistakes, MistakeIDs: t.mistakes}
	if r.Weekday == 0 {
		r.Weekday = 7
	}
	if t.r != "" {
		v := dec(t.r)
		r.R = &v
	}
	return r
}

func refRows() []Row {
	rows := make([]Row, len(refMonth))
	for i, t := range refMonth {
		rows[i] = toRow(i, t)
	}
	return rows
}

// rowsOf builds rows of the given net results, one per day from 2026-10-01 (weekends are not a concern for the figures).
func rowsOf(nets ...string) []Row {
	rows := make([]Row, len(nets))
	for i, n := range nets {
		d := time.Date(2026, 10, 1+i, 0, 0, 0, 0, time.UTC)
		rows[i] = Row{TradeID: string(rune('a' + i)), Day: d, EntryAt: d, Net: dec(n), Currency: "USD"}
	}
	return rows
}

func byKey(t *testing.T, stats []Statistic) map[string]Statistic {
	t.Helper()
	m := map[string]Statistic{}
	for _, s := range stats {
		m[s.Key] = s
	}
	if len(m) != 13 {
		t.Fatalf("%d statistics, want 13", len(m))
	}
	return m
}

func val(t *testing.T, s Statistic) string {
	t.Helper()
	if s.Value == nil {
		t.Fatalf("%s: a dash (%v), want a value", s.Key, deref(s.Reason))
	}
	return *s.Value
}

func deref(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func wantVal(t *testing.T, m map[string]Statistic, key, want string) {
	t.Helper()
	if got := val(t, m[key]); got != want {
		t.Errorf("%s = %s, want %s", key, got, want)
	}
}

func wantDash(t *testing.T, m map[string]Statistic, key, reason string) {
	t.Helper()
	s := m[key]
	if s.Value != nil || deref(s.Reason) != reason {
		t.Errorf("%s = %v / %q, want a dash %q", key, deref(s.Value), deref(s.Reason), reason)
	}
}

func TestTheTenTradeExampleOfTheSpec(t *testing.T) {
	m := byKey(t, Statistics(rowsOf("200", "100", "50", "-80", "-40", "-60", "-30", "-20", "-50", "-10"), Params{}))
	wantVal(t, m, "netResult", "60")
	wantVal(t, m, "profitFactor", "1.206897") // 350 / 290 = 1.21
	wantVal(t, m, "expectancy", "6")
	wantVal(t, m, "averageWin", "116.666667")
	wantVal(t, m, "averageLoss", "-41.428571")
	wantVal(t, m, "payoffRatio", "2.816092") // 2.82
	if m["winRate"].Percent == nil || *m["winRate"].Percent != 30 || *m["winRate"].Wins != 3 || *m["winRate"].Counted != 10 {
		t.Errorf("win rate: %+v", m["winRate"])
	}
	if m["winRate"].Few {
		t.Error("10 trades are not few")
	}
}

func TestTheReferenceMonth(t *testing.T) {
	m := byKey(t, Statistics(refRows(), Params{}))
	wantVal(t, m, "netResult", "340")
	wantVal(t, m, "profitFactor", "1.772727") // 780 / 440 = 1.77
	if m["profitFactor"].Detail["won"] != "780" || m["profitFactor"].Detail["lost"] != "440" {
		t.Errorf("parts: %v", m["profitFactor"].Detail)
	}
	wantVal(t, m, "expectancy", "28.333333")
	wantVal(t, m, "expectancyR", "0.3125")
	if m["expectancyR"].N != 8 || m["expectancyR"].Detail["withR"] != "8" || m["expectancyR"].Detail["of"] != "12" {
		t.Errorf("R sample: %+v", m["expectancyR"])
	}
	wantVal(t, m, "averageWin", "111.428571")
	wantVal(t, m, "averageLoss", "-88")
	wantVal(t, m, "payoffRatio", "1.266234") // 1.27
	wantVal(t, m, "largestWin", "200")
	if *m["largestWin"].Day != "2026-10-08" {
		t.Errorf("largest win day %s", *m["largestWin"].Day)
	}
	wantVal(t, m, "largestLoss", "-150")
	if *m["largestLoss"].Day != "2026-10-06" {
		t.Errorf("largest loss day %s", *m["largestLoss"].Day)
	}
	dd := m["maxDrawdown"]
	wantVal(t, m, "maxDrawdown", "-180")
	if *dd.Peak != "120" || *dd.Trough != "-60" || *dd.PeakDay != "2026-10-01" || *dd.TroughDay != "2026-10-06" {
		t.Errorf("drawdown: peak %s on %s, trough %s on %s", *dd.Peak, deref(dd.PeakDay), *dd.Trough, deref(dd.TroughDay))
	}
	wantVal(t, m, "winStreak", "2")
	if *m["winStreak"].From != "2026-10-08" || *m["winStreak"].To != "2026-10-09" {
		t.Errorf("win streak %s to %s", *m["winStreak"].From, *m["winStreak"].To)
	}
	wantVal(t, m, "lossStreak", "1")
	// win rate 7 of 12, 58%
	wr := m["winRate"]
	if *wr.Wins != 7 || *wr.Counted != 12 || *wr.Percent != 58 || *wr.SetAside != 0 {
		t.Errorf("win rate %+v", wr)
	}
	// the plan figure of the same trades: 6 followed, 1 partly, 2 not followed, 3 not judged, of 12
	p := m["netResult"].Plan
	if p.Followed != 6 || p.Partly != 1 || p.NotFollowed != 2 || p.NotJudged != 3 || p.Of != 12 {
		t.Errorf("plan %+v", p)
	}
	for _, s := range m {
		if s.Definition == "" || s.DefinitionKey != s.Key {
			t.Errorf("%s has no definition", s.Key)
		}
		if s.Value == nil && s.Reason == nil {
			t.Errorf("%s: no value and no reason", s.Key)
		}
		if s.Value != nil && s.Reason != nil {
			t.Errorf("%s: a value and a reason", s.Key)
		}
	}
	// the few-trades mark: 12 trades are not few; the R sample of 8 is
	if m["profitFactor"].Few || !m["expectancyR"].Few {
		t.Errorf("few: profit factor %v, R %v", m["profitFactor"].Few, m["expectancyR"].Few)
	}
}

func TestTheBreakEvenBandChangesTheCountNotTheMoney(t *testing.T) {
	m := byKey(t, Statistics(refRows(), Params{Band: dec("40")}))
	wr := m["winRate"]
	if *wr.Wins != 7 || *wr.Counted != 11 || *wr.Percent != 64 || *wr.SetAside != 1 {
		t.Errorf("win rate with a band of 40: %+v", wr)
	}
	// the -40.00 trade is set aside from the plan figure of the counted trades (it was "partly")
	if wr.Plan.Of != 11 || wr.Plan.Partly != 0 {
		t.Errorf("plan of the counted trades %+v", wr.Plan)
	}
	wantVal(t, m, "netResult", "340")
	wantVal(t, m, "profitFactor", "1.772727")
	wantVal(t, m, "averageLoss", "-88")
	// a set-aside trade ends a run: Mon 12 Oct (-40) no longer counts as a loss, the longest losing streak stays 1
	wantVal(t, m, "lossStreak", "1")
}

func TestASetAsideTradeEndsAStreak(t *testing.T) {
	m := byKey(t, Statistics(rowsOf("10", "20", "3", "30", "40"), Params{Band: dec("5")}))
	wantVal(t, m, "winStreak", "2") // 10, 20 | the 3 is set aside | 30, 40
	m = byKey(t, Statistics(rowsOf("10", "20", "3", "30", "40"), Params{}))
	wantVal(t, m, "winStreak", "5")
}

func TestEveryDashSaysWhy(t *testing.T) {
	one := byKey(t, Statistics(rowsOf("300"), Params{}))
	wantVal(t, one, "netResult", "300")
	wantVal(t, one, "averageWin", "300")
	wantVal(t, one, "largestWin", "300")
	wantDash(t, one, "profitFactor", "no losing trades")
	wantDash(t, one, "expectancy", "needs at least 2 trades, has 1")
	wantDash(t, one, "expectancyR", "no stop recorded on 1 of 1 trades")
	wantDash(t, one, "averageLoss", "no losing trades")
	wantDash(t, one, "payoffRatio", "needs a win and a loss")
	wantDash(t, one, "largestLoss", "no losing trades")
	wantDash(t, one, "maxDrawdown", "needs at least 2 trades, has 1")
	wantDash(t, one, "winStreak", "needs at least 2 trades, has 1")
	if !one["winRate"].Few || *one["winRate"].Percent != 100 {
		t.Errorf("one trade: %+v", one["winRate"])
	}

	oneLoss := byKey(t, Statistics(rowsOf("-50"), Params{}))
	wantDash(t, oneLoss, "profitFactor", "needs at least 2 trades, has 1")

	none := byKey(t, Statistics(nil, Params{}))
	wantDash(t, none, "winRate", "no trades")
	wantDash(t, none, "profitFactor", "no trades")
	wantDash(t, none, "maxDrawdown", "needs at least 2 trades, has 0")

	allAside := byKey(t, Statistics(rowsOf("1", "-2"), Params{Band: dec("5")}))
	wantDash(t, allAside, "winRate", "every trade is inside the break-even band")

	// no losses: a profit factor needs a loss, a drawdown of winning days only is zero
	wins := byKey(t, Statistics(rowsOf("10", "20", "30"), Params{}))
	wantDash(t, wins, "profitFactor", "no losing trades")
	wantVal(t, wins, "maxDrawdown", "0")
}

func TestDrawdownStartsFromZero(t *testing.T) {
	m := byKey(t, Statistics(rowsOf("-50", "-30", "20"), Params{}))
	dd := m["maxDrawdown"]
	wantVal(t, m, "maxDrawdown", "-80") // from the start (0) to -80
	if dd.PeakDay != nil || *dd.Peak != "0" || *dd.Trough != "-80" || *dd.TroughDay != "2026-10-02" {
		t.Errorf("all-losing start: peak day %v peak %s trough %s on %s", dd.PeakDay, *dd.Peak, *dd.Trough, deref(dd.TroughDay))
	}
}

func TestOrderOfTradesWithinADayDecidesTheRunningResult(t *testing.T) {
	// the rows arrive in order; the function trusts it, so the same day in two orders differs
	a := byKey(t, Statistics(rowsOf("100", "-100", "50"), Params{}))
	wantVal(t, a, "maxDrawdown", "-100")
	b := byKey(t, Statistics(rowsOf("-100", "100", "50"), Params{}))
	wantVal(t, b, "maxDrawdown", "-100")
	c := byKey(t, Statistics(rowsOf("50", "100", "-100"), Params{}))
	wantVal(t, c, "maxDrawdown", "-100")
}

func TestPercentIsRoundedHalfUp(t *testing.T) {
	// 1 of 8 = 12.5 -> 13; 1 of 3 = 33.3 -> 33; 2 of 3 = 66.7 -> 67
	for _, c := range []struct {
		nets []string
		want int
	}{{[]string{"1", "-1", "-1", "-1", "-1", "-1", "-1", "-1"}, 13}, {[]string{"1", "-1", "-1"}, 33}, {[]string{"1", "1", "-1"}, 67}} {
		m := byKey(t, Statistics(rowsOf(c.nets...), Params{}))
		if got := *m["winRate"].Percent; got != c.want {
			t.Errorf("%v: %d, want %d", c.nets, got, c.want)
		}
	}
}

func TestParseBand(t *testing.T) {
	for _, ok := range []string{"", "0", "40", "40.00", "0.5", "12345.12345678"} {
		if _, msg := ParseBand(ok); msg != "" {
			t.Errorf("%q refused: %s", ok, msg)
		}
	}
	for _, bad := range []string{"-1", "1.123456789", "abc", "1,5", "1e3", "99999999999999999"} {
		if _, msg := ParseBand(bad); msg == "" {
			t.Errorf("%q accepted", bad)
		}
	}
}

func TestDefinitionsAreAllThereAndPlain(t *testing.T) {
	seen := map[string]bool{}
	for _, d := range Definitions {
		if seen[d.Key] || d.Text == "" || strings.Contains(d.Text, "  ") {
			t.Errorf("definition %q", d.Key)
		}
		seen[d.Key] = true
	}
	if len(Definitions) != 13 {
		t.Errorf("%d definitions", len(Definitions))
	}
}
