package tests

import (
	"context"
	dbsql "database/sql"
	"fmt"
	"net/url"
	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"tradecraft/migrations"
)

// Feature 003, user story 4: a trade belongs to the day it was ENTERED. These vectors replace the exit vectors of
// feature 000 (G1 to G7); the rule is the same, applied to the entry instead of the exit.

// exitTrade logs the shape of trade A with the given entry and exit (journal time) and returns the answer. The name
// is kept from the exit-based tests; both times are given because the trading day is read from the entry.
func exitTrade(t *testing.T, acct, entry, exit string) resp {
	t.Helper()
	in := tradeA(acct)
	in["entryAt"], in["exitAt"] = entry, exit
	return trade(t, in)
}

// Account day start 17:00, journal zone America/Chicago (CDT, UTC-5, in October).
func TestTradingDayFollowsTheEntry(t *testing.T) {
	reset(t)
	acct := account(t, "Funded 50K", "USD", "17:00")
	// at or after the start counts to the next calendar date; before it stays on the same date
	g1 := exitTrade(t, acct, "2025-10-07T17:00:00", "2025-10-07T17:30:00")
	wantStr(t, "entry exactly 17:00", g1.str("tradingDay"), "2025-10-08")
	g2 := exitTrade(t, acct, "2025-10-07T16:59:00", "2025-10-07T17:30:00")
	wantStr(t, "entry 16:59, exit after the start", g2.str("tradingDay"), "2025-10-07")
	g3 := exitTrade(t, acct, "2025-10-07T16:50:00", "2025-10-07T17:10:00")
	wantStr(t, "entered 16:50, exited 17:10", g3.str("tradingDay"), "2025-10-07")
	g4 := exitTrade(t, acct, "2025-10-07T23:30:00", "2025-10-08T00:20:00") // across midnight
	wantStr(t, "entered 23:30, exited after midnight", g4.str("tradingDay"), "2025-10-08")

	// no start time: the calendar date of the entry, however late the exit
	none := account(t, "Practice", "USD", "")
	n1 := exitTrade(t, none, "2025-10-07T22:00:00", "2025-10-08T01:00:00")
	wantStr(t, "no start, held overnight", n1.str("tradingDay"), "2025-10-07")

	// clearing the day start recomputes every trade of the account from its entry
	a := call(t, "GET", "/accounts/"+acct, nil)
	mustStatus(t, call(t, "PUT", "/accounts/"+acct, map[string]any{"name": "Funded 50K", "currency": "USD", "tradingDayStart": nil, "expectedUpdatedAt": a.str("updatedAt")}), 200)
	for name, id := range map[string]string{"g1": g1.str("id"), "g2": g2.str("id"), "g3": g3.str("id"), "g4": g4.str("id")} {
		wantStr(t, name+" after clearing", call(t, "GET", "/trades/"+id, nil).str("tradingDay"), "2025-10-07")
	}
}

func TestTradingDayJustAfterClocksGoForward(t *testing.T) {
	reset(t)
	acct := account(t, "Funded 50K", "USD", "17:00")
	r := exitTrade(t, acct, "2025-03-09T03:10:00", "2025-03-09T03:30:00")
	wantStr(t, "after the gap", r.str("tradingDay"), "2025-03-09")
}

func TestNonexistentTimeIsRefusedAndPreviewSaysWhy(t *testing.T) {
	reset(t)
	acct := account(t, "Funded 50K", "USD", "17:00")
	in := tradeA(acct)
	// an exit that does not exist is refused on the exit
	in["entryAt"], in["exitAt"] = "2025-03-09T01:30:00", "2025-03-09T02:30:00"
	r := call(t, "POST", "/trades", in)
	mustStatus(t, r, 422)
	wantStr(t, "exit", r.fields()["exitAt"], "That time does not exist on that date in this time zone.")
	// so is an entry; and the preview does not refuse, it says why there is no day (the entry decides it)
	in["entryAt"], in["exitAt"] = "2025-03-09T02:30:00", "2025-03-09T04:30:00"
	r = call(t, "POST", "/trades", in)
	mustStatus(t, r, 422)
	wantStr(t, "entry", r.fields()["entryAt"], "That time does not exist on that date in this time zone.")
	p := call(t, "POST", "/trades/preview", in)
	mustStatus(t, p, 200)
	wantStr(t, "preview reason", p.body["reasons"].(map[string]any)["tradingDay"].(string), "That time does not exist on that date in this time zone.")
}

