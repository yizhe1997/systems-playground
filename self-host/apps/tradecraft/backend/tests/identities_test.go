package tests

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"

	"tradecraft/internal/auth"
	"tradecraft/internal/store"
)

func stale() map[string]any {
	return map[string]any{"step_up_at": time.Now().Add(-11 * time.Minute).UnixMilli()}
}

func activeCount(t *testing.T) int {
	t.Helper()
	var n int
	if err := pool.QueryRow(context.Background(), "SELECT count(*) FROM identity WHERE disabled_at IS NULL").Scan(&n); err != nil {
		t.Fatal(err)
	}
	return n
}

func TestAddIdentity(t *testing.T) {
	reset(t)
	r := call(t, "POST", "/identities", map[string]any{"email": "  Second@Example.COM "})
	mustStatus(t, r, 201)
	if r.str("email") != "second@example.com" || r.body["active"] != true || r.body["lastSignInAt"] != nil {
		t.Fatalf("added %s", r.raw)
	}
	rows := auditRows(t)
	if len(rows) != 1 || rows[0].Kind != "identity_added" || rows[0].Subject != "second@example.com" ||
		strings.Join(rows[0].Fields, ",") != "email" || rows[0].Email != testOwner {
		t.Fatalf("audit %+v", rows)
	}
	// the same address in other letters is the same address, also when it is disabled
	r = call(t, "POST", "/identities", map[string]any{"email": "SECOND@example.com"})
	mustStatus(t, r, 409)
	if r.str("code") != "already_listed" || r.str("message") != "That address is already on the list. Enable it instead." {
		t.Fatalf("duplicate %s", r.raw)
	}
	for _, bad := range []string{"", "no-at-sign", "a@b", "a b@c.de", "a@@c.de"} {
		r = call(t, "POST", "/identities", map[string]any{"email": bad})
		mustStatus(t, r, 422)
		if r.fields()["email"] != "Enter a valid email address, for example name@example.com." {
			t.Fatalf("%q: %s", bad, r.raw)
		}
	}
	var n int
	if err := pool.QueryRow(context.Background(), "SELECT count(*) FROM identity").Scan(&n); err != nil || n != 2 {
		t.Fatalf("%d identities (%v)", n, err)
	}
}

func TestIdentityChangesNeedAFreshConfirmation(t *testing.T) {
	reset(t)
	id := addIdentitySQL(t, "second@example.com", false)
	old := tokenFor(testOwner, stale())
	r := callWith(t, "POST", "/identities", map[string]any{"email": "third@example.com"}, old)
	mustStatus(t, r, 403)
	if r.str("code") != "step_up_required" {
		t.Fatalf("%s", r.raw)
	}
	mustStatus(t, callWith(t, "POST", "/identities/"+id+"/disable", nil, tokenFor(testOwner, stale())), 403)
	mustStatus(t, callWith(t, "POST", "/identities/"+id+"/enable", nil, tokenFor(testOwner, stale())), 403)
	if activeCount(t) != 2 || len(auditRows(t)) != 0 {
		t.Fatal("a refused change changed something")
	}
	// no confirmation at all
	mustStatus(t, callWith(t, "POST", "/identities", map[string]any{"email": "third@example.com"}, tokenFor(testOwner, map[string]any{"step_up_at": nil})), 403)
	// reading the list needs none
	mustStatus(t, callWith(t, "GET", "/identities", nil, tokenFor(testOwner, stale())), 200)
}

