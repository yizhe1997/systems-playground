package tests

import (
	"bytes"
	"io"
	"net/http/httptest"
	"strconv"
	"testing"
)

// Feature 003, user story 1: an account has a kind, Live or Backtest, and a backtest stays apart from live trading.

// accountOfKind creates an account of a kind (the helper account() makes live ones).
func accountOfKind(t *testing.T, name, kind string) string {
	t.Helper()
	r := call(t, "POST", "/accounts", map[string]any{"name": name, "currency": "USD", "kind": kind})
	mustStatus(t, r, 201)
	return r.str("id")
}

// totalCount is the X-Total-Count of a GET (the whole match, not the page).
func totalCount(t *testing.T, path string) int {
	t.Helper()
	req := httptest.NewRequest("GET", path, nil)
	req.Header.Set("Authorization", "Bearer "+ownerToken())
	res, err := app.Test(req, -1)
	if err != nil {
		t.Fatal(err)
	}
	_, _ = io.Copy(io.Discard, res.Body)
	if res.StatusCode != 200 {
		t.Fatalf("%s: status %d", path, res.StatusCode)
	}
	n, err := strconv.Atoi(res.Header.Get("X-Total-Count"))
	if err != nil {
		t.Fatalf("%s: no X-Total-Count", path)
	}
	return n
}

func TestNewAccountIsLiveUnlessBacktestIsChosen(t *testing.T) {
	reset(t)
	live := call(t, "POST", "/accounts", map[string]any{"name": "Funded 50K", "currency": "USD"})
	mustStatus(t, live, 201)
	if live.str("kind") != "live" {
		t.Fatalf("default kind: %s", live.raw)
	}
	bt := call(t, "POST", "/accounts", map[string]any{"name": "NQ ORB backtest 2024", "currency": "USD", "kind": "backtest"})
	mustStatus(t, bt, 201)
	if bt.str("kind") != "backtest" {
		t.Fatalf("backtest kind: %s", bt.raw)
	}
	// list, get and export carry the kind
	list := call(t, "GET", "/accounts", nil)
	mustStatus(t, list, 200)
	kinds := map[string]string{}
	for _, a := range list.list {
		kinds[a["name"].(string)] = a["kind"].(string)
	}
	if kinds["Funded 50K"] != "live" || kinds["NQ ORB backtest 2024"] != "backtest" {
		t.Errorf("list kinds: %v", kinds)
	}
	if got := call(t, "GET", "/accounts/"+bt.str("id"), nil); got.str("kind") != "backtest" {
		t.Errorf("get: %s", got.raw)
	}
	exp := call(t, "GET", "/export", nil)
	mustStatus(t, exp, 200)
	n := 0
	for _, a := range exp.body["accounts"].([]any) {
		if a.(map[string]any)["kind"] == "backtest" {
			n++
		}
	}
	if n != 1 {
		t.Errorf("export carries %d backtest accounts, want 1", n)
	}
	// an unknown kind is refused with a message on the field
	bad := call(t, "POST", "/accounts", map[string]any{"name": "Other", "currency": "USD", "kind": "paper"})
	mustStatus(t, bad, 422)
	if bad.fields()["kind"] != "Choose Live or Backtest." {
		t.Errorf("field message: %v", bad.fields())
	}
}

func TestChangingKindIsRecordedAndChangesNothingElse(t *testing.T) {
	reset(t)
	acct := accountOfKind(t, "NQ ORB backtest 2024", "backtest")
	id := trade(t, tradeA(acct)).str("id")
	before := call(t, "GET", "/trades/"+id, nil)
	mustStatus(t, before, 200)
	rows := len(auditRows(t))

	r := call(t, "PUT", "/accounts/"+acct, map[string]any{"name": "NQ ORB backtest 2024", "currency": "USD", "kind": "live"})
	mustStatus(t, r, 200)
	if r.str("kind") != "live" {
		t.Fatalf("kind after change: %s", r.raw)
	}
	e := lastEntry(t)
	if e.Kind != "account_kind_changed" || e.Subject != "NQ ORB backtest 2024" || fieldsOf(e) != "kind" || e.Actor != "owner" || e.Email != testOwner {
		t.Fatalf("entry: %+v", e)
	}
	if len(auditRows(t)) != rows+1 {
		t.Fatal("a change of kind wrote more or fewer than one entry")
	}
	// the trade is the same trade: every typed value and every figure is untouched
	after := call(t, "GET", "/trades/"+id, nil)
	for _, k := range []string{"entryPrice", "exitPrice", "entryAt", "exitAt", "grossResult", "netResult", "risk", "rMultiple", "tradingDay"} {
		if before.str(k) != after.str(k) {
			t.Errorf("%s changed from %q to %q", k, before.str(k), after.str(k))
		}
	}
	// saving the same kind again, or leaving it out, records nothing
	mustStatus(t, call(t, "PUT", "/accounts/"+acct, map[string]any{"name": "NQ ORB backtest 2024", "currency": "USD", "kind": "live"}), 200)
	same := call(t, "PUT", "/accounts/"+acct, map[string]any{"name": "NQ ORB backtest 2024", "currency": "USD"})
	mustStatus(t, same, 200)
	if same.str("kind") != "live" {
		t.Errorf("a save with no kind changed it: %s", same.raw)
	}
	if len(auditRows(t)) != rows+1 {
		t.Fatal("a save without a change of kind was recorded")
	}
	// an invalid kind changes nothing
	mustStatus(t, call(t, "PUT", "/accounts/"+acct, map[string]any{"name": "NQ ORB backtest 2024", "currency": "USD", "kind": "x"}), 422)
}