// The preview reads the day from the entry, and says so when the entry is missing.
func TestPreviewReadsTheDayFromTheEntry(t *testing.T) {
	reset(t)
	acct := account(t, "Funded 50K", "USD", "17:00")
	in := map[string]any{"accountId": acct, "entryAt": "2025-10-07T16:50", "exitAt": "2025-10-07T17:10"}
	p := call(t, "POST", "/trades/preview", in)
	mustStatus(t, p, 200)
	wantStr(t, "entered 16:50", p.str("tradingDay"), "2025-10-07")
	in["entryAt"] = ""
	p = call(t, "POST", "/trades/preview", in)
	mustStatus(t, p, 200)
	if p.body["tradingDay"] != nil {
		t.Errorf("a day without an entry: %v", p.body["tradingDay"])
	}
	wantStr(t, "reason", p.body["reasons"].(map[string]any)["tradingDay"].(string), "needs an entry time")
}

// Changing the journal zone moves the trading day but never the instant.
func TestZoneChangeRecomputesFromTheEntry(t *testing.T) {
	reset(t)
	acct := account(t, "Funded 50K", "USD", "17:00")
	r := exitTrade(t, acct, "2025-10-07T16:00:00", "2025-10-07T16:30:00") // Chicago
	id := r.str("id")
	wantStr(t, "before", r.str("tradingDay"), "2025-10-07")
	instantBefore := sql(t, "(SELECT entry_at FROM trade WHERE id = '"+id+"')")

	mustStatus(t, call(t, "PUT", "/settings", map[string]any{"timeZone": "America/New_York"}), 200)
	after := call(t, "GET", "/trades/"+id, nil)
	wantStr(t, "after", after.str("tradingDay"), "2025-10-08") // entered 17:00 in New York
	if got := sql(t, "(SELECT entry_at FROM trade WHERE id = '"+id+"')"); got != instantBefore {
		t.Errorf("the instant moved: %s -> %s", instantBefore, got)
	}
	wantStr(t, "entry shown in the new zone", after.str("entryAt"), "2025-10-07T17:00:00-04:00")
}

// A trade of an archived account and a deleted trade are recomputed too.
func TestRecomputeCoversArchivedAndDeleted(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "17:00")
	live := exitTrade(t, acct, "2025-10-07T16:00:00", "2025-10-07T16:30:00")
	gone := exitTrade(t, acct, "2025-10-07T16:10:00", "2025-10-07T16:40:00")
	mustStatus(t, call(t, "DELETE", "/trades/"+gone.str("id"), nil), 200)
	mustStatus(t, call(t, "POST", "/accounts/"+acct+"/archive", nil), 200)

	mustStatus(t, call(t, "PUT", "/settings", map[string]any{"timeZone": "America/New_York"}), 200)
	for name, id := range map[string]string{"live": live.str("id"), "deleted": gone.str("id")} {
		wantStr(t, name, call(t, "GET", "/trades/"+id, nil).str("tradingDay"), "2025-10-08")
	}
	// and a day-start change on the archived account
	a := call(t, "GET", "/accounts/"+acct, nil)
	mustStatus(t, call(t, "PUT", "/accounts/"+acct, map[string]any{"name": "A", "currency": "USD", "tradingDayStart": "20:00", "expectedUpdatedAt": a.str("updatedAt")}), 200)
	for name, id := range map[string]string{"live": live.str("id"), "deleted": gone.str("id")} {
		wantStr(t, name+" after day start change", call(t, "GET", "/trades/"+id, nil).str("tradingDay"), "2025-10-07")
	}
}

// The Trades list is newest ENTRY first, and a day's trades are in entry order.
func TestOrderFollowsTheEntry(t *testing.T) {
	reset(t)
	acct := account(t, "Funded 50K", "USD", "")
	held := exitTrade(t, acct, "2025-10-01T09:00:00", "2025-10-03T09:00:00").str("id")  // entered first, exited last
	quick := exitTrade(t, acct, "2025-10-02T09:00:00", "2025-10-02T09:30:00").str("id") // entered later, exited earlier
	l := call(t, "GET", "/trades?accountId="+acct, nil)
	mustStatus(t, l, 200)
	if len(l.list) != 2 || l.list[0]["id"] != quick || l.list[1]["id"] != held {
		t.Errorf("the list is not newest entry first: %s", l.raw)
	}

	// one day: entered 09:00 and exited 15:00, then entered 10:00 and exited 10:30 (by exit it would be the other way)
	first := exitTrade(t, acct, "2025-10-06T09:00:00", "2025-10-06T15:00:00").str("id")
	second := exitTrade(t, acct, "2025-10-06T10:00:00", "2025-10-06T10:30:00").str("id")
	d := call(t, "GET", "/reviews/day?accountId="+acct+"&date=2025-10-06", nil)
	mustStatus(t, d, 200)
	trades := d.body["trades"].([]any)
	if len(trades) != 2 || trades[0].(map[string]any)["id"] != first || trades[1].(map[string]any)["id"] != second {
		t.Errorf("the day's trades are not in entry order: %s", d.raw)
	}
}

