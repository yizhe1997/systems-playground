package tests

import "testing"

// Scenario M: every account (archived marked) and every trade (deleted marked), money as strings.
func TestScenarioM(t *testing.T) {
	reset(t)
	a := account(t, "Funded 50K", "USD", "17:00")
	b := account(t, "Old", "EUR", "")
	live := exitTrade(t, a, "2025-10-01T09:00:00", "2025-10-01T09:30:00").str("id")
	gone := exitTrade(t, a, "2025-10-02T09:00:00", "2025-10-02T09:30:00").str("id")
	exitTrade(t, b, "2025-10-03T09:00:00", "2025-10-03T09:30:00")
	mustStatus(t, call(t, "DELETE", "/trades/"+gone, nil), 200)
	mustStatus(t, call(t, "POST", "/accounts/"+b+"/archive", nil), 200)

	r := call(t, "GET", "/export", nil)
	mustStatus(t, r, 200)
	accts := r.body["accounts"].([]any)
	trades := r.body["trades"].([]any)
	if len(accts) != 2 {
		t.Fatalf("%d accounts, want 2", len(accts))
	}
	if len(trades) != 3 {
		t.Fatalf("%d trades, want 3", len(trades))
	}
	archived := 0
	for _, x := range accts {
		if x.(map[string]any)["archived"] == true {
			archived++
		}
	}
	if archived != 1 {
		t.Errorf("%d archived accounts, want 1", archived)
	}
	deleted := map[string]bool{}
	for _, x := range trades {
		m := x.(map[string]any)
		deleted[m["id"].(string)] = m["deleted"].(bool)
		for _, k := range []string{"size", "entryPrice", "exitPrice", "cost", "netResult", "grossResult", "risk", "rMultiple"} {
			if _, ok := m[k].(string); !ok {
				t.Errorf("trade %v: %s is not a string: %v", m["id"], k, m[k])
			}
		}
		for _, k := range []string{"tradingDay", "exitAt", "entryAt", "instrument", "direction"} {
			if m[k] == nil || m[k] == "" {
				t.Errorf("trade %v: %s missing", m["id"], k)
			}
		}
	}
	if deleted[live] || !deleted[gone] {
		t.Errorf("deleted flags wrong: %v", deleted)
	}
	wantStr(t, "time zone", r.body["settings"].(map[string]any)["timeZone"].(string), "America/Chicago")
	if r.str("exportedAt") == "" {
		t.Error("no exportedAt")
	}
	// the count equals the list with Show deleted on: live + deleted
	l1 := call(t, "GET", "/trades", nil)
	l2 := call(t, "GET", "/trades?deleted=true", nil)
	if len(l1.list)+len(l2.list) != len(trades) {
		t.Errorf("list %d + deleted %d != export %d", len(l1.list), len(l2.list), len(trades))
	}
}