func TestBacktestDaysAreNeverMissing(t *testing.T) {
	reset(t)
	live := account(t, "Funded 50K", "USD", "")
	bt := accountOfKind(t, "NQ ORB backtest 2024", "backtest")
	for _, a := range []string{live, bt} {
		trade(t, sampleTrade(a, "2025-10-01T09:41", "2025-10-01T09:58", "21450.00", "21465.00"))
	}
	// the day and the week
	if got := dayState(t, live, "2025-10-01"); got != "missing" {
		t.Errorf("live day: %q, want missing", got)
	}
	if got := dayState(t, bt, "2025-10-01"); got != "" {
		t.Errorf("backtest day: %q, want no state", got)
	}
	if got := weekState(t, live, "2025-09-29"); got != "missing" {
		t.Errorf("live week: %q, want missing", got)
	}
	if got := weekState(t, bt, "2025-09-29"); got != "not_reviewed" {
		t.Errorf("backtest week: %q, want not_reviewed", got)
	}
	// a day with a trade today is not "today" either
	insertTradeAt(t, bt, "now() - interval '1 minute'")
	if got := dayState(t, bt, scalar(t, "account_today($1::uuid)", bt)); got != "" {
		t.Errorf("backtest today: %q, want no state", got)
	}
	// no count of missing reviews includes it: the month list and the calendar
	m := call(t, "GET", "/reviews?accountId="+bt+"&month=2025-10", nil)
	mustStatus(t, m, 200)
	if got := num(m.body["filters"].(map[string]any)["missing"]); got != 0 {
		t.Errorf("backtest month missing count: %d", got)
	}
	if got := num(call(t, "GET", "/reviews?accountId="+live+"&month=2025-10", nil).body["filters"].(map[string]any)["missing"]); got != 1 {
		t.Errorf("live month missing count: %d, want 1", got)
	}
	cal := call(t, "GET", "/reviews/calendar?accountId="+bt+"&month=2025-10", nil)
	mustStatus(t, cal, 200)
	for _, d := range cal.body["days"].([]any) {
		if d.(map[string]any)["missing"] == true {
			t.Errorf("backtest calendar marks a day missing: %v", d)
		}
	}
	// a saved review shows Draft and Reviewed as for a live account
	exec(t, `INSERT INTO daily_review (account_id, trading_day) VALUES ($1, '2025-10-01')`, bt)
	if got := dayState(t, bt, "2025-10-01"); got != "draft" {
		t.Errorf("saved: %q, want draft", got)
	}
	exec(t, `UPDATE daily_review SET reviewed_at = now() WHERE account_id = $1`, bt)
	if got := dayState(t, bt, "2025-10-01"); got != "reviewed" {
		t.Errorf("reviewed: %q", got)
	}
	// switching the kind moves the day at once, with nothing typed changed
	mustStatus(t, call(t, "PUT", "/accounts/"+bt, map[string]any{"name": "NQ ORB backtest 2024", "currency": "USD", "kind": "live"}), 200)
	exec(t, `DELETE FROM daily_review WHERE account_id = $1`, bt)
	if got := dayState(t, bt, "2025-10-01"); got != "missing" {
		t.Errorf("after the switch to live: %q, want missing", got)
	}
}