// SC-011 and FR-025: arriving on a journal that has trades recomputes each trade's day once from its entry and changes
// no price, time, cost or result. The migration is applied to a scratch database that has data at version 14.
func TestMigrationRecomputesFromTheEntryAndChangesNothingElse(t *testing.T) {
	ctx := context.Background()
	adminURL := os.Getenv("TEST_DATABASE_URL")
	admin, err := pgxpool.New(ctx, adminURL)
	if err != nil {
		t.Fatal(err)
	}
	defer admin.Close()
	name := fmt.Sprintf("tc2_mig_%d", time.Now().UnixNano())
	if _, err := admin.Exec(ctx, "CREATE DATABASE "+name); err != nil {
		t.Fatal(err)
	}
	defer func() { _, _ = admin.Exec(ctx, "DROP DATABASE "+name+" WITH (FORCE)") }()
	u, _ := url.Parse(adminURL)
	u.Path = "/" + name
	db, err := dbsql.Open("pgx", u.String())
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	provider, err := goose.NewProvider(goose.DialectPostgres, db, migrations.FS)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := provider.UpTo(ctx, 14); err != nil {
		t.Fatal(err)
	}
	mustExec := func(q string, args ...any) {
		t.Helper()
		if _, err := db.ExecContext(ctx, q, args...); err != nil {
			t.Fatalf("%s: %v", q, err)
		}
	}
	mustExec(`INSERT INTO account (name, currency, trading_day_start) VALUES ('Funded', 'USD', '17:00')`)
	mustExec(`INSERT INTO account (name, currency) VALUES ('Practice', 'USD')`)
	// Funded (start 17:00): entered 16:50 and exited 17:10 Chicago is 8 Oct by exit and 7 Oct by entry; entered 23:30
	// and exited 00:20 is 8 Oct either way. Practice (no start, deleted trade): held overnight, 7 Oct by entry.
	mustExec(`INSERT INTO trade (account_id, instrument, direction, size, entry_price, exit_price, entry_at, exit_at, dollars_per_point, cost)
	          SELECT a.id, 'NQ', 'long', 2, 21450, 21452.5, v.e, v.x, 20, 4.60
	            FROM account a, (VALUES
	              ('2025-10-07 21:50:00+00'::timestamptz, '2025-10-07 22:10:00+00'::timestamptz),
	              ('2025-10-08 04:30:00+00'::timestamptz, '2025-10-08 05:20:00+00'::timestamptz)) v(e, x)
	           WHERE a.name = 'Funded'`)
	mustExec(`INSERT INTO trade (account_id, instrument, direction, size, entry_price, exit_price, entry_at, exit_at, dollars_per_point, cost, deleted_at)
	          SELECT a.id, 'ES', 'short', 1, 5000, 4990, '2025-10-08 02:00:00+00', '2025-10-09 15:00:00+00', 50, 0, now()
	            FROM account a WHERE a.name = 'Practice'`)

	snapshot := func() (rows, days []string) {
		r, err := db.QueryContext(ctx, `SELECT (to_jsonb(t) - 'trading_day' - 'updated_at')::text, trading_day::text
		                                  FROM trade t ORDER BY t.instrument, t.entry_at`)
		if err != nil {
			t.Fatal(err)
		}
		defer r.Close()
		for r.Next() {
			var row, day string
			if err := r.Scan(&row, &day); err != nil {
				t.Fatal(err)
			}
			rows, days = append(rows, row), append(days, day)
		}
		return rows, days
	}
	beforeRows, beforeDays := snapshot()
	if len(beforeRows) != 3 {
		t.Fatalf("setup: %d trades", len(beforeRows))
	}
	if _, err := provider.Up(ctx); err != nil {
		t.Fatal(err)
	}
	afterRows, afterDays := snapshot()
	for i := range beforeRows {
		if beforeRows[i] != afterRows[i] {
			t.Errorf("trade %d changed apart from its day:\n before %s\n after  %s", i, beforeRows[i], afterRows[i])
		}
	}
	// ordered by instrument then entry: ES, NQ (16:50), NQ (23:30). Entry 2025-10-07 21:00 Chicago for ES -> 7 Oct.
	want := []string{"2025-10-07", "2025-10-07", "2025-10-08"}
	for i := range want {
		if afterDays[i] != want[i] {
			t.Errorf("day %d: %s, want %s (before %s)", i, afterDays[i], want[i], beforeDays[i])
		}
	}
}
