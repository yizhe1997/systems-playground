package tests

import "testing"

func typedTrade(acct string) map[string]any {
	in := tradeA(acct)
	delete(in, "dollarsPerPoint")
	delete(in, "stopPrice")
	in["cost"] = "0"
	in["typedResult"] = "-120.00"
	return in
}

// Scenario C: no dollars per point, a typed result.
func TestScenarioC(t *testing.T) {
	reset(t)
	a := account(t, "A", "USD", "")
	r := trade(t, typedTrade(a))
	wantNum(t, "net", r.str("netResult"), "-120")
	wantNum(t, "gross", r.str("grossResult"), "")
	wantNum(t, "risk", r.str("risk"), "")
	wantNum(t, "R", r.str("rMultiple"), "")
	reasons := r.body["reasons"].(map[string]any)
	for _, k := range []string{"grossResult", "risk", "rMultiple"} {
		s, _ := reasons[k].(string)
		if !contains(s, "dollars per point") {
			t.Errorf("reason for %s is %q; it should name dollars per point", k, s)
		}
	}
	wantNum(t, "typedResult kept", r.str("typedResult"), "-120")
}

func contains(s, sub string) bool {
	for i := 0; i+len(sub) <= len(s); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}

func TestTypedResultRequiredWithoutDollarsPerPoint(t *testing.T) {
	reset(t)
	a := account(t, "A", "USD", "")
	in := typedTrade(a)
	delete(in, "typedResult")
	r := call(t, "POST", "/trades", in)
	mustStatus(t, r, 422)
	wantStr(t, "message", r.fields()["typedResult"], "Result is required while dollars per point is blank.")
	// a blank string counts as missing
	in["typedResult"], in["dollarsPerPoint"] = "", ""
	mustStatus(t, call(t, "POST", "/trades", in), 422)
}

func TestTypedResultIgnoredWhenDollarsPerPointPresent(t *testing.T) {
	reset(t)
	a := account(t, "A", "USD", "")
	in := tradeA(a)
	in["typedResult"] = "999.99"
	r := trade(t, in)
	wantNum(t, "net is computed", r.str("netResult"), "95.4")
	if r.body["typedResult"] != nil {
		t.Errorf("the typed result was kept: %s", r.raw)
	}
}

func TestAddingDollarsPerPointLaterComputesTheResult(t *testing.T) {
	reset(t)
	a := account(t, "A", "USD", "")
	tr := trade(t, typedTrade(a))
	in := tradeA(a)
	r := put(t, tr, in)
	mustStatus(t, r, 200)
	wantNum(t, "gross", r.str("grossResult"), "100")
	wantNum(t, "net", r.str("netResult"), "95.4")
}

func TestPreviewWithTypedResult(t *testing.T) {
	reset(t)
	a := account(t, "A", "USD", "")
	in := typedTrade(a)
	r := call(t, "POST", "/trades/preview", in)
	mustStatus(t, r, 200)
	wantNum(t, "net", r.str("netResult"), "-120")
	wantNum(t, "gross", r.str("grossResult"), "")
	if r.body["costs"] != nil {
		t.Errorf("costs should be null (not used): %s", r.raw)
	}
	reasons := r.body["reasons"].(map[string]any)
	wantStr(t, "costs reason", reasons["costs"].(string), "a typed result is already after costs")
	wantStr(t, "gross reason", reasons["grossResult"].(string), "needs prices, size and dollars per point")
}
