package tests

import (
	"net/url"
	"testing"
)

func ids(r resp) []string {
	var out []string
	for _, t := range r.list {
		out = append(out, t["id"].(string))
	}
	return out
}

func sameIDs(t *testing.T, name string, got []string, want ...string) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("%s: got %d trades %v, want %d %v", name, len(got), got, len(want), want)
	}
	for i := range got {
		if got[i] != want[i] {
			t.Fatalf("%s: position %d is %s, want %s (all: %v)", name, i, got[i], want[i], got)
		}
	}
}

func TestListFiltersAndOrder(t *testing.T) {
	reset(t)
	a := account(t, "Funded 50K", "USD", "")
	b := account(t, "Euro", "EUR", "")
	t1 := exitTrade(t, a, "2025-10-01T09:00:00", "2025-10-01T09:30:00").str("id")
	t2 := exitTrade(t, a, "2025-10-02T09:00:00", "2025-10-02T09:30:00").str("id")
	t3 := exitTrade(t, b, "2025-10-03T09:00:00", "2025-10-03T09:30:00").str("id")
	t4 := exitTrade(t, a, "2025-10-05T09:00:00", "2025-10-05T09:30:00").str("id")

	get := func(q url.Values) resp {
		r := call(t, "GET", "/trades?"+q.Encode(), nil)
		mustStatus(t, r, 200)
		return r
	}
	// newest exit first
	sameIDs(t, "all", ids(get(url.Values{})), t4, t3, t2, t1)
	// by account
	sameIDs(t, "account a", ids(get(url.Values{"accountId": {a}})), t4, t2, t1)
	sameIDs(t, "account b", ids(get(url.Values{"accountId": {b}})), t3)
	// trading-day range is inclusive at both ends
	sameIDs(t, "range", ids(get(url.Values{"from": {"2025-10-02"}, "to": {"2025-10-03"}})), t3, t2)
	sameIDs(t, "from only", ids(get(url.Values{"from": {"2025-10-03"}})), t4, t3)
	sameIDs(t, "to only", ids(get(url.Values{"to": {"2025-10-01"}})), t1)
	// account and range together
	sameIDs(t, "both", ids(get(url.Values{"accountId": {a}, "from": {"2025-10-02"}, "to": {"2025-10-05"}})), t4, t2)
	// nothing matches
	sameIDs(t, "none", ids(get(url.Values{"from": {"2025-12-01"}})))
}

func TestListTieBreakIsStable(t *testing.T) {
	reset(t)
	a := account(t, "A", "USD", "")
	var created []string
	for range 4 { // identical exit times
		created = append(created, exitTrade(t, a, "2025-10-01T09:00:00", "2025-10-01T09:30:00").str("id"))
	}
	first := ids(call(t, "GET", "/trades", nil))
	for range 3 {
		sameIDs(t, "repeat", ids(call(t, "GET", "/trades", nil)), first...)
	}
	// the tie-break is id, descending
	for i := 1; i < len(first); i++ {
		if first[i-1] < first[i] {
			t.Errorf("tie-break is not id descending: %v", first)
		}
	}
	_ = created
}

func TestListRejectsABadRange(t *testing.T) {
	reset(t)
	r := call(t, "GET", "/trades?from=2025-10-05&to=2025-10-01", nil)
	mustStatus(t, r, 422)
	if r.fields()["to"] == "" {
		t.Errorf("no field error: %s", r.raw)
	}
	mustStatus(t, call(t, "GET", "/trades?from=yesterday", nil), 422)
	mustStatus(t, call(t, "GET", "/trades?accountId=nope", nil), 422)
}

// Two currencies are never added together: the API returns no totals at all.
func TestListHasNoTotals(t *testing.T) {
	reset(t)
	a := account(t, "A", "USD", "")
	b := account(t, "B", "EUR", "")
	exitTrade(t, a, "2025-10-01T09:00:00", "2025-10-01T09:30:00")
	exitTrade(t, b, "2025-10-01T09:00:00", "2025-10-01T09:30:00")
	r := call(t, "GET", "/trades", nil)
	if r.list == nil {
		t.Fatalf("the list must be a bare array: %s", r.raw)
	}
	if currencies := map[any]bool{r.list[0]["currency"]: true, r.list[1]["currency"]: true}; len(currencies) != 2 {
		t.Errorf("each trade carries its own currency: %s", r.raw)
	}
}

func TestListShowsArchivedAccountsTrades(t *testing.T) {
	reset(t)
	a := account(t, "A", "USD", "")
	id := exitTrade(t, a, "2025-10-01T09:00:00", "2025-10-01T09:30:00").str("id")
	mustStatus(t, call(t, "POST", "/accounts/"+a+"/archive", nil), 200)
	sameIDs(t, "archived account", ids(call(t, "GET", "/trades", nil)), id)
}
