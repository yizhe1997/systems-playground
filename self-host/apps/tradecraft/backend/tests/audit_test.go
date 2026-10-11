package tests

import (
	"context"
	"encoding/json"
	"io"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func lastEntry(t *testing.T) auditRow {
	t.Helper()
	rows := auditRows(t)
	if len(rows) == 0 {
		t.Fatal("no audit entries")
	}
	return rows[len(rows)-1]
}

func fieldsOf(e auditRow) string { return strings.Join(e.Fields, ",") }

func TestEachRecordedActionWritesOneEntry(t *testing.T) {
	reset(t)
	acct := account(t, "Funded 50K", "USD", "")
	tr := trade(t, tradeA(acct))
	id := tr.str("id")

	// trade deleted and restored: named by instrument, direction and exit time, never by an amount
	mustStatus(t, call(t, "DELETE", "/trades/"+id, nil), 200)
	e := lastEntry(t)
	if e.Kind != "trade_deleted" || e.Subject != "NQ long trade of Tue 7 Oct 09:58" || e.Email != testOwner || e.Actor != "owner" || fieldsOf(e) != "status" {
		t.Fatalf("trade deleted: %+v", e)
	}
	n := len(auditRows(t))
	mustStatus(t, call(t, "DELETE", "/trades/"+id, nil), 200) // a repeat changes nothing, so records nothing
	if len(auditRows(t)) != n {
		t.Fatal("a repeated delete was recorded")
	}
	mustStatus(t, call(t, "POST", "/trades/"+id+"/restore", nil), 200)
	if e = lastEntry(t); e.Kind != "trade_restored" || e.Subject != "NQ long trade of Tue 7 Oct 09:58" {
		t.Fatalf("trade restored: %+v", e)
	}
	mustStatus(t, call(t, "POST", "/trades/"+id+"/restore", nil), 200)
	if len(auditRows(t)) != n+1 {
		t.Fatal("a repeated restore was recorded")
	}

	// account archived and restored
	mustStatus(t, call(t, "POST", "/accounts/"+acct+"/archive", nil), 200)
	if e = lastEntry(t); e.Kind != "account_archived" || e.Subject != "Funded 50K" || fieldsOf(e) != "status" {
		t.Fatalf("account archived: %+v", e)
	}
	mustStatus(t, call(t, "POST", "/accounts/"+acct+"/restore", nil), 200)
	if e = lastEntry(t); e.Kind != "account_restored" {
		t.Fatalf("account restored: %+v", e)
	}

	// settings changed: only when the zone actually changes
	n = len(auditRows(t))
	mustStatus(t, call(t, "PUT", "/settings", map[string]any{"timeZone": "America/Chicago"}), 200)
	if len(auditRows(t)) != n {
		t.Fatal("saving the same zone was recorded")
	}
	mustStatus(t, call(t, "PUT", "/settings", map[string]any{"timeZone": "Asia/Tokyo"}), 200)
	if e = lastEntry(t); e.Kind != "settings_changed" || e.Subject != "Journal settings" || fieldsOf(e) != "time zone" {
		t.Fatalf("settings changed: %+v", e)
	}
	mustStatus(t, call(t, "PUT", "/settings", map[string]any{"timeZone": "Not/AZone"}), 422)
	if lastEntry(t).Kind != "settings_changed" || len(auditRows(t)) != n+1 {
		t.Fatal("a refused settings change was recorded")
	}

	// mistake retired and restored
	m := call(t, "POST", "/mistakes", map[string]any{"name": "Audit test mistake"})
	mustStatus(t, m, 201)
	mid := m.str("id")
	n = len(auditRows(t))
	mustStatus(t, call(t, "POST", "/mistakes/"+mid+"/retire", nil), 200)
	if e = lastEntry(t); e.Kind != "mistake_retired" || e.Subject != "Audit test mistake" || fieldsOf(e) != "status" {
		t.Fatalf("mistake retired: %+v", e)
	}
	mustStatus(t, call(t, "POST", "/mistakes/"+mid+"/restore", nil), 200)
	if e = lastEntry(t); e.Kind != "mistake_restored" {
		t.Fatalf("mistake restored: %+v", e)
	}
	if len(auditRows(t)) != n+2 {
		t.Fatal("creating a mistake or a repeat wrote entries it should not")
	}

	// export downloaded; the document carries identities (never the provider subject) and the entries
	n = len(auditRows(t))
	signIn(t, testOwner, "never-exported-sub-777", true)
	ex := call(t, "GET", "/export", nil)
	mustStatus(t, ex, 200)
	if strings.Contains(string(ex.raw), "never-exported-sub-777") || strings.Contains(string(ex.raw), "provider_sub") || strings.Contains(string(ex.raw), "providerSub") {
		t.Fatal("the export holds the provider's account identifier")
	}
	ids, _ := ex.body["identities"].([]any)
	entries, _ := ex.body["auditEntries"].([]any)
	if len(ids) != 1 || len(entries) < n {
		t.Fatalf("identities %d, entries %d", len(ids), len(entries))
	}
	kinds := auditKindsOf(t)
	if kinds[len(kinds)-1] != "export_downloaded" {
		t.Fatalf("last entry %v", kinds[len(kinds)-1])
	}
}

func TestEntriesHoldNoFigureNoteOrReviewText(t *testing.T) {
	reset(t)
	acct := account(t, "Quiet account", "USD", "")
	in := tradeA(acct)
	in["thesis"] = "Private thesis about 21450 breakout"
	in["typedResult"] = "95.40"
	id := trade(t, in).str("id")
	call(t, "DELETE", "/trades/"+id, nil)
	call(t, "POST", "/trades/"+id+"/restore", nil)
	for _, e := range auditRows(t) {
		blob := e.Subject + " " + strings.Join(e.Fields, " ")
		for _, banned := range []string{"21450", "21452", "95.40", "100.00", "Private", "thesis", "400.00"} {
			if strings.Contains(blob, banned) {
				t.Errorf("entry %s holds %q: %s", e.Kind, banned, blob)
			}
		}
	}
}

type entryJSON struct {
	ID            string   `json:"id"`
	At            string   `json:"at"`
	ActorKind     string   `json:"actorKind"`
	IdentityEmail *string  `json:"identityEmail"`
	Kind          string   `json:"kind"`
	KindLabel     string   `json:"kindLabel"`
	Subject       string   `json:"subject"`
	ChangedFields []string `json:"changedFields"`
}

// auditList reads /audit and returns the entries, the X-Total-Count header and the status.
func auditList(t *testing.T, query string) (int, string, []entryJSON) {
	t.Helper()
	req := httptest.NewRequest("GET", "/audit?"+query, nil)
	req.Header.Set("Authorization", "Bearer "+ownerToken())
	res, err := app.Test(req, -1)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(res.Body)
	var out []entryJSON
	_ = json.Unmarshal(raw, &out)
	return res.StatusCode, res.Header.Get("X-Total-Count"), out
}

func TestSubjectsAreTextAndMomentsDoNotMove(t *testing.T) {
	reset(t)
	acct := account(t, "Before rename", "USD", "")
	mustStatus(t, call(t, "POST", "/accounts/"+acct+"/archive", nil), 200)
	// the thing is renamed later; the entry still reads as it was written (the subject is text, not a link)
	r := call(t, "GET", "/accounts/"+acct, nil)
	mustStatus(t, r, 200)
	mustStatus(t, call(t, "PUT", "/accounts/"+acct, map[string]any{"name": "After rename", "currency": "USD", "expectedUpdatedAt": r.str("updatedAt")}), 200)
	_, _, before := auditList(t, "")
	if len(before) != 1 || before[0].Subject != "Before rename" {
		t.Fatalf("%+v", before)
	}
	// changing the journal zone changes only how the moment is shown, never the moment itself
	mustStatus(t, call(t, "PUT", "/settings", map[string]any{"timeZone": "Pacific/Auckland"}), 200)
	_, _, after := auditList(t, "")
	var archived entryJSON
	for _, e := range after {
		if e.Kind == "account_archived" {
			archived = e
		}
	}
	if archived.At != before[0].At {
		t.Fatalf("the moment moved: %s vs %s", archived.At, before[0].At)
	}
}

func TestAuditListFiltersPagesAndTimes(t *testing.T) {
	reset(t)
	ctx := context.Background()
	// 10,000 entries over three kinds, two identities and a few weeks, plus entries with no identity (SC-006)
	other := addIdentitySQL(t, "second@example.com", false)
	if _, err := pool.Exec(ctx, `
		INSERT INTO audit_entry (at, actor_kind, identity_id, kind, subject, changed_fields)
		SELECT timestamptz '2025-10-15 12:00:00+00' - (g || ' minutes')::interval, 'owner',
		       CASE WHEN g % 2 = 0 THEN (SELECT id FROM identity WHERE email = $1) ELSE $2::uuid END,
		       (ARRAY['sign_in','trade_deleted','settings_changed'])[1 + g % 3], 'row ' || g, '{}'
		  FROM generate_series(1, 10000) g`, testOwner, other); err != nil {
		t.Fatal(err)
	}
	if _, err := pool.Exec(ctx, `INSERT INTO audit_entry (at, actor_kind, kind, subject) VALUES
		(timestamptz '2025-10-16 12:00:00+00', 'system', 'sign_in_refused', 'mallory@evil.example')`); err != nil {
		t.Fatal(err)
	}

	start := time.Now()
	status, total, rows := auditList(t, "limit=50")
	if status != 200 || total != "10001" || len(rows) != 50 {
		t.Fatalf("status %d total %s rows %d", status, total, len(rows))
	}
	if d := time.Since(start); d > time.Second {
		t.Fatalf("first page took %v (SC-006: under 1 second)", d)
	}
	// newest first; the refused sign-in has no identity
	if rows[0].Kind != "sign_in_refused" || rows[0].IdentityEmail != nil || rows[0].ActorKind != "system" || rows[0].KindLabel != "Sign-in refused" {
		t.Fatalf("first row %+v", rows[0])
	}
	for i := 1; i < len(rows); i++ {
		if rows[i].At > rows[i-1].At {
			t.Fatalf("not newest first at %d", i)
		}
	}
	// filters
	for q, want := range map[string]string{
		"kind=sign_in_refused":                            "1",
		"identity=none":                                   "1",
		"identity=" + other:                               "5000",
		"kind=trade_deleted&identity=" + other:            "1667",
		"from=2025-10-16&to=2025-10-16":                   "1",
		"from=2025-10-15&to=2025-10-15&identity=none":     "0",
		"from=2025-10-01&to=2025-10-07":                   "0",
	} {
		start = time.Now()
		st, got, _ := auditList(t, q+"&limit=1")
		if st != 200 || got != want {
			t.Errorf("%s: status %d total %s, want %s", q, st, got, want)
		}
		if d := time.Since(start); d > time.Second {
			t.Errorf("%s took %v", q, d)
		}
	}
	// paging
	_, _, p1 := auditList(t, "limit=3&offset=0")
	_, _, p2 := auditList(t, "limit=3&offset=3")
	if len(p1) != 3 || len(p2) != 3 || p1[2].ID == p2[0].ID {
		t.Fatal("paging overlaps")
	}
	// bad filters are 422
	for _, bad := range []string{"identity=nope", "kind=nope", "from=yesterday", "to=2025-13-40", "limit=0", "limit=201", "offset=-1"} {
		if st, _, _ := auditList(t, bad); st != 422 {
			t.Errorf("%s: %d, want 422", bad, st)
		}
	}
	// the kinds the filter offers
	k := call(t, "GET", "/audit/kinds", nil)
	mustStatus(t, k, 200)
	if len(k.list) != 16 { // feature 003 adds account_kind_changed
		t.Fatalf("%d kinds", len(k.list))
	}
}

func TestPeriodFilterUsesTheJournalZone(t *testing.T) {
	reset(t)
	ctx := context.Background()
	// 2025-10-15 03:30 UTC is still the 14th in Chicago (America/Chicago, UTC-5)
	if _, err := pool.Exec(ctx, `INSERT INTO audit_entry (at, actor_kind, kind, subject) VALUES
		(timestamptz '2025-10-15 03:30:00+00', 'system', 'sign_in_refused', 'edge@example.com')`); err != nil {
		t.Fatal(err)
	}
	if _, total, _ := auditList(t, "from=2025-10-14&to=2025-10-14"); total != "1" {
		t.Fatalf("the 14th in Chicago holds it: %s", total)
	}
	if _, total, _ := auditList(t, "from=2025-10-15&to=2025-10-15"); total != "0" {
		t.Fatalf("the 15th in Chicago does not: %s", total)
	}
}