func TestDisableAndEnable(t *testing.T) {
	reset(t)
	id := addIdentitySQL(t, "second@example.com", false)
	r := call(t, "POST", "/identities/"+id+"/disable", nil)
	mustStatus(t, r, 200)
	if r.body["active"] != false || r.body["disabledAt"] == nil {
		t.Fatalf("%s", r.raw)
	}
	// a repeat changes nothing and records nothing
	mustStatus(t, call(t, "POST", "/identities/"+id+"/disable", nil), 200)
	r = call(t, "POST", "/identities/"+id+"/enable", nil)
	mustStatus(t, r, 200)
	if r.body["active"] != true || r.str("id") != id {
		t.Fatalf("the same row must come back: %s", r.raw)
	}
	mustStatus(t, call(t, "POST", "/identities/"+id+"/enable", nil), 200)
	want := "identity_disabled,identity_enabled"
	if got := strings.Join(auditKindsOf(t), ","); got != want {
		t.Fatalf("entries %s, want %s", got, want)
	}
	for _, e := range auditRows(t) {
		if e.Subject != "second@example.com" || strings.Join(e.Fields, ",") != "status" {
			t.Fatalf("entry %+v", e)
		}
	}
	mustStatus(t, call(t, "POST", "/identities/not-a-uuid/disable", nil), 404)
	mustStatus(t, call(t, "POST", "/identities/00000000-0000-0000-0000-000000000000/enable", nil), 404)

	// the list and its counts
	list := call(t, "GET", "/identities?status=active", nil)
	mustStatus(t, list, 200)
	counts := list.body["counts"].(map[string]any)
	if counts["all"].(float64) != 2 || counts["active"].(float64) != 2 || counts["disabled"].(float64) != 0 {
		t.Fatalf("counts %v", counts)
	}
	mustStatus(t, call(t, "GET", "/identities?status=nonsense", nil), 422)
}

func TestTheLastActiveIdentityCannotBeDisabled(t *testing.T) {
	reset(t)
	var owner string
	if err := pool.QueryRow(context.Background(), "SELECT id FROM identity WHERE email = $1", testOwner).Scan(&owner); err != nil {
		t.Fatal(err)
	}
	r := call(t, "POST", "/identities/"+owner+"/disable", nil)
	mustStatus(t, r, 409)
	if r.str("code") != "last_active_identity" || r.str("message") != "This is the last active address. Enable another one before disabling it." {
		t.Fatalf("%s", r.raw)
	}
	if activeCount(t) != 1 || len(auditRows(t)) != 0 {
		t.Fatal("a refused disable changed something")
	}
}

// SC-005: with two active identities and 100 concurrent attempts to disable them, the count never reaches zero.
func TestConcurrentDisablesNeverLeaveNobody(t *testing.T) {
	reset(t)
	var owner string
	if err := pool.QueryRow(context.Background(), "SELECT id FROM identity WHERE email = $1", testOwner).Scan(&owner); err != nil {
		t.Fatal(err)
	}
	other := addIdentitySQL(t, "second@example.com", false)
	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			// each request is made as the identity it asks to disable, so the other can still be signed in
			target, as := owner, testOwner
			if i%2 == 1 {
				target, as = other, "second@example.com"
			}
			callWith(t, "POST", "/identities/"+target+"/disable", nil, tokenFor(as, nil))
		}(i)
	}
	wg.Wait()
	if n := activeCount(t); n != 1 {
		t.Fatalf("%d active identities, want exactly 1", n)
	}
	// a repeat on an identity that is already disabled is a quiet 200 that records nothing, so count the entries
	disabled := 0
	for _, k := range auditKindsOf(t) {
		if k == "identity_disabled" {
			disabled++
		}
	}
	if disabled != 1 {
		t.Fatalf("%d identities were disabled, want exactly 1", disabled)
	}
}

func TestNothingCanDeleteAnIdentity(t *testing.T) {
	reset(t)
	for _, q := range []string{"DELETE FROM identity", "TRUNCATE identity CASCADE"} {
		if _, err := pool.Exec(context.Background(), q); err == nil || !strings.Contains(err.Error(), "never deleted") {
			t.Errorf("%s: %v", q, err)
		}
	}
	if _, err := pool.Exec(context.Background(), "INSERT INTO identity (email) VALUES ('Upper@Example.com')"); err == nil {
		t.Error("an email that is not normalised was accepted by the table")
	}
}