func TestTradesListAndCounterKeepBacktestsApart(t *testing.T) {
	reset(t)
	live := account(t, "Funded 50K", "USD", "")
	bt := accountOfKind(t, "NQ ORB backtest 2024", "backtest")
	moved := mistakeID(t, "Moved stop")
	lt := trade(t, sampleTrade(live, "2025-10-01T09:41", "2025-10-01T09:58", "21450.00", "21465.00")).str("id")
	b1 := trade(t, sampleTrade(bt, "2025-10-01T10:14", "2025-10-01T10:31", "21500.00", "21493.75")).str("id")
	b2 := trade(t, sampleTrade(bt, "2025-10-01T10:40", "2025-10-01T10:52", "21500.00", "21493.50")).str("id")
	for _, id := range []string{lt, b1, b2} {
		mustStatus(t, putJudgement(t, id, map[string]any{"planFollowed": "no", "label": "mistake", "mistakeIds": []string{moved}}), 200)
	}

	// the Trades list: live only with no account, backtests on request, an account chosen whatever its kind
	if r := call(t, "GET", "/trades", nil); len(r.list) != 1 || r.list[0]["id"] != lt {
		t.Errorf("no account: %s", r.raw)
	}
	if n := totalCount(t, "/trades"); n != 1 {
		t.Errorf("total with no account: %d, want 1", n)
	}
	if r := call(t, "GET", "/trades?includeBacktests=true", nil); len(r.list) != 3 {
		t.Errorf("with backtests: %s", r.raw)
	}
	if n := totalCount(t, "/trades?includeBacktests=true"); n != 3 {
		t.Errorf("total with backtests: %d, want 3", n)
	}
	if r := call(t, "GET", "/trades?accountId="+bt, nil); len(r.list) != 2 {
		t.Errorf("backtest account chosen: %s", r.raw)
	}
	if n := totalCount(t, "/trades?accountId="+bt); n != 2 {
		t.Errorf("total of the backtest account: %d, want 2", n)
	}
	mustStatus(t, call(t, "GET", "/trades?includeBacktests=maybe", nil), 422)

	// the counter: all accounts means all live accounts; a backtest counts on its own
	row := counterRow(counter(t, "period=week&date=2025-10-01"), moved)
	if cell(row, "week", "total") != 1 {
		t.Errorf("all accounts: %v, want 1 (the live trade only)", row["week"])
	}
	row = counterRow(counter(t, "period=week&date=2025-10-01&accountId="+bt), moved)
	if cell(row, "week", "total") != 2 {
		t.Errorf("the backtest account: %v, want 2", row["week"])
	}
}

// SC-002: with a backtest account holding 500 trades added, every live figure is the same, byte for byte.
func TestLiveFiguresDoNotChangeBecauseABacktestExists(t *testing.T) {
	reset(t)
	s := sampleDay(t) // a live 17:00 account with three trades on Wed 1 Oct 2025
	judgeSample(t, s)
	exec(t, `INSERT INTO daily_review (account_id, trading_day) VALUES ($1, '2025-10-01')`, s.acct)
	reads := []string{
		"/trades",
		"/reviews?accountId=" + s.acct + "&month=2025-10",
		"/reviews/day?accountId=" + s.acct + "&date=2025-10-01",
		"/reviews/calendar?accountId=" + s.acct + "&month=2025-10",
		"/weekly?accountId=" + s.acct + "&date=2025-10-01",
		"/mistakes/counter?period=week&date=2025-10-01",
		"/mistakes/counter?period=month&date=2025-10-01",
		"/mistakes",
	}
	before := make([][]byte, len(reads))
	for i, p := range reads {
		r := call(t, "GET", p, nil)
		mustStatus(t, r, 200)
		before[i] = r.raw
	}

	bt := accountOfKind(t, "NQ ORB backtest 2024", "backtest")
	exec(t, `
		INSERT INTO trade (account_id, instrument, direction, size, entry_price, exit_price, entry_at, exit_at, dollars_per_point, cost)
		SELECT $1, 'NQ', 'long', 1, 21000, 21000 + (i % 7) - 3,
		       timestamptz '2025-09-01 14:00+00' + (i * interval '90 minutes'),
		       timestamptz '2025-09-01 14:20+00' + (i * interval '90 minutes'), 20, 0
		  FROM generate_series(1, 500) i`, bt)
	exec(t, `INSERT INTO trade_judgement (trade_id, plan_followed, label)
	         SELECT id, 'no', 'mistake' FROM trade WHERE account_id = $1`, bt)
	exec(t, `INSERT INTO trade_mistake (trade_id, mistake_id)
	         SELECT t.id, m.id FROM trade t, mistake m WHERE t.account_id = $1 AND m.name = 'Moved stop'`, bt)
	exec(t, `INSERT INTO daily_review (account_id, trading_day) SELECT DISTINCT account_id, trading_day FROM trade WHERE account_id = $1`, bt)

	for i, p := range reads {
		r := call(t, "GET", p, nil)
		mustStatus(t, r, 200)
		if !bytes.Equal(before[i], r.raw) {
			t.Errorf("%s changed because a backtest account exists:\nbefore %s\nafter  %s", p, before[i], r.raw)
		}
	}
}
