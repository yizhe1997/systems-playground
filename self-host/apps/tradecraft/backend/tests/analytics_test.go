package tests

import (
	"encoding/json"
	"fmt"
	"strings"
	"testing"
	"time"

	"tradecraft/internal/analytics"
)

// Feature 005: Home and Analytics. The reference month of specs/005-home-and-analytics/quickstart.md through the real
// routes against a real Postgres: twelve USD trades in October 2026 (net +340.00).

type refSpec struct {
	day, time, dir, instrument, account string
	net                                 int    // the result in points (dollars per point is 1, size 1)
	risk                                int    // 0 = no stop recorded
	plan                                string // "" = not judged yet
	tags                                []string
}

var referenceTrades = []refSpec{
	{"2026-10-01", "09:41", "long", "NQ", "F", 120, 200, "yes", nil},
	{"2026-10-02", "10:14", "long", "ES", "F", -90, 0, "", nil},
	{"2026-10-05", "09:41", "long", "NQ", "F", 60, 200, "yes", nil},
	{"2026-10-06", "10:14", "short", "NQ", "F", -150, 100, "no", []string{"Chased entry"}},
	{"2026-10-08", "09:41", "long", "NQ", "F", 200, 100, "yes", nil},
	{"2026-10-09", "09:41", "long", "NQ", "F", 80, 200, "yes", nil},
	{"2026-10-12", "10:14", "short", "ES", "F", -40, 0, "partly", nil},
	{"2026-10-13", "09:41", "long", "NQ", "F", 110, 200, "yes", nil},
	{"2026-10-15", "09:41", "long", "ES", "A", -70, 0, "", nil},
	{"2026-10-20", "10:14", "long", "NQ", "A", 150, 200, "yes", nil},
	{"2026-10-22", "10:14", "short", "NQ", "A", -90, 150, "no", []string{"Chased entry", "Moved stop"}},
	{"2026-10-27", "10:14", "long", "ES", "A", 60, 0, "", nil},
}

type refMonth struct{ funded, alpha string }

// referenceMonth creates the two accounts and the twelve trades with their plan answers and mistake tags.
func referenceMonth(t *testing.T) refMonth {
	t.Helper()
	reset(t)
	clock = time.Date(2026, 11, 1, 12, 0, 0, 0, time.UTC) // after the reference month: no trade is in the future
	m := refMonth{funded: account(t, "Funded 50K", "USD", ""), alpha: account(t, "Alpha 2", "USD", "")}
	for _, s := range referenceTrades {
		acct := m.funded
		if s.account == "A" {
			acct = m.alpha
		}
		entry, exit := 1000, 1000+s.net
		if s.dir == "short" {
			exit = 1000 - s.net
		}
		in := map[string]any{
			"accountId": acct, "instrument": s.instrument, "direction": s.dir, "size": "1", "cost": "0", "dollarsPerPoint": "1",
			"entryPrice": fmt.Sprint(entry), "exitPrice": fmt.Sprint(exit),
			"entryAt": s.day + "T" + s.time + ":00", "exitAt": s.day + "T" + strings.Replace(s.time, ":41", ":58", 1) + ":00",
		}
		if strings.HasSuffix(s.time, ":14") {
			in["exitAt"] = s.day + "T10:31:00"
		}
		if s.risk > 0 {
			if s.dir == "short" {
				in["stopPrice"] = fmt.Sprint(entry + s.risk)
			} else {
				in["stopPrice"] = fmt.Sprint(entry - s.risk)
			}
		}
		id := trade(t, in).str("id")
		if s.plan != "" || len(s.tags) > 0 {
			label := ""
			if len(s.tags) > 0 {
				label = "mistake"
			}
			judge(t, id, s.plan, label, s.tags...)
		}
	}
	return m
}

type analyticsDoc struct {
	From, To     string
	AccountID    *string
	Band         string
	TimeZone     string
	Blocks       []analytics.Block
	OtherPeriods int
}

func getAnalytics(t *testing.T, query string) analyticsDoc {
	t.Helper()
	r := call(t, "GET", "/analytics?"+query, nil)
	mustStatus(t, r, 200)
	var d analyticsDoc
	if err := json.Unmarshal(r.raw, &d); err != nil {
		t.Fatalf("%v: %s", err, r.raw)
	}
	return d
}

