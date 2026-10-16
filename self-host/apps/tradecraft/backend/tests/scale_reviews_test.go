package tests

import (
	"context"
	"testing"
	"time"
)

// SC-008 for feature 001: with 5,000 trades over 10 accounts, half of them judged and tagged, a year of daily reviews and
// a year of focuses, every read and write of the review screens takes well under a second.
func TestScaleReviews(t *testing.T) {
	reset(t)
	ctx := context.Background()
	for i := 0; i < 10; i++ {
		account(t, "Scale "+string(rune('A'+i)), "USD", "17:00")
	}
	seed := []string{
		`INSERT INTO trade (account_id, instrument, direction, size, entry_price, exit_price, entry_at, exit_at, dollars_per_point, cost, stop_price)
		 SELECT a.id, 'NQ', CASE WHEN n % 2 = 0 THEN 'long' ELSE 'short' END, 1 + n % 3, 21000 + n % 50, 21000 + (n * 7) % 50,
		        TIMESTAMPTZ '2025-01-01 14:00+00' + (n * interval '37 minutes'),
		        TIMESTAMPTZ '2025-01-01 14:20+00' + (n * interval '37 minutes'), 20, 1.5, 20990
		   FROM generate_series(1, 5000) AS n
		   JOIN (SELECT id, row_number() OVER (ORDER BY name) - 1 AS k FROM account) a ON a.k = n % 10`,
		// half of the trades judged; every fourth labelled a mistake and tagged
		`INSERT INTO trade_judgement (trade_id, plan_followed, label)
		 SELECT id, (ARRAY['yes','partly','no'])[1 + (row_number() OVER (ORDER BY id) % 3)::int],
		        CASE WHEN row_number() OVER (ORDER BY id) % 4 = 0 THEN 'mistake' END
		   FROM trade WHERE (hashtext(id::text) % 2) = 0`,
		`INSERT INTO trade_mistake (trade_id, mistake_id)
		 SELECT j.trade_id, (SELECT id FROM mistake ORDER BY name LIMIT 1 OFFSET (hashtext(j.trade_id::text) & 3)) FROM trade_judgement j WHERE j.label = 'mistake'`,
		// a year of daily reviews for every account, a year of week focuses
		`INSERT INTO daily_review (account_id, trading_day, did_well, could_improve, next_focus, mental_grade, technical_grade, reviewed_at)
		 SELECT a.id, d::date, 'ok', 'size', 'patience', 3, 4, now() FROM account a, generate_series(DATE '2025-01-01', DATE '2025-12-31', interval '1 day') d`,
		`INSERT INTO focus (period, period_start, body)
		 SELECT 'week', d::date, 'one thing' FROM generate_series(DATE '2024-12-30', DATE '2025-12-22', interval '7 days') d`,
	}
	for _, q := range seed {
		if _, err := pool.Exec(ctx, q); err != nil {
			t.Fatal(err)
		}
	}
	timed := func(name string, f func()) {
		t.Helper()
		start := time.Now()
		f()
		d := time.Since(start)
		t.Logf("%s: %v", name, d)
		if d > time.Second {
			t.Errorf("%s took %v, want under 1s", name, d)
		}
	}
	first := call(t, "GET", "/accounts", nil).list[0]["id"].(string)
	var busy string
	if err := pool.QueryRow(ctx, `SELECT trading_day::text FROM trade WHERE account_id = $1 GROUP BY trading_day ORDER BY count(*) DESC, trading_day LIMIT 1`, first).Scan(&busy); err != nil {
		t.Fatal(err)
	}

	timed("Reviews: a month", func() { mustStatus(t, call(t, "GET", "/reviews?accountId="+first+"&month=2025-03", nil), 200) })
	timed("Reviews: the calendar", func() { mustStatus(t, call(t, "GET", "/reviews/calendar?accountId="+first+"&month=2025-03", nil), 200) })
	timed("a busy day", func() { mustStatus(t, call(t, "GET", "/reviews/day?accountId="+first+"&date="+busy, nil), 200) })
	timed("a week", func() { mustStatus(t, call(t, "GET", "/weekly?accountId="+first+"&date="+busy, nil), 200) })
	timed("the counter, week", func() { mustStatus(t, call(t, "GET", "/mistakes/counter?period=week&date="+busy, nil), 200) })
	timed("the counter, month", func() { mustStatus(t, call(t, "GET", "/mistakes/counter?period=month&date="+busy, nil), 200) })
	timed("save a review", func() {
		mustStatus(t, call(t, "PUT", "/reviews/day", map[string]any{"accountId": first, "date": busy, "didWell": "x"}), 409) // an existing review needs its token
		d := getDay(t, first, busy)
		mustStatus(t, saveDay(t, map[string]any{"accountId": first, "date": busy, "didWell": "x", "expectedUpdatedAt": d.body["updatedAt"]}), 200)
	})
	timed("save a judgement", func() {
		d := getDay(t, first, busy)
		id := d.body["trades"].([]any)[0].(map[string]any)["id"].(string)
		j := getJudgement(t, id)
		in := map[string]any{"planFollowed": "yes"}
		if j.body["updatedAt"] != nil {
			in["expectedUpdatedAt"] = j.body["updatedAt"]
		}
		mustStatus(t, putJudgement(t, id, in), 200)
	})
	timed("save a focus", func() {
		g := call(t, "GET", "/focus?period=week&date="+busy, nil)
		mustStatus(t, putFocus(t, "week", busy, "changed", g.body["updatedAt"]), 200)
	})
	timed("export", func() { mustStatus(t, call(t, "GET", "/export", nil), 200) })
}