func TestBootstrap(t *testing.T) {
	reset(t)
	ctx := context.Background()
	q := store.New(pool)
	// an active identity: nothing happens
	if err := auth.BootstrapOwner(ctx, q, "someone-else@example.com"); err != nil {
		t.Fatal(err)
	}
	var n int
	_ = pool.QueryRow(ctx, "SELECT count(*) FROM identity").Scan(&n)
	if n != 1 || len(auditRows(t)) != 0 {
		t.Fatalf("bootstrap changed things while an identity was active: %d identities", n)
	}
	// every identity disabled: the bootstrap address is enabled again and the enable is a system entry
	if _, err := pool.Exec(ctx, "UPDATE identity SET disabled_at = now()"); err != nil {
		t.Fatal(err)
	}
	if err := auth.BootstrapOwner(ctx, q, " "+strings.ToUpper(testOwner)); err != nil {
		t.Fatal(err)
	}
	if activeCount(t) != 1 {
		t.Fatal("the bootstrap identity was not enabled")
	}
	rows := auditRows(t)
	if len(rows) != 1 || rows[0].Kind != "identity_enabled" || rows[0].Actor != "system" || rows[0].Email != "" || rows[0].Subject != testOwner {
		t.Fatalf("recovery entry %+v", rows)
	}
	// every identity disabled and no address given: a plain error
	if _, err := pool.Exec(ctx, "UPDATE identity SET disabled_at = now()"); err != nil {
		t.Fatal(err)
	}
	if err := auth.BootstrapOwner(ctx, q, ""); err == nil || !strings.Contains(err.Error(), "OWNER_BOOTSTRAP_EMAIL") {
		t.Fatalf("got %v", err)
	}
	// an address that is not on the list is created when nobody is active and the table has other rows
	if err := auth.BootstrapOwner(ctx, q, "fresh@example.com"); err != nil {
		t.Fatal(err)
	}
	if activeCount(t) != 1 {
		t.Fatal("the new bootstrap identity was not created")
	}
	// an empty table (only possible with triggers off) with no address
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	for _, s := range []string{"SET LOCAL session_replication_role = replica", "DELETE FROM audit_entry", "DELETE FROM identity"} {
		if _, err := tx.Exec(ctx, s); err != nil {
			t.Fatal(err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
	if err := auth.BootstrapOwner(ctx, q, ""); err == nil {
		t.Fatal("an empty table with no bootstrap address must be an error")
	}
	if err := auth.BootstrapOwner(ctx, q, testOwner); err != nil || activeCount(t) != 1 {
		t.Fatalf("first identity: %v", err)
	}
}

func TestStepUpConfirmation(t *testing.T) {
	reset(t)
	pinned := signIn(t, testOwner, "google-sub-1", true)
	mustStatus(t, pinned, 200)
	before := int64Of(pinned, "sessionAt")
	time.Sleep(5 * time.Millisecond)
	r := systemCall(t, "/internal/step-up", map[string]any{"email": testOwner, "providerSub": "google-sub-1"})
	mustStatus(t, r, 200)
	at := int64Of(r, "stepUpAt")
	// a confirmation is a fresh sign-in: both times are new and equal, and later than the earlier session's
	if at <= before || at != int64Of(r, "sessionAt") {
		t.Fatalf("times %v (before %d)", r.body, before)
	}
	rows := auditRows(t)
	if got := rows[len(rows)-1]; got.Kind != "step_up_confirmed" || got.Email != testOwner {
		t.Fatalf("entry %+v", got)
	}
	n := len(rows)
	// another Google account is refused and nothing is recorded
	r = systemCall(t, "/internal/step-up", map[string]any{"email": testOwner, "providerSub": "google-sub-2"})
	mustStatus(t, r, 403)
	if r.str("code") != "wrong_account" || r.str("message") != "That account is not the one signed in. Nothing was changed." {
		t.Fatalf("%s", r.raw)
	}
	// an identity that never signed in has no subject to compare
	addIdentitySQL(t, "never@example.com", false)
	mustStatus(t, systemCall(t, "/internal/step-up", map[string]any{"email": "never@example.com", "providerSub": "x"}), 403)
	mustStatus(t, systemCall(t, "/internal/step-up", map[string]any{"email": testOwner, "providerSub": ""}), 403)
	if len(auditRows(t)) != n {
		t.Fatal("a refused confirmation was recorded")
	}
	// the confirmation does not change the last sign-in time
	var last *time.Time
	_ = pool.QueryRow(context.Background(), "SELECT last_sign_in_at FROM identity WHERE email = $1", testOwner).Scan(&last)
	if last == nil || last.UnixMilli() > before+2000 {
		t.Fatalf("last sign-in moved: %v vs %d", last, before)
	}
}