func stat(t *testing.T, b analytics.Block, key string) analytics.Statistic {
	t.Helper()
	for _, s := range b.Statistics {
		if s.Key == key {
			return s
		}
	}
	t.Fatalf("no statistic %s", key)
	return analytics.Statistic{}
}

func statValue(t *testing.T, b analytics.Block, key string) string {
	t.Helper()
	s := stat(t, b, key)
	if s.Value == nil {
		t.Fatalf("%s is a dash: %v", key, s.Reason)
	}
	return *s.Value
}

const october = "from=2026-10-01&to=2026-10-31"

func TestTheReferenceMonthThroughTheRoute(t *testing.T) {
	referenceMonth(t)
	d := getAnalytics(t, october)
	if len(d.Blocks) != 1 || d.Blocks[0].Currency != "USD" || d.Blocks[0].Trades != 12 || d.TimeZone != "America/Chicago" || d.OtherPeriods != 0 {
		t.Fatalf("doc: %d blocks, %+v", len(d.Blocks), d)
	}
	b := d.Blocks[0]
	for key, want := range map[string]string{"netResult": "340", "profitFactor": "1.772727", "expectancy": "28.333333", "averageWin": "111.428571",
		"averageLoss": "-88", "payoffRatio": "1.266234", "largestWin": "200", "largestLoss": "-150", "maxDrawdown": "-180",
		"winStreak": "2", "lossStreak": "1", "expectancyR": "0.3125"} {
		if got := statValue(t, b, key); got != want {
			t.Errorf("%s = %s, want %s", key, got, want)
		}
	}
	if wr := stat(t, b, "winRate"); *wr.Wins != 7 || *wr.Counted != 12 || *wr.Percent != 58 {
		t.Errorf("win rate %+v", wr)
	}
	if p := b.Plan; p.Followed != 6 || p.Partly != 1 || p.NotFollowed != 2 || p.NotJudged != 3 || p.Of != 12 {
		t.Errorf("plan %+v", p)
	}
	dd := stat(t, b, "maxDrawdown")
	if *dd.Peak != "120" || *dd.Trough != "-60" || *dd.PeakDay != "2026-10-01" || *dd.TroughDay != "2026-10-06" {
		t.Errorf("drawdown %+v", dd)
	}
	// every statistic carries its plan figure and sample (SC-003) and a definition
	for _, s := range b.Statistics {
		if s.Plan.Of != s.N && s.Key != "largestWin" && s.Key != "largestLoss" && s.Key != "winRate" && s.Key != "expectancyR" && s.Key != "averageWin" && s.Key != "averageLoss" {
			t.Errorf("%s: plan of %d for n = %d", s.Key, s.Plan.Of, s.N)
		}
		if s.Definition == "" {
			t.Errorf("%s has no definition", s.Key)
		}
	}
	if len(b.Statistics) != 13 {
		t.Errorf("%d statistics", len(b.Statistics))
	}
}

func TestTheBandAndTheDashesThroughTheRoute(t *testing.T) {
	referenceMonth(t)
	b := getAnalytics(t, october + "&band=40").Blocks[0]
	if wr := stat(t, b, "winRate"); *wr.Wins != 7 || *wr.Counted != 11 || *wr.Percent != 64 || *wr.SetAside != 1 {
		t.Errorf("win rate with a band %+v", wr)
	}
	if statValue(t, b, "netResult") != "340" {
		t.Error("the band changed the money")
	}
	// a single day with one trade: dashes with their reasons, nothing shown as zero
	one := getAnalytics(t, "from=2026-10-01&to=2026-10-01").Blocks[0]
	if s := stat(t, one, "expectancy"); s.Value != nil || *s.Reason != "needs at least 2 trades, has 1" {
		t.Errorf("expectancy %+v", s)
	}
	if s := stat(t, one, "profitFactor"); s.Value != nil || *s.Reason != "no losing trades" {
		t.Errorf("profit factor %+v", s)
	}
}

