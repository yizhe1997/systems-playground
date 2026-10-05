package tests

import (
	"context"
	"testing"

	"github.com/shopspring/decimal"
)

// sql runs a one-value query and returns it as text, or "" for null.
func sql(t *testing.T, query string) string {
	t.Helper()
	var s *string
	if err := pool.QueryRow(context.Background(), "SELECT ("+query+")::text").Scan(&s); err != nil {
		t.Fatalf("%s: %v", query, err)
	}
	if s == nil {
		return ""
	}
	return *s
}

// wantNum compares as decimals: trailing zeros carry no meaning. "" means null.
func wantNum(t *testing.T, name, got, want string) {
	t.Helper()
	if want == "" {
		if got != "" {
			t.Errorf("%s = %s, want null", name, got)
		}
		return
	}
	if got == "" {
		t.Errorf("%s is null, want %s", name, want)
		return
	}
	g, w := decimal.RequireFromString(got), decimal.RequireFromString(want)
	if !g.Equal(w) {
		t.Errorf("%s = %s, want %s", name, got, want)
	}
}

func TestTradeFunctions(t *testing.T) {
	cases := []struct{ name, query, want string }{
		// gross: long and short, hand-worked
		{"long gross (trade A)", "trade_gross('long', 2, 21450.00, 21452.50, 20)", "100"},
		{"short gross (trade B)", "trade_gross('short', 1, 5300.00, 5298.00, 50)", "100"},
		{"short losing", "trade_gross('short', 1, 5300, 5305, 50)", "-250"},
		{"long losing", "trade_gross('long', 3, 100, 99.5, 10)", "-15"},
		{"gross needs dollars per point", "trade_gross('long', 2, 1, 2, NULL)", ""},
		// very large and very small
		{"very large", "trade_gross('long', 9999999999999999, 1, 2, 9999999999999999)", "99999999999999980000000000000001"},
		{"very small", "trade_gross('long', 0.00000001, 1.00000001, 1.00000002, 0.00000001)", "0.000000000000000000000001"},
		// net
		{"net with cost (trade A)", "trade_net(100, 4.60, NULL, 20)", "95.4"},
		{"net with cost (trade B)", "trade_net(100, 2.10, NULL, 50)", "97.9"},
		{"net without cost", "trade_net(100, 0, NULL, 20)", "100"},
		{"net is the typed result when dollars per point is missing", "trade_net(NULL, 4.60, -120, NULL)", "-120"},
		// risk
		{"risk (trade A)", "trade_risk(2, 21450.00, 21440.00, 20)", "400"},
		{"risk with the stop on the wrong side", "trade_risk(2, 21450.00, 21460.00, 20)", "400"},
		{"risk is null when stop equals entry", "trade_risk(2, 21450, 21450, 20)", ""},
		{"risk is null without a stop", "trade_risk(1, 5300, NULL, 50)", ""},
		{"risk is null without dollars per point", "trade_risk(2, 21450, 21440, NULL)", ""},
		// R
		{"R (trade A)", "trade_r(95.4, 400)", "0.2385"},
		{"R negative", "trade_r(-200, 400)", "-0.5"},
		{"R rounds to six places", "trade_r(1, 3)", "0.333333"},
		{"R is null without risk", "trade_r(97.9, NULL)", ""},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) { wantNum(t, c.name, sql(t, c.query), c.want) })
	}
}

func TestTradingDayFunction(t *testing.T) {
	cases := []struct{ name, query, want string }{
		{"17:30 exit, 17:00 start", "trading_day('2025-10-07 17:30-05'::timestamptz, 'America/Chicago', '17:00')", "2025-10-08"},
		{"16:59 exit, 17:00 start", "trading_day('2025-10-07 16:59-05'::timestamptz, 'America/Chicago', '17:00')", "2025-10-07"},
		{"exactly 17:00", "trading_day('2025-10-07 17:00-05'::timestamptz, 'America/Chicago', '17:00')", "2025-10-08"},
		{"no start", "trading_day('2025-10-07 17:30-05'::timestamptz, 'America/Chicago', NULL)", "2025-10-07"},
		{"late evening with no start", "trading_day('2025-10-07 23:59-05'::timestamptz, 'America/Chicago', NULL)", "2025-10-07"},
		{"start 00:01 moves almost everything", "trading_day('2025-10-07 00:00-05'::timestamptz, 'America/Chicago', '00:01')", "2025-10-07"},
		{"start 23:59", "trading_day('2025-10-07 23:58-05'::timestamptz, 'America/Chicago', '23:59')", "2025-10-07"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := sql(t, c.query); got != c.want {
				t.Errorf("got %s, want %s", got, c.want)
			}
		})
	}
}
