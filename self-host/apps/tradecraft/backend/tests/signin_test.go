package tests

import (
	"context"
	"strings"
	"sync"
	"testing"
	"time"
)

func signIn(t *testing.T, email, sub string, verified bool) resp {
	t.Helper()
	return systemCall(t, "/internal/sign-in", map[string]any{"email": email, "providerSub": sub, "emailVerified": verified})
}

func int64Of(r resp, key string) int64 {
	f, _ := r.body[key].(float64)
	return int64(f)
}

func TestSignInAcceptedAndPinned(t *testing.T) {
	reset(t)
	r := signIn(t, "  Owner@Example.COM ", "google-sub-1", true)
	mustStatus(t, r, 200)
	if r.str("email") != testOwner {
		t.Fatalf("email %q", r.str("email"))
	}
	at := int64Of(r, "sessionAt")
	if at == 0 || at != int64Of(r, "stepUpAt") {
		t.Fatalf("times %v", r.body)
	}
	if d := time.Since(time.UnixMilli(at)); d < -time.Second || d > 5*time.Second {
		t.Fatalf("sessionAt is not the database clock: %v", d)
	}
	var sub *string
	var last *time.Time
	if err := pool.QueryRow(context.Background(), "SELECT provider_sub, last_sign_in_at FROM identity WHERE email = $1", testOwner).Scan(&sub, &last); err != nil {
		t.Fatal(err)
	}
	if sub == nil || *sub != "google-sub-1" || last == nil {
		t.Fatalf("pin %v, last sign-in %v", sub, last)
	}
	rows := auditRows(t)
	if len(rows) != 1 || rows[0].Kind != "sign_in" || rows[0].Email != testOwner || rows[0].Actor != "owner" {
		t.Fatalf("audit %+v", rows)
	}
	// the same account again is fine; another Google account is refused (an email that changed hands)
	mustStatus(t, signIn(t, testOwner, "google-sub-1", true), 200)
	r = signIn(t, testOwner, "google-sub-2", true)
	mustStatus(t, r, 403)
	if r.str("code") != "refused" || r.str("message") != "You can't sign in with that account." {
		t.Fatalf("refusal body %s", r.raw)
	}
}

func TestEveryRefusalIsTheSame(t *testing.T) {
	reset(t)
	addIdentitySQL(t, "off@example.com", true)
	cases := []struct {
		name, email, sub string
		verified         bool
	}{
		{"not on the list", "stranger@example.com", "s", true},
		{"disabled", "off@example.com", "s", true},
		{"unverified email", testOwner, "s", false},
		{"no subject", testOwner, "", true},
		{"empty email", "", "s", true},
	}
	var first string
	for _, c := range cases {
		r := signIn(t, c.email, c.sub, c.verified)
		mustStatus(t, r, 403)
		if first == "" {
			first = string(r.raw)
		} else if string(r.raw) != first {
			t.Errorf("%s: a different body: %s", c.name, r.raw)
		}
	}
	rows := auditRows(t)
	if len(rows) != len(cases) {
		t.Fatalf("%d entries for %d refusals", len(rows), len(cases))
	}
	for _, r := range rows {
		if r.Kind != "sign_in_refused" || r.Actor != "system" || r.Email != "" {
			t.Fatalf("refusal entry %+v", r)
		}
	}
	// the attempted address is recorded, trimmed and lower case, with control characters removed
	reset(t)
	mustStatus(t, signIn(t, "  Mallory@Evil.EXAMPLE\n\t", "x", true), 403)
	rows = auditRows(t)
	if len(rows) != 1 || rows[0].Subject != "mallory@evil.example" {
		t.Fatalf("attempted address %+v", rows)
	}
	// and a very long one is cut
	reset(t)
	mustStatus(t, signIn(t, strings.Repeat("a", 400)+"@example.com", "x", true), 403)
	if rows = auditRows(t); len(rows) != 1 || len(rows[0].Subject) > 254 {
		t.Fatalf("long address not cut: %d", len(rows[0].Subject))
	}
}

func TestFirstSignInsRaceForThePin(t *testing.T) {
	reset(t)
	var wg sync.WaitGroup
	results := make([]int, 8)
	for i := range results {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			results[i] = signIn(t, testOwner, "sub-"+string(rune('a'+i)), true).status
		}(i)
	}
	wg.Wait()
	ok := 0
	for _, s := range results {
		if s == 200 {
			ok++
		}
	}
	if ok != 1 {
		t.Fatalf("%d concurrent first sign-ins were accepted, want exactly 1 (%v)", ok, results)
	}
}

func TestSignOutEndsEverySessionAtOnce(t *testing.T) {
	reset(t)
	in := signIn(t, testOwner, "sub-1", true)
	mustStatus(t, in, 200)
	at := int64Of(in, "sessionAt")
	session := func() string {
		return tokenFor(testOwner, map[string]any{"session_at": at, "step_up_at": at})
	}
	mustStatus(t, callWith(t, "GET", "/accounts", nil, session()), 200)

	// a second browser holds a copy of the same session
	copyOfCookie := session()
	r := systemCall(t, "/internal/sign-out", map[string]any{"email": testOwner})
	mustStatus(t, r, 204)
	if got := callWith(t, "GET", "/accounts", nil, copyOfCookie); got.status != 401 {
		t.Fatalf("a copy of the session after sign-out: %d, want 401", got.status)
	}
	if got := callWith(t, "GET", "/accounts", nil, session()); got.status != 401 {
		t.Fatalf("the session after sign-out: %d, want 401", got.status)
	}
	// signing in again gives a later time, and that session works
	time.Sleep(5 * time.Millisecond)
	again := signIn(t, testOwner, "sub-1", true)
	mustStatus(t, again, 200)
	later := int64Of(again, "sessionAt")
	if later <= at {
		t.Fatalf("a new session time %d is not later than %d", later, at)
	}
	mustStatus(t, callWith(t, "GET", "/accounts", nil, tokenFor(testOwner, map[string]any{"session_at": later, "step_up_at": later})), 200)

	kinds := auditKindsOf(t)
	want := []string{"sign_in", "sign_out", "sign_in"}
	if strings.Join(kinds, ",") != strings.Join(want, ",") {
		t.Fatalf("entries %v, want %v", kinds, want)
	}
	// signing out someone who is not on the list is a quiet success and records nothing
	mustStatus(t, systemCall(t, "/internal/sign-out", map[string]any{"email": "nobody@example.com"}), 204)
	if n := len(auditRows(t)); n != 3 {
		t.Fatalf("%d entries", n)
	}
}