func TestTheSeriesBreakdownsReplayAndMistakeCostThroughTheRoute(t *testing.T) {
	m := referenceMonth(t)
	b := getAnalytics(t, october).Blocks[0]
	if len(b.Curve) != 12 || b.Curve[11].Cumulative != "340" || b.Curve[3].Cumulative != "-60" {
		t.Errorf("curve: %+v", b.Curve)
	}
	if len(b.Days) != 12 || b.Days[3].Day != "2026-10-06" || b.Days[3].OpenAccountID != m.funded || b.Days[9].OpenAccountID != m.alpha || b.Days[3].Plan.NotFollowed != 1 {
		t.Errorf("days: %+v", b.Days)
	}
	tue := b.Breakdowns.Weekday[1]
	if tue.Key != "2" || tue.Trades != 4 || *tue.NetResult != "170" || tue.Wins != 3 || tue.Plan.Followed != 2 {
		t.Errorf("Tuesday %+v", tue)
	}
	if h := b.Breakdowns.Hour; len(h) != 2 || h[0].Key != "9" || h[0].Trades != 6 || *h[0].NetResult != "500" || *h[1].NetResult != "-160" {
		t.Errorf("hours %+v", h)
	}
	if i := b.Breakdowns.Instrument; i[0].Key != "ES" || i[0].Trades != 4 || *i[0].NetResult != "-140" || *i[1].NetResult != "480" {
		t.Errorf("instruments %+v", i)
	}
	if d := b.Breakdowns.Direction; d[0].Key != "long" || *d[0].NetResult != "620" || *d[1].NetResult != "-280" {
		t.Errorf("directions %+v", d)
	}
	if a := b.Breakdowns.Account; a[0].Label != "Alpha 2" || *a[0].NetResult != "50" || a[1].Label != "Funded 50K" || *a[1].NetResult != "290" {
		t.Errorf("accounts %+v", a)
	}
	lines := map[string]string{}
	for _, l := range b.Replay.Lines {
		lines[l.Key] = fmt.Sprintf("%d:%s", l.Trades, l.NetResult)
	}
	if lines["followed"] != "6:720" || lines["notFollowed"] != "3:-280" || lines["notJudged"] != "3:-100" || lines["actual"] != "12:340" || lines["without"] != "9:620" || b.Replay.Judged != 9 || b.Replay.Of != 12 {
		t.Errorf("replay %+v", b.Replay)
	}
	if mc := b.MistakeCost; len(mc) != 2 || mc[0].Name != "Chased entry" || mc[0].Trades != 2 || mc[0].NetResult != "-240" || mc[1].Name != "Moved stop" || mc[1].NetResult != "-90" {
		t.Errorf("mistake cost %+v", mc)
	}
}

func TestTheScopeRules(t *testing.T) {
	m := referenceMonth(t)
	// a Backtest account and a EUR account, an archived Live account and a deleted trade
	bt := accountOfKind(t, "NQ ORB backtest", "backtest")
	btTrade := trade(t, sampleTrade(bt, "2026-10-14T09:41", "2026-10-14T09:58", "1000", "1500")).str("id")
	eur := account(t, "Beta EUR", "EUR", "")
	trade(t, sampleTrade(eur, "2026-10-16T09:41", "2026-10-16T09:58", "1000", "1100"))
	old := account(t, "Old live", "USD", "")
	trade(t, sampleTrade(old, "2026-10-19T09:41", "2026-10-19T09:58", "1000", "1010"))
	mustStatus(t, call(t, "POST", "/accounts/"+old+"/archive", nil), 200)

	d := getAnalytics(t, october)
	if len(d.Blocks) != 2 || d.Blocks[0].Currency != "EUR" || d.Blocks[1].Currency != "USD" {
		t.Fatalf("blocks: %d", len(d.Blocks))
	}
	usd, eurB := d.Blocks[1], d.Blocks[0]
	// sampleTrade has 20 dollars per point: the archived Live account counts (+200), the Backtest account never does,
	// nothing adds across currencies
	if usd.Trades != 13 || statValue(t, usd, "netResult") != "540" || eurB.Trades != 1 || statValue(t, eurB, "netResult") != "2000" {
		t.Errorf("USD %d trades %s, EUR %d trades %s", usd.Trades, statValue(t, usd, "netResult"), eurB.Trades, statValue(t, eurB, "netResult"))
	}
	if len(usd.Accounts) != 3 || !accountArchived(usd, "Old live") {
		t.Errorf("accounts: %d", len(usd.Accounts))
	}
	// a Backtest account is shown on its own when chosen
	one := getAnalytics(t, october+"&accountId="+bt)
	if len(one.Blocks) != 1 || one.Blocks[0].Trades != 1 || statValue(t, one.Blocks[0], "netResult") != "10000" || one.Blocks[0].Accounts[0].Kind != "backtest" {
		t.Errorf("backtest: %d blocks", len(one.Blocks))
	}
	// an archived account can be chosen
	if g := getAnalytics(t, october+"&accountId="+old); len(g.Blocks) != 1 || g.Blocks[0].Trades != 1 {
		t.Errorf("archived: %d blocks", len(g.Blocks))
	}
	// one account is only that account
	if g := getAnalytics(t, october+"&accountId="+m.alpha); g.Blocks[0].Trades != 4 || statValue(t, g.Blocks[0], "netResult") != "50" {
		t.Errorf("Alpha 2: %d trades", g.Blocks[0].Trades)
	}
	// a deleted trade never counts and comes back when restored
	mustStatus(t, call(t, "DELETE", "/trades/"+btTrade, nil), 200)
	if g := getAnalytics(t, october+"&accountId="+bt); len(g.Blocks) != 0 || g.OtherPeriods != 0 {
		t.Errorf("deleted: %d blocks, %d elsewhere", len(g.Blocks), g.OtherPeriods)
	}
	mustStatus(t, call(t, "POST", "/trades/"+btTrade+"/restore", nil), 200)
	if g := getAnalytics(t, october+"&accountId="+bt); len(g.Blocks) != 1 {
		t.Errorf("restored: %d blocks", len(g.Blocks))
	}
}

