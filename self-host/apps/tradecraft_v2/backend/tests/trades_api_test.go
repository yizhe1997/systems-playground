package tests

import (
	"testing"
)

func wantStr(t *testing.T, name, got, want string) {
	t.Helper()
	if got != want {
		t.Errorf("%s = %q, want %q", name, got, want)
	}
}

// Scenario A: gross 100.00, net 95.40, risk 400.00, R 0.2385.
func TestScenarioA(t *testing.T) {
	reset(t)
	acct := account(t, "Funded 50K", "USD", "17:00")
	r := trade(t, tradeA(acct))
	wantNum(t, "grossResult", r.str("grossResult"), "100")
	wantNum(t, "netResult", r.str("netResult"), "95.4")
	wantNum(t, "risk", r.str("risk"), "400")
	wantNum(t, "rMultiple", r.str("rMultiple"), "0.2385")
	wantStr(t, "tradingDay", r.str("tradingDay"), "2025-10-07")
	wantStr(t, "accountName", r.str("accountName"), "Funded 50K")
	wantStr(t, "currency", r.str("currency"), "USD")
	wantStr(t, "entryAt", r.str("entryAt"), "2025-10-07T09:41:00-05:00")
	// the same trade comes back from the list and by id
	l := call(t, "GET", "/trades", nil)
	mustStatus(t, l, 200)
	if len(l.list) != 1 {
		t.Fatalf("list has %d trades", len(l.list))
	}
	mustStatus(t, call(t, "GET", "/trades/"+r.str("id"), nil), 200)
}

// Scenario B: no stop gives a null risk and R with the reason "no stop recorded".
func TestScenarioB(t *testing.T) {
	reset(t)
	acct := account(t, "Funded 50K", "USD", "17:00")
	r := trade(t, map[string]any{
		"accountId": acct, "instrument": "ES", "direction": "short", "size": "1",
		"entryPrice": "5300.00", "entryAt": "2025-10-07T10:00:00", "exitPrice": "5298.00", "exitAt": "2025-10-07T10:30:00",
		"dollarsPerPoint": "50", "cost": "2.10",
	})
	wantNum(t, "grossResult", r.str("grossResult"), "100")
	wantNum(t, "netResult", r.str("netResult"), "97.9")
	wantNum(t, "risk", r.str("risk"), "")
	wantNum(t, "rMultiple", r.str("rMultiple"), "")
	reasons := r.body["reasons"].(map[string]any)
	wantStr(t, "risk reason", reasons["risk"].(string), "no stop recorded")
	wantStr(t, "rMultiple reason", reasons["rMultiple"].(string), "no stop recorded")
}

func TestStopEqualsEntryGivesNullRiskWithReason(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "")
	in := tradeA(acct)
	in["stopPrice"] = "21450.00"
	r := trade(t, in)
	wantNum(t, "risk", r.str("risk"), "")
	wantStr(t, "reason", r.body["reasons"].(map[string]any)["risk"].(string), "stop equals entry")
}

// Scenario D: three errors, in the wording of the wireframes.
func TestScenarioD(t *testing.T) {
	reset(t)
	acct := account(t, "Funded 50K", "USD", "")
	in := tradeA(acct)
	in["size"] = "0"
	in["instrument"] = ""
	in["entryAt"] = "2025-10-07T10:00:00"
	in["exitAt"] = "2025-10-07T09:00:00"
	r := call(t, "POST", "/trades", in)
	mustStatus(t, r, 422)
	wantStr(t, "summary", r.str("message"), "3 things to fix before this trade can be saved.")
	f := r.fields()
	wantStr(t, "instrument", f["instrument"], "Instrument is required.")
	wantStr(t, "size", f["size"], "Size must be above zero.")
	wantStr(t, "exitAt", f["exitAt"], "Exit must not be earlier than the entry.")
	if len(f) != 3 {
		t.Errorf("want exactly three field errors: %s", r.raw)
	}
}

func TestOneThingToFixIsSingular(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "")
	in := tradeA(acct)
	in["instrument"] = ""
	r := call(t, "POST", "/trades", in)
	mustStatus(t, r, 422)
	wantStr(t, "summary", r.str("message"), "1 thing to fix before this trade can be saved.")
}

