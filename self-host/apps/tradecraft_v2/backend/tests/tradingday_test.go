package tests

import "testing"

// exitTrade logs trade A shape with the given exit (journal time) and returns the answer.
func exitTrade(t *testing.T, acct, entry, exit string) resp {
	t.Helper()
	in := tradeA(acct)
	in["entryAt"], in["exitAt"] = entry, exit
	return trade(t, in)
}

// Account day start 17:00, journal zone America/Chicago (CDT, UTC-5, in October).
func TestScenariosG1toG4(t *testing.T) {
	reset(t)
	acct := account(t, "Funded 50K", "USD", "17:00")
	g1 := exitTrade(t, acct, "2025-10-07T17:00:00", "2025-10-07T17:30:00")
	wantStr(t, "G1 17:30", g1.str("tradingDay"), "2025-10-08")
	g2 := exitTrade(t, acct, "2025-10-07T16:00:00", "2025-10-07T16:59:00")
	wantStr(t, "G2 16:59", g2.str("tradingDay"), "2025-10-07")
	g3 := exitTrade(t, acct, "2025-10-07T16:30:00", "2025-10-07T17:00:00")
	wantStr(t, "G3 exactly 17:00", g3.str("tradingDay"), "2025-10-08")

	// G4: clear the day start; every trade of the account is recomputed
	a := call(t, "GET", "/accounts/"+acct, nil)
	r := call(t, "PUT", "/accounts/"+acct, map[string]any{"name": "Funded 50K", "currency": "USD", "tradingDayStart": nil, "expectedUpdatedAt": a.str("updatedAt")})
	mustStatus(t, r, 200)
	for name, id := range map[string]string{"G1": g1.str("id"), "G2": g2.str("id"), "G3": g3.str("id")} {
		wantStr(t, name+" after clearing", call(t, "GET", "/trades/"+id, nil).str("tradingDay"), "2025-10-07")
	}
	g4 := exitTrade(t, acct, "2025-10-07T17:00:00", "2025-10-07T17:30:00")
	wantStr(t, "G4 no start", g4.str("tradingDay"), "2025-10-07")
}

func TestScenarioG5JustAfterClocksGoForward(t *testing.T) {
	reset(t)
	acct := account(t, "Funded 50K", "USD", "17:00")
	r := exitTrade(t, acct, "2025-03-09T03:10:00", "2025-03-09T03:30:00")
	wantStr(t, "G5", r.str("tradingDay"), "2025-03-09")
}

func TestScenarioG6NonexistentTime(t *testing.T) {
	reset(t)
	acct := account(t, "Funded 50K", "USD", "17:00")
	in := tradeA(acct)
	in["entryAt"], in["exitAt"] = "2025-03-09T01:30:00", "2025-03-09T02:30:00"
	r := call(t, "POST", "/trades", in)
	mustStatus(t, r, 422)
	wantStr(t, "G6", r.fields()["exitAt"], "That time does not exist on that date in this time zone.")
	// the preview does not refuse, it says why there is no day
	p := call(t, "POST", "/trades/preview", in)
	mustStatus(t, p, 200)
	wantStr(t, "preview reason", p.body["reasons"].(map[string]any)["tradingDay"].(string), "That time does not exist on that date in this time zone.")
}

// G7: changing the journal zone moves the trading day but never the instant.
func TestScenarioG7ZoneChange(t *testing.T) {
	reset(t)
	acct := account(t, "Funded 50K", "USD", "17:00")
	r := exitTrade(t, acct, "2025-10-07T16:00:00", "2025-10-07T16:30:00") // Chicago
	id := r.str("id")
	wantStr(t, "before", r.str("tradingDay"), "2025-10-07")
	instantBefore := sql(t, "(SELECT exit_at FROM trade WHERE id = '"+id+"')")

	mustStatus(t, call(t, "PUT", "/settings", map[string]any{"timeZone": "America/New_York"}), 200)
	after := call(t, "GET", "/trades/"+id, nil)
	wantStr(t, "after", after.str("tradingDay"), "2025-10-08") // 17:30 New York
	if got := sql(t, "(SELECT exit_at FROM trade WHERE id = '"+id+"')"); got != instantBefore {
		t.Errorf("the instant moved: %s -> %s", instantBefore, got)
	}
	wantStr(t, "exit shown in the new zone", after.str("exitAt"), "2025-10-07T17:30:00-04:00")
}

// A trade of an archived account and a deleted trade are recomputed too.
func TestRecomputeCoversArchivedAndDeleted(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "17:00")
	live := exitTrade(t, acct, "2025-10-07T16:00:00", "2025-10-07T16:30:00")
	gone := exitTrade(t, acct, "2025-10-07T16:00:00", "2025-10-07T16:40:00")
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