func accountArchived(b analytics.Block, name string) bool {
	for _, a := range b.Accounts {
		if a.Name == name {
			return a.Archived
		}
	}
	return false
}

func TestEmptyScopesTellAnEmptyPeriodFromAnEmptyJournal(t *testing.T) {
	reset(t)
	if d := getAnalytics(t, october); len(d.Blocks) != 0 || d.OtherPeriods != 0 {
		t.Errorf("empty journal: %+v", d)
	}
	referenceMonth(t)
	d := getAnalytics(t, "from=2025-01-01&to=2025-12-31")
	if len(d.Blocks) != 0 || d.OtherPeriods != 12 {
		t.Errorf("a period with nothing: %d blocks, %d elsewhere", len(d.Blocks), d.OtherPeriods)
	}
}

func TestParameterRulesOfTheAnalyticsRoute(t *testing.T) {
	m := referenceMonth(t)
	for name, q := range map[string]string{
		"no dates": "", "no end": "from=2026-10-01", "bad date": "from=2026-13-01&to=2026-10-31",
		"end before start": "from=2026-10-31&to=2026-10-01", "over 20 years": "from=2000-01-01&to=2026-10-31",
		"negative band": october + "&band=-1", "nine decimals": october + "&band=1.123456789", "band text": october + "&band=abc",
		"account text": october + "&accountId=nope",
	} {
		if r := call(t, "GET", "/analytics?"+q, nil); r.status != 422 {
			t.Errorf("%s: %d %s", name, r.status, r.raw)
		}
	}
	if r := call(t, "GET", "/analytics?from=2026-10-31&to=2026-10-01", nil); !strings.Contains(string(r.raw), "The end is before the start") {
		t.Errorf("message: %s", r.raw)
	}
	if r := call(t, "GET", "/analytics?"+october+"&accountId=00000000-0000-0000-0000-000000000000", nil); r.status != 404 {
		t.Errorf("unknown account: %d", r.status)
	}
	if r := call(t, "GET", "/analytics?"+october+"&band=0&accountId="+m.funded, nil); r.status != 200 {
		t.Errorf("a valid request: %d", r.status)
	}
	// exactly 20 years is allowed
	if r := call(t, "GET", "/analytics?from=2006-10-31&to=2026-10-31", nil); r.status != 200 {
		t.Errorf("20 years: %d", r.status)
	}
}

// SC-008 and G-24: reading changes nothing. The export and the audit log are the same before and after every scope.
func TestReadingAnalyticsChangesNothing(t *testing.T) {
	m := referenceMonth(t)
	bt := accountOfKind(t, "Backtest", "backtest")
	export := func() string {
		r := call(t, "GET", "/export", nil)
		mustStatus(t, r, 200)
		var d map[string]any
		_ = json.Unmarshal(r.raw, &d)
		delete(d, "exportedAt")
		// the export itself is an audit entry; leave it out of the comparison
		entries, _ := d["auditEntries"].([]any)
		kept := entries[:0]
		for _, e := range entries {
			if e.(map[string]any)["kind"] != "export_downloaded" {
				kept = append(kept, e)
			}
		}
		d["auditEntries"] = kept
		b, _ := json.Marshal(d)
		return string(b)
	}
	before := export()
	for _, q := range []string{october, october + "&band=40", october + "&accountId=" + m.funded, october + "&accountId=" + bt, "from=2007-01-01&to=2026-10-31"} {
		getAnalytics(t, q)
	}
	if after := export(); after != before {
		t.Error("the export changed after reading analytics")
	}
	_, _, entries := auditList(t, "")
	for _, e := range entries {
		if strings.Contains(e.Kind, "analytics") {
			t.Errorf("an audit entry: %+v", e)
		}
	}
}