// Scenario F: a time in the future.
func TestScenarioF(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "")
	in := tradeA(acct)
	in["entryAt"] = "2025-11-01T09:00:00"
	in["exitAt"] = "2025-11-01T10:00:00"
	r := call(t, "POST", "/trades", in)
	mustStatus(t, r, 422)
	wantStr(t, "future", r.fields()["entryAt"], "Times cannot be in the future.")
}

// The clock is 2025-10-15 12:00 UTC. A minute of slack is allowed; two minutes is not.
func TestFutureSlackIsOneMinute(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "")
	in := tradeA(acct)
	in["entryAt"] = "2025-10-15T11:00:00Z"
	in["exitAt"] = "2025-10-15T12:01:00Z"
	trade(t, in)
	in["exitAt"] = "2025-10-15T12:02:00Z"
	r := call(t, "POST", "/trades", in)
	mustStatus(t, r, 422)
	wantStr(t, "exit", r.fields()["exitAt"], "Times cannot be in the future.")
}

func TestNoAccount(t *testing.T) {
	reset(t)
	in := tradeA("")
	r := call(t, "POST", "/trades", in)
	mustStatus(t, r, 422)
	wantStr(t, "account", r.fields()["accountId"], "Choose an account.")
	in = tradeA("00000000-0000-0000-0000-000000000000")
	r = call(t, "POST", "/trades", in)
	mustStatus(t, r, 422)
	wantStr(t, "unknown account", r.fields()["accountId"], "Choose an account.")
}

func TestNumberRules(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "")
	cases := []struct{ field, value, want string }{
		{"cost", "-1", "Costs cannot be negative."},
		{"entryPrice", "0", "Entry price must be above zero."},
		{"exitPrice", "-5", "Exit price must be above zero."},
		{"dollarsPerPoint", "0", "Dollars per point must be above zero."},
		{"stopPrice", "0", "Stop price must be above zero."},
		{"size", "-2", "Size must be above zero."},
		{"size", "1.123456789", "At most 8 decimal places."},
		{"size", "1,5", "Enter a number with a point for decimals, for example 21450.25."},
		{"size", "abc", "Enter a number with a point for decimals, for example 21450.25."},
		{"size", "1e3", "Enter a number with a point for decimals, for example 21450.25."},
		{"entryPrice", "21450.", "Enter a number with a point for decimals, for example 21450.25."},
		{"size", "12345678901234567", "That number is too large."},
	}
	for _, c := range cases {
		in := tradeA(acct)
		in[c.field] = c.value
		r := call(t, "POST", "/trades", in)
		if r.status != 422 {
			t.Errorf("%s=%s: status %d: %s", c.field, c.value, r.status, r.raw)
			continue
		}
		wantStr(t, c.field+"="+c.value, r.fields()[c.field], c.want)
	}
	// eight places are fine
	in := tradeA(acct)
	in["size"] = "1.12345678"
	trade(t, in)
}

func TestNewTradeOnArchivedAccountRefused(t *testing.T) {
	reset(t)
	acct := account(t, "Old", "USD", "")
	mustStatus(t, call(t, "POST", "/accounts/"+acct+"/archive", nil), 200)
	r := call(t, "POST", "/trades", tradeA(acct))
	mustStatus(t, r, 422)
	if r.fields()["accountId"] == "" {
		t.Errorf("no account error: %s", r.raw)
	}
}

func TestThesisAndInstrumentLimits(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "")
	in := tradeA(acct)
	long := make([]byte, 5001)
	for i := range long {
		long[i] = 'x'
	}
	in["thesis"] = string(long)
	mustStatus(t, call(t, "POST", "/trades", in), 422)
	in["thesis"] = string(long[:5000])
	trade(t, in)
	in = tradeA(acct)
	in["instrument"] = string(long[:41])
	mustStatus(t, call(t, "POST", "/trades", in), 422)
}

