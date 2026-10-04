package tests

import (
	"context"
	"testing"
	"time"
)

// SC-008 on the API side: with 5,000 trades across 10 accounts, listing, filtering and saving each take well under a second.
func TestScale(t *testing.T) {
	reset(t)
	ctx := context.Background()
	for i := 0; i < 10; i++ {
		account(t, "Scale "+string(rune('A'+i)), "USD", "17:00")
	}
	if _, err := pool.Exec(ctx, `
		INSERT INTO trade (account_id, instrument, direction, size, entry_price, exit_price, entry_at, exit_at, dollars_per_point, cost, stop_price)
		SELECT a.id, 'NQ', CASE WHEN n % 2 = 0 THEN 'long' ELSE 'short' END, 1 + n % 3, 21000 + n % 50, 21000 + (n * 7) % 50,
		       TIMESTAMPTZ '2025-01-01 14:00+00' + (n * interval '37 minutes'),
		       TIMESTAMPTZ '2025-01-01 14:20+00' + (n * interval '37 minutes'), 20, 1.5, 20990
		  FROM generate_series(1, 5000) AS n
		  JOIN (SELECT id, row_number() OVER (ORDER BY name) - 1 AS k FROM account) a ON a.k = n % 10`); err != nil {
		t.Fatal(err)
	}
	var n int
	if err := pool.QueryRow(ctx, "SELECT count(*) FROM trade").Scan(&n); err != nil || n != 5000 {
		t.Fatalf("seeded %d trades (%v)", n, err)
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
	accts := call(t, "GET", "/accounts", nil)
	first := accts.list[0]["id"].(string)

	timed("list all 5,000 trades", func() {
		r := call(t, "GET", "/trades", nil)
		mustStatus(t, r, 200)
		if len(r.list) != 5000 {
			t.Errorf("%d trades", len(r.list))
		}
	})
	timed("filter by account and range", func() {
		r := call(t, "GET", "/trades?accountId="+first+"&from=2025-03-01&to=2025-04-30", nil)
		mustStatus(t, r, 200)
	})
	timed("save a trade", func() {
		in := tradeA(first)
		in["entryAt"], in["exitAt"] = "2025-10-01T09:41:00", "2025-10-01T09:58:00"
		mustStatus(t, call(t, "POST", "/trades", in), 201)
	})
	timed("preview", func() { mustStatus(t, call(t, "POST", "/trades/preview", tradeA(first)), 200) })
	timed("export", func() { mustStatus(t, call(t, "GET", "/export", nil), 200) })
}
