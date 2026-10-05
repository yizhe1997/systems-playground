package tests

import (
	"strings"
	"testing"
)

func TestCreateAccount(t *testing.T) {
	reset(t)
	r := call(t, "POST", "/accounts", map[string]any{"name": "Funded 50K", "currency": "USD", "tradingDayStart": "17:00"})
	mustStatus(t, r, 201)
	if r.str("name") != "Funded 50K" || r.str("currency") != "USD" || r.str("tradingDayStart") != "17:00" || r.str("archived") != "false" {
		t.Fatalf("unexpected account: %s", r.raw)
	}
	if r.str("id") == "" || r.str("updatedAt") == "" {
		t.Fatalf("missing id or updatedAt: %s", r.raw)
	}
	// no start time is allowed
	r = call(t, "POST", "/accounts", map[string]any{"name": "Cash", "currency": "EUR"})
	mustStatus(t, r, 201)
	if r.body["tradingDayStart"] != nil {
		t.Errorf("tradingDayStart should be null: %s", r.raw)
	}
}

func TestAccountNameIsUniqueIgnoringCaseAndSpaces(t *testing.T) {
	reset(t)
	account(t, "Funded 50K", "USD", "")
	for _, name := range []string{"funded 50k", "  Funded   50K ", "FUNDED 50K"} {
		r := call(t, "POST", "/accounts", map[string]any{"name": name, "currency": "USD"})
		mustStatus(t, r, 422)
		if got := r.fields()["name"]; got != "An account named Funded 50K already exists. Names are not case sensitive." {
			t.Errorf("%q: message %q", name, got)
		}
	}
}

func TestArchivedAccountKeepsItsName(t *testing.T) {
	reset(t)
	id := account(t, "Old", "USD", "")
	mustStatus(t, call(t, "POST", "/accounts/"+id+"/archive", nil), 200)
	r := call(t, "POST", "/accounts", map[string]any{"name": "old", "currency": "USD"})
	mustStatus(t, r, 422)
}

func TestAccountNameRules(t *testing.T) {
	reset(t)
	r := call(t, "POST", "/accounts", map[string]any{"name": "   ", "currency": "USD"})
	mustStatus(t, r, 422)
	if r.fields()["name"] != "Name is required." {
		t.Errorf("blank name: %s", r.raw)
	}
	r = call(t, "POST", "/accounts", map[string]any{"name": strings.Repeat("a", 81), "currency": "USD"})
	mustStatus(t, r, 422)
	mustStatus(t, call(t, "POST", "/accounts", map[string]any{"name": strings.Repeat("a", 80), "currency": "USD"}), 201)
	// runs of spaces collapse
	r = call(t, "POST", "/accounts", map[string]any{"name": "  two   words ", "currency": "USD"})
	mustStatus(t, r, 201)
	if r.str("name") != "two words" {
		t.Errorf("name not collapsed: %q", r.str("name"))
	}
}

func TestAccountCurrencyMustBeAllowed(t *testing.T) {
	reset(t)
	for _, c := range []string{"", "usd", "XXX", "US", "DOLLARS"} {
		r := call(t, "POST", "/accounts", map[string]any{"name": "A" + c, "currency": c})
		mustStatus(t, r, 422)
		if r.fields()["currency"] == "" {
			t.Errorf("%q: no currency error: %s", c, r.raw)
		}
	}
	mustStatus(t, call(t, "POST", "/accounts", map[string]any{"name": "Yen", "currency": "JPY"}), 201)
	r := call(t, "GET", "/currencies", nil)
	mustStatus(t, r, 200)
	if !strings.HasPrefix(string(r.raw), `["USD",`) {
		t.Errorf("USD should be first: %.40s", r.raw)
	}
}

func TestAccountDayStartRules(t *testing.T) {
	reset(t)
	r := call(t, "POST", "/accounts", map[string]any{"name": "A", "currency": "USD", "tradingDayStart": "00:00"})
	mustStatus(t, r, 422)
	if got := r.fields()["tradingDayStart"]; got != "Start time cannot be 00:00. Leave it empty to use the calendar date of each exit." {
		t.Errorf("message %q", got)
	}
	for _, bad := range []string{"24:00", "9:30", "17:60", "abc"} {
		r := call(t, "POST", "/accounts", map[string]any{"name": "B", "currency": "USD", "tradingDayStart": bad})
		mustStatus(t, r, 422)
	}
	for _, ok := range []string{"00:01", "23:59", "17:00"} {
		mustStatus(t, call(t, "POST", "/accounts", map[string]any{"name": "ok" + ok, "currency": "USD", "tradingDayStart": ok}), 201)
	}
}

func TestSettingsTimeZone(t *testing.T) {
	reset(t)
	r := call(t, "GET", "/settings", nil)
	mustStatus(t, r, 200)
	if r.str("timeZone") != "America/Chicago" {
		t.Fatalf("default zone: %s", r.raw)
	}
	mustStatus(t, call(t, "PUT", "/settings", map[string]any{"timeZone": "America/New_York"}), 200)
	for _, bad := range []string{"", "Nope/Zone", "Local"} {
		mustStatus(t, call(t, "PUT", "/settings", map[string]any{"timeZone": bad}), 422)
	}
	if call(t, "GET", "/settings", nil).str("timeZone") != "America/New_York" {
		t.Error("zone not kept")
	}
}