// Scenario E: the preview gives the figures of A and saves nothing.
func TestScenarioE(t *testing.T) {
	reset(t)
	acct := account(t, "Funded 50K", "USD", "17:00")
	in := tradeA(acct)
	r := call(t, "POST", "/trades/preview", in)
	mustStatus(t, r, 200)
	wantNum(t, "gross", r.str("grossResult"), "100")
	wantNum(t, "costs", r.str("costs"), "4.6")
	wantNum(t, "net", r.str("netResult"), "95.4")
	wantNum(t, "risk", r.str("risk"), "400")
	wantNum(t, "R", r.str("rMultiple"), "0.2385")
	wantStr(t, "tradingDay", r.str("tradingDay"), "2025-10-07")
	if l := call(t, "GET", "/trades", nil); len(l.list) != 0 {
		t.Errorf("the preview saved something: %s", l.raw)
	}
}

// An empty and a half-filled form answer 200 with every figure null and a reason, never 422.
func TestPreviewNeverRefuses(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "")
	for name, in := range map[string]map[string]any{
		"empty":        {},
		"half":         {"direction": "long", "size": "2", "entryPrice": "21450"},
		"garbage":      {"size": "abc", "entryPrice": "1,5", "exitAt": "yesterday", "accountId": "nope"},
		"zero size":    {"accountId": acct, "direction": "long", "size": "0", "entryPrice": "1", "exitPrice": "2", "dollarsPerPoint": "20"},
		"nulls":        {"size": nil, "direction": nil},
		"unknown zone": {"exitAt": "2025-03-09T02:30:00"},
	} {
		r := call(t, "POST", "/trades/preview", in)
		if r.status != 200 {
			t.Errorf("%s: status %d: %s", name, r.status, r.raw)
		}
	}
	r := call(t, "POST", "/trades/preview", map[string]any{})
	for _, k := range []string{"grossResult", "costs", "netResult", "risk", "rMultiple", "tradingDay"} {
		if r.body[k] != nil {
			t.Errorf("empty preview: %s = %v, want null", k, r.body[k])
		}
	}
	reasons := r.body["reasons"].(map[string]any)
	for _, k := range []string{"grossResult", "netResult", "risk", "rMultiple", "tradingDay"} {
		if s, _ := reasons[k].(string); s == "" {
			t.Errorf("empty preview: no reason for %s: %s", k, r.raw)
		}
	}
	wantStr(t, "gross reason", reasons["grossResult"].(string), "needs prices, size and dollars per point")
	wantStr(t, "R reason", reasons["rMultiple"].(string), "needs a net result and a risk")
	wantStr(t, "day reason", reasons["tradingDay"].(string), "needs an exit time")

	// half filled: still no figures, plain reasons
	r = call(t, "POST", "/trades/preview", map[string]any{"direction": "long", "size": "2", "entryPrice": "21450", "accountId": acct})
	if r.body["grossResult"] != nil {
		t.Errorf("half form has a gross: %s", r.raw)
	}
	// garbage is "not a number"
	r = call(t, "POST", "/trades/preview", map[string]any{"size": "abc"})
	wantStr(t, "not a number", r.body["reasons"].(map[string]any)["grossResult"].(string), "not a number")
	// no account yet
	r = call(t, "POST", "/trades/preview", map[string]any{"exitAt": "2025-10-07T09:58:00"})
	wantStr(t, "needs an account", r.body["reasons"].(map[string]any)["tradingDay"].(string), "needs an account")
}

// The time field takes the style the screens show as well as ISO.
func TestTimeInScreenStyle(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "17:00")
	in := tradeA(acct)
	in["entryAt"], in["exitAt"] = "Wed 1 Oct 2025 09:41", "Wed 1 Oct 2025 17:30"
	r := trade(t, in)
	wantStr(t, "entryAt", r.str("entryAt"), "2025-10-01T09:41:00-05:00")
	wantStr(t, "trading day", r.str("tradingDay"), "2025-10-02")
	in["exitAt"] = "Thu 1 Oct 2025 17:30"
	r = call(t, "POST", "/trades", in)
	mustStatus(t, r, 422)
	wantStr(t, "weekday", r.fields()["exitAt"], "That weekday does not match the date.")
}
