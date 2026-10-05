package tests

import (
	"reflect"
	"testing"
)

// put replaces a trade with in, carrying the version token of before.
func put(t *testing.T, before resp, in map[string]any) resp {
	t.Helper()
	in["expectedUpdatedAt"] = before.str("updatedAt")
	return call(t, "PUT", "/trades/"+before.str("id"), in)
}

func TestEditRecomputesEverything(t *testing.T) {
	reset(t)
	a := account(t, "Funded 50K", "USD", "17:00")
	tr := trade(t, tradeA(a))
	in := tradeA(a)
	in["exitPrice"] = "21460.00"         // gross (21460-21450)*2*20 = 400, net 395.4, R 0.9885
	in["exitAt"] = "2025-10-07T17:30:00" // lands on the next trading day
	r := put(t, tr, in)
	mustStatus(t, r, 200)
	wantNum(t, "gross", r.str("grossResult"), "400")
	wantNum(t, "net", r.str("netResult"), "395.4")
	wantNum(t, "R", r.str("rMultiple"), "0.9885")
	wantStr(t, "trading day", r.str("tradingDay"), "2025-10-08")
	if r.str("updatedAt") == tr.str("updatedAt") {
		t.Error("updatedAt did not move")
	}
}

func TestDeleteHidesAndRestoreReturnsEveryField(t *testing.T) {
	reset(t)
	a := account(t, "A", "USD", "17:00")
	in := tradeA(a)
	in["thesis"] = "Range break after the open."
	tr := trade(t, in)

	d := call(t, "DELETE", "/trades/"+tr.str("id"), nil)
	mustStatus(t, d, 200)
	wantStr(t, "deleted flag", d.str("deleted"), "true")
	if l := call(t, "GET", "/trades", nil); len(l.list) != 0 {
		t.Errorf("a deleted trade is in the list: %s", l.raw)
	}
	if l := call(t, "GET", "/trades?deleted=true", nil); len(l.list) != 1 {
		t.Errorf("the deleted list should show it: %s", l.raw)
	}
	rs := call(t, "POST", "/trades/"+tr.str("id")+"/restore", nil)
	mustStatus(t, rs, 200)

	// every field exactly as before, except the version token and the deleted flag
	strip := func(m map[string]any) map[string]any {
		c := map[string]any{}
		for k, v := range m {
			if k != "updatedAt" {
				c[k] = v
			}
		}
		return c
	}
	if !reflect.DeepEqual(strip(tr.body), strip(rs.body)) {
		t.Errorf("restore changed something:\nbefore %s\nafter  %s", tr.raw, rs.raw)
	}
}

func TestOutOfDateEditIsRefused(t *testing.T) {
	reset(t)
	a := account(t, "A", "USD", "")
	tr := trade(t, tradeA(a))
	first := tradeA(a)
	first["instrument"] = "ES"
	mustStatus(t, put(t, tr, first), 200)
	// a second save from the old copy
	second := tradeA(a)
	second["instrument"] = "YM"
	r := put(t, tr, second)
	mustStatus(t, r, 409)
	wantStr(t, "message", r.str("message"), "This trade was changed elsewhere. Reload to see the latest version.")
	if got := call(t, "GET", "/trades/"+tr.str("id"), nil).str("instrument"); got != "ES" {
		t.Errorf("the refused save changed the trade: %s", got)
	}
}

func TestMoveToAnotherAccount(t *testing.T) {
	reset(t)
	a := account(t, "A", "USD", "")
	b := account(t, "B", "USD", "17:00")
	old := account(t, "Old", "USD", "")
	in := tradeA(a)
	in["exitAt"] = "2025-10-07T17:30:00"
	tr := trade(t, in)
	wantStr(t, "before", tr.str("tradingDay"), "2025-10-07")

	// to an active account: the trading day follows the new account's start time
	in = tradeA(b)
	in["exitAt"] = "2025-10-07T17:30:00"
	r := put(t, tr, in)
	mustStatus(t, r, 200)
	wantStr(t, "after the move", r.str("tradingDay"), "2025-10-08")
	wantStr(t, "account name", r.str("accountName"), "B")

	// onto an archived account: refused
	mustStatus(t, call(t, "POST", "/accounts/"+old+"/archive", nil), 200)
	in = tradeA(old)
	in["exitAt"] = "2025-10-07T17:30:00"
	r = put(t, r, in)
	mustStatus(t, r, 422)
	if r.fields()["accountId"] == "" {
		t.Errorf("no account error: %s", r.raw)
	}
}

func TestTradeOfArchivedAccountStaysEditable(t *testing.T) {
	reset(t)
	a := account(t, "A", "USD", "")
	tr := trade(t, tradeA(a))
	mustStatus(t, call(t, "POST", "/accounts/"+a+"/archive", nil), 200)
	in := tradeA(a)
	in["instrument"] = "ES"
	r := put(t, tr, in)
	mustStatus(t, r, 200)
	mustStatus(t, call(t, "DELETE", "/trades/"+tr.str("id"), nil), 200)
	mustStatus(t, call(t, "POST", "/trades/"+tr.str("id")+"/restore", nil), 200)
}

func TestUnknownTradeIs404(t *testing.T) {
	reset(t)
	for _, c := range [][2]string{
		{"GET", "/trades/00000000-0000-0000-0000-000000000000"},
		{"DELETE", "/trades/00000000-0000-0000-0000-000000000000"},
		{"POST", "/trades/00000000-0000-0000-0000-000000000000/restore"},
		{"GET", "/trades/not-an-id"},
	} {
		mustStatus(t, call(t, c[0], c[1], nil), 404)
	}
}