// SC-006: a breakdown row's trades are exactly what the Trades list shows when filtered the way the row says.
func TestTheTradesFiltersOpenExactlyTheRowsOfTheBreakdowns(t *testing.T) {
	referenceMonth(t)
	b := getAnalytics(t, october).Blocks[0]
	base := "/trades?from=2026-10-01&to=2026-10-31&limit=200"
	check := func(name, query string, want int) {
		t.Helper()
		if got := totalCount(t, base+query); got != want {
			t.Errorf("%s: the list has %d trades, the row says %d", name, got, want)
		}
	}
	for _, r := range b.Breakdowns.Weekday {
		check("weekday "+r.Label, "&weekday="+r.Key, r.Trades)
	}
	for _, r := range b.Breakdowns.Hour {
		check("hour "+r.Label, "&hour="+r.Key, r.Trades)
	}
	for _, r := range b.Breakdowns.Instrument {
		check("instrument "+r.Label, "&instrument="+r.Key, r.Trades)
	}
	for _, r := range b.Breakdowns.Direction {
		check("direction "+r.Label, "&direction="+r.Key, r.Trades)
	}
	for _, r := range b.Breakdowns.Account {
		check("account "+r.Label, "&accountId="+r.Key, r.Trades)
	}
	for _, mc := range b.MistakeCost {
		check("mistake "+mc.Name, "&mistakeId="+mc.MistakeID, mc.Trades)
	}
	check("followed", "&plan=followed", b.Plan.Followed)
	check("not followed", "&plan=notfollowed", b.Plan.NotFollowed+b.Plan.Partly)
	check("not judged", "&plan=notjudged", b.Plan.NotJudged)
	// the filters combine: Tuesday, NQ, short is the one trade of 6 Oct
	check("combined", "&weekday=2&instrument=NQ&direction=short", 1)
	// a different journal time zone moves the hour: nothing is left in the 9 o'clock hour of Chicago when read in Tokyo
	for name, q := range map[string]string{"weekday 8": "&weekday=8", "weekday 0": "&weekday=0", "hour 24": "&hour=24", "hour text": "&hour=x",
		"direction": "&direction=up", "mistake": "&mistakeId=nope", "plan": "&plan=x"} {
		if r := call(t, "GET", base+q, nil); r.status != 422 {
			t.Errorf("%s: %d", name, r.status)
		}
	}
	// no filter: the list is as before
	check("unfiltered", "", 12)
}

// The cost table's "records" is the Mistakes counter's number for the same scope (feature 001's rule: each tag on a
// trade and each whole-day record, once).
func TestTheCostTableRecordsEqualTheMistakesCounter(t *testing.T) {
	m := referenceMonth(t)
	// a whole-day record of Moved stop on a day of the month, on top of the trade tags
	mistakeID := ""
	for _, mc := range getAnalytics(t, october).Blocks[0].MistakeCost {
		if mc.Name == "Moved stop" {
			mistakeID = mc.MistakeID
		}
	}
	exec(t, `INSERT INTO day_mistake (account_id, trading_day, mistake_id) VALUES ($1, '2026-10-20', $2)`, m.alpha, mistakeID)
	b := getAnalytics(t, october).Blocks[0]
	counter := call(t, "GET", "/mistakes/counter?period=month&date=2026-10-15", nil)
	mustStatus(t, counter, 200)
	rows, _ := counter.body["rows"].([]any)
	byName := map[string]int{}
	for _, r := range rows {
		row := r.(map[string]any)
		byName[row["name"].(string)] = int(row["month"].(map[string]any)["total"].(float64))
	}
	for _, mc := range b.MistakeCost {
		if mc.Records != byName[mc.Name] {
			t.Errorf("%s: the cost table says %d records, the counter %d", mc.Name, mc.Records, byName[mc.Name])
		}
	}
	if byName["Moved stop"] != 2 || byName["Chased entry"] != 2 {
		t.Errorf("counter: %v", byName)
	}
}
