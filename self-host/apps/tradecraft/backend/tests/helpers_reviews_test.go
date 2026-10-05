package tests

import (
	"context"
	"testing"
)

// The three-trade sample day of specs/001-journal-and-reflect/quickstart.md, for a 17:00 account on Wed 1 Oct 2025:
// W +300.00, L1 -125.00, L2 -130.00 (net +45.00). Nothing is judged yet.
type sample struct{ acct, w, l1, l2 string }

func sampleTrade(acct, entry, exit, entryPrice, exitPrice string) map[string]any {
	in := tradeA(acct)
	in["size"], in["cost"] = "1", "0"
	delete(in, "stopPrice")
	in["entryAt"], in["exitAt"] = entry, exit
	in["entryPrice"], in["exitPrice"] = entryPrice, exitPrice
	return in
}

func sampleDay(t *testing.T) sample {
	t.Helper()
	acct := account(t, "Funded 50K", "USD", "17:00")
	return sample{
		acct: acct,
		w:    trade(t, sampleTrade(acct, "2025-10-01T09:41", "2025-10-01T09:58", "21450.00", "21465.00")).str("id"),
		l1:   trade(t, sampleTrade(acct, "2025-10-01T10:14", "2025-10-01T10:31", "21500.00", "21493.75")).str("id"),
		l2:   trade(t, sampleTrade(acct, "2025-10-01T10:40", "2025-10-01T10:52", "21500.00", "21493.50")).str("id"),
	}
}

func contextBG() context.Context { return context.Background() }

// exec runs SQL that is part of a test's setup.
func exec(t *testing.T, query string, args ...any) {
	t.Helper()
	if _, err := pool.Exec(context.Background(), query, args...); err != nil {
		t.Fatalf("%s: %v", query, err)
	}
}

// judge writes a judgement straight to the database (the API for it is a later task), with optional mistake tags by name.
func judge(t *testing.T, tradeID, plan, label string, tags ...string) {
	t.Helper()
	exec(t, `INSERT INTO trade_judgement (trade_id, plan_followed, label)
	         VALUES ($1, NULLIF($2, ''), NULLIF($3, ''))
	         ON CONFLICT (trade_id) DO UPDATE SET plan_followed = EXCLUDED.plan_followed, label = EXCLUDED.label`, tradeID, plan, label)
	for _, name := range tags {
		exec(t, `INSERT INTO trade_mistake (trade_id, mistake_id) SELECT $1, id FROM mistake WHERE name = $2`, tradeID, name)
	}
}

// judgeSample applies the judgements of the quickstart table: W yes; L1 yes and valid loss; L2 no, mistake, Chased entry.
func judgeSample(t *testing.T, s sample) {
	t.Helper()
	judge(t, s.w, "yes", "")
	judge(t, s.l1, "yes", "valid_loss")
	judge(t, s.l2, "no", "mistake", "Chased entry")
}

type dayRow struct {
	Day                                            string
	Trades                                         int
	Net                                            string
	Followed, Partly, NotFollowed, NotJudged, Tags int
	ValidLosses, Losses, Wins                      int
}

func dayStats(t *testing.T, acct, from, to string) []dayRow {
	t.Helper()
	rows, err := pool.Query(context.Background(), `
		SELECT trading_day::text, trades, coalesce(net_result::text, ''), followed, partly, not_followed, not_judged,
		       mistake_tags, valid_losses, losses, wins
		  FROM day_stats($1, $2::date, $3::date) ORDER BY trading_day`, acct, from, to)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var out []dayRow
	for rows.Next() {
		var r dayRow
		if err := rows.Scan(&r.Day, &r.Trades, &r.Net, &r.Followed, &r.Partly, &r.NotFollowed, &r.NotJudged, &r.Tags, &r.ValidLosses, &r.Losses, &r.Wins); err != nil {
			t.Fatal(err)
		}
		out = append(out, r)
	}
	return out
}

func periodStats(t *testing.T, acct, from, to string) dayRow {
	t.Helper()
	var r dayRow
	err := pool.QueryRow(context.Background(), `
		SELECT $2::text, trades, coalesce(net_result::text, ''), followed, partly, not_followed, not_judged,
		       mistake_tags, valid_losses, losses, wins
		  FROM period_stats($1, $2::date, $3::date)`, acct, from, to).
		Scan(&r.Day, &r.Trades, &r.Net, &r.Followed, &r.Partly, &r.NotFollowed, &r.NotJudged, &r.Tags, &r.ValidLosses, &r.Losses, &r.Wins)
	if err != nil {
		t.Fatal(err)
	}
	return r
}

func wantRow(t *testing.T, name string, got dayRow, want dayRow) {
	t.Helper()
	wantNum(t, name+" net", got.Net, want.Net)
	got.Net, want.Net = "", ""
	got.Day, want.Day = "", ""
	if got != want {
		t.Errorf("%s: got %+v, want %+v", name, got, want)
	}
}
