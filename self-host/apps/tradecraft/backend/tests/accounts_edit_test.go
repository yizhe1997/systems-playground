package tests

import "testing"

func putAccount(t *testing.T, before resp, in map[string]any) resp {
	t.Helper()
	in["expectedUpdatedAt"] = before.str("updatedAt")
	return call(t, "PUT", "/accounts/"+before.str("id"), in)
}

func getAccount(t *testing.T, id string) resp {
	t.Helper()
	r := call(t, "GET", "/accounts/"+id, nil)
	mustStatus(t, r, 200)
	return r
}

func TestRenameToExistingNameRefused(t *testing.T) {
	reset(t)
	account(t, "Funded 50K", "USD", "")
	b := getAccount(t, account(t, "Other", "USD", ""))
	r := putAccount(t, b, map[string]any{"name": "funded 50k", "currency": "USD"})
	mustStatus(t, r, 422)
	wantStr(t, "message", r.fields()["name"], "An account named Funded 50K already exists. Names are not case sensitive.")
	// the name of an archived account is also taken
	old := account(t, "Archived one", "USD", "")
	mustStatus(t, call(t, "POST", "/accounts/"+old+"/archive", nil), 200)
	r = putAccount(t, b, map[string]any{"name": "archived ONE", "currency": "USD"})
	mustStatus(t, r, 422)
	// renaming to its own name with different case is fine
	mustStatus(t, putAccount(t, b, map[string]any{"name": "OTHER", "currency": "USD"}), 200)
}

func TestChangingDayStartRecomputesTradingDays(t *testing.T) {
	reset(t)
	id := account(t, "A", "USD", "17:00")
	tr := exitTrade(t, id, "2025-10-07T17:00:00", "2025-10-07T17:30:00")
	wantStr(t, "before", tr.str("tradingDay"), "2025-10-08")
	r := putAccount(t, getAccount(t, id), map[string]any{"name": "A", "currency": "USD", "tradingDayStart": "18:00"})
	mustStatus(t, r, 200)
	wantStr(t, "after", call(t, "GET", "/trades/"+tr.str("id"), nil).str("tradingDay"), "2025-10-07")
}

func TestChangingCurrencyChangesNoNumber(t *testing.T) {
	reset(t)
	id := account(t, "A", "USD", "")
	tr := trade(t, tradeA(id))
	mustStatus(t, putAccount(t, getAccount(t, id), map[string]any{"name": "A", "currency": "EUR"}), 200)
	after := call(t, "GET", "/trades/"+tr.str("id"), nil)
	wantStr(t, "currency", after.str("currency"), "EUR")
	for _, k := range []string{"grossResult", "netResult", "risk", "rMultiple", "size", "entryPrice", "exitPrice", "cost"} {
		wantStr(t, k, after.str(k), tr.str(k))
	}
}

func TestArchiveAndRestore(t *testing.T) {
	reset(t)
	id := account(t, "A", "USD", "")
	trade(t, tradeA(id))
	other := account(t, "B", "USD", "")

	mustStatus(t, call(t, "POST", "/accounts/"+id+"/archive", nil), 200)
	l := call(t, "GET", "/accounts", nil)
	if len(l.list) != 1 || l.list[0]["id"] != other {
		t.Errorf("default list should hold only the active account: %s", l.raw)
	}
	l = call(t, "GET", "/accounts?includeArchived=true", nil)
	if len(l.list) != 2 {
		t.Errorf("includeArchived should show both: %s", l.raw)
	}
	if got := call(t, "GET", "/trades", nil); len(got.list) != 1 {
		t.Errorf("trades of an archived account stay in the list: %s", got.raw)
	}
	if got := call(t, "GET", "/export", nil); len(got.body["trades"].([]any)) != 1 {
		t.Errorf("trades of an archived account stay in the export")
	}
	r := call(t, "POST", "/accounts/"+id+"/restore", nil)
	mustStatus(t, r, 200)
	wantStr(t, "archived", r.str("archived"), "false")
	if l := call(t, "GET", "/accounts", nil); len(l.list) != 2 {
		t.Errorf("restore should bring it back: %s", l.raw)
	}
}

func TestNoEndpointDeletesAnAccount(t *testing.T) {
	reset(t)
	id := account(t, "A", "USD", "")
	r := call(t, "DELETE", "/accounts/"+id, nil)
	if r.status != 404 && r.status != 405 {
		t.Errorf("DELETE /accounts/{id} answered %d", r.status)
	}
	mustStatus(t, call(t, "GET", "/accounts/"+id, nil), 200)
}

func TestOutOfDateAccountEditIsRefused(t *testing.T) {
	reset(t)
	id := account(t, "A", "USD", "")
	old := getAccount(t, id)
	mustStatus(t, putAccount(t, old, map[string]any{"name": "A2", "currency": "USD"}), 200)
	r := putAccount(t, old, map[string]any{"name": "A3", "currency": "USD"})
	mustStatus(t, r, 409)
	wantStr(t, "message", r.str("message"), "This account was changed elsewhere. Reload to see the latest version.")
	wantStr(t, "kept", getAccount(t, id).str("name"), "A2")
}

func TestUnknownAccountIs404(t *testing.T) {
	reset(t)
	zero := "00000000-0000-0000-0000-000000000000"
	mustStatus(t, call(t, "GET", "/accounts/"+zero, nil), 404)
	mustStatus(t, call(t, "PUT", "/accounts/"+zero, map[string]any{"name": "x", "currency": "USD"}), 404)
	mustStatus(t, call(t, "POST", "/accounts/"+zero+"/archive", nil), 404)
	mustStatus(t, call(t, "POST", "/accounts/"+zero+"/restore", nil), 404)
}
