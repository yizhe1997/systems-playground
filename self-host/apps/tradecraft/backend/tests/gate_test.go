package tests

import (
	"context"
	"net/http/httptest"
	"regexp"
	"strings"
	"testing"
	"time"
)

// Helpers shared by the sign-in, identity and audit tests.

// systemToken is the token the web tier signs for the /internal routes.
func systemToken() string {
	return tokenFor("system", map[string]any{"role": "system", "session_at": nil, "step_up_at": nil})
}

func systemCall(t *testing.T, path string, payload any) resp {
	t.Helper()
	return callWith(t, "POST", path, payload, systemToken())
}

type auditRow struct {
	Actor   string
	Email   string // "" when the entry has no identity
	Kind    string
	Subject string
	Fields  []string
}

// auditRows returns every entry, oldest first.
func auditRows(t *testing.T) []auditRow {
	t.Helper()
	rows, err := pool.Query(context.Background(),
		`SELECT a.actor_kind, COALESCE(i.email, ''), a.kind, a.subject, a.changed_fields
		   FROM audit_entry a LEFT JOIN identity i ON i.id = a.identity_id ORDER BY a.at, a.id`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var out []auditRow
	for rows.Next() {
		var r auditRow
		if err := rows.Scan(&r.Actor, &r.Email, &r.Kind, &r.Subject, &r.Fields); err != nil {
			t.Fatal(err)
		}
		out = append(out, r)
	}
	return out
}

func auditKindsOf(t *testing.T) []string {
	var out []string
	for _, r := range auditRows(t) {
		out = append(out, r.Kind)
	}
	return out
}

// addIdentitySQL inserts an identity directly (the API route needs a step-up; tests that are not about the route use this).
func addIdentitySQL(t *testing.T, email string, disabled bool) string {
	t.Helper()
	var id string
	q := "INSERT INTO identity (email) VALUES ($1) RETURNING id"
	if disabled {
		q = "INSERT INTO identity (email, disabled_at) VALUES ($1, now()) RETURNING id"
	}
	if err := pool.QueryRow(context.Background(), q, email).Scan(&id); err != nil {
		t.Fatal(err)
	}
	return id
}

// TestEveryRouteButHealthIsGated walks every route of the app and asks it with no token (SC-001), then with the
// wrong kinds of token. A route added without the gate fails here.
func TestEveryRouteButHealthIsGated(t *testing.T) {
	reset(t)
	param := regexp.MustCompile(`:[A-Za-z]+`)
	uuid := "00000000-0000-0000-0000-000000000000"
	gone := addIdentitySQL(t, "gone@example.com", true)
	_ = gone
	seen := 0
	for _, r := range app.GetRoutes(true) {
		switch r.Method {
		case "GET", "POST", "PUT", "DELETE":
		default:
			continue
		}
		if r.Method == "GET" && r.Path == "/health" {
			continue
		}
		path := param.ReplaceAllString(r.Path, uuid)
		seen++
		name := r.Method + " " + r.Path
		// no token
		got := callWith(t, r.Method, path, map[string]any{}, "")
		if got.status != 401 || got.str("code") != "unauthorized" || got.str("message") != "Not signed in." {
			t.Errorf("%s with no token: %d %s", name, got.status, got.raw)
		}
		// a token signed with another secret
		bad := signToken("another-secret-another-secret-another-secret", map[string]any{
			"sub": testOwner, "role": "owner", "aud": "tradecraft-api", "jti": "x-" + name,
			"iat": time.Now().Unix(), "exp": time.Now().Add(time.Minute).Unix(), "session_at": time.Now().UnixMilli()})
		if got := callWith(t, r.Method, path, map[string]any{}, bad); got.status != 401 {
			t.Errorf("%s with a wrongly signed token: %d", name, got.status)
		}
		if strings.HasPrefix(r.Path, "/internal/") {
			// an owner token must not open a system route
			if got := callWith(t, r.Method, path, map[string]any{}, ownerToken()); got.status != 401 {
				t.Errorf("%s with an owner token: %d", name, got.status)
			}
			continue
		}
		// a system token must not open an owner route; an identity that is disabled is refused too
		if got := callWith(t, r.Method, path, map[string]any{}, systemToken()); got.status != 401 {
			t.Errorf("%s with a system token: %d", name, got.status)
		}
		if got := callWith(t, r.Method, path, map[string]any{}, tokenFor("gone@example.com", nil)); got.status != 401 {
			t.Errorf("%s for a disabled identity: %d", name, got.status)
		}
	}
	if seen < 30 {
		t.Fatalf("only %d routes were walked; the route list looks wrong", seen)
	}
	if got := call(t, "GET", "/health", nil); got.status != 200 {
		t.Fatalf("/health must stay open: %d", got.status)
	}
}

func TestTokenRules(t *testing.T) {
	reset(t)
	now := time.Now()
	cases := []struct {
		name string
		tok  string
		want int
	}{
		{"good", tokenFor(testOwner, nil), 200},
		{"expired", tokenFor(testOwner, map[string]any{"iat": now.Add(-2 * time.Minute).Unix(), "exp": now.Add(-time.Minute).Unix()}), 401},
		{"wrong audience", tokenFor(testOwner, map[string]any{"aud": "other"}), 401},
		{"lifetime too long", tokenFor(testOwner, map[string]any{"exp": now.Add(time.Hour).Unix()}), 401},
		{"issued in the future", tokenFor(testOwner, map[string]any{"iat": now.Add(time.Minute).Unix(), "exp": now.Add(2 * time.Minute).Unix()}), 401},
		{"unknown identity", tokenFor("nobody@example.com", nil), 401},
		{"no session time", tokenFor(testOwner, map[string]any{"session_at": nil}), 401},
		{"session older than 8 hours", tokenFor(testOwner, map[string]any{"session_at": now.Add(-8*time.Hour - time.Second).UnixMilli()}), 401},
		{"session just under 8 hours", tokenFor(testOwner, map[string]any{"session_at": now.Add(-8*time.Hour + time.Minute).UnixMilli()}), 200},
		{"case and spaces in the identity", tokenFor(" Owner@Example.COM ", nil), 200},
	}
	for _, c := range cases {
		if got := callWith(t, "GET", "/accounts", nil, c.tok); got.status != c.want {
			t.Errorf("%s: %d, want %d (%s)", c.name, got.status, c.want, got.raw)
		}
	}
	// replay: the same token twice
	tok := tokenFor(testOwner, nil)
	if got := callWith(t, "GET", "/accounts", nil, tok); got.status != 200 {
		t.Fatalf("first use: %d", got.status)
	}
	if got := callWith(t, "GET", "/accounts", nil, tok); got.status != 401 {
		t.Fatalf("replayed token: %d, want 401", got.status)
	}
	// the refusal body is the same whatever the reason
	a := callWith(t, "GET", "/accounts", nil, "")
	b := callWith(t, "GET", "/accounts", nil, tokenFor("nobody@example.com", nil))
	if string(a.raw) != string(b.raw) {
		t.Fatalf("refusals differ: %s vs %s", a.raw, b.raw)
	}
}

func TestDisabledIdentityLosesAccessAtOnce(t *testing.T) {
	reset(t)
	id := addIdentitySQL(t, "second@example.com", false)
	if got := callWith(t, "GET", "/accounts", nil, tokenFor("second@example.com", nil)); got.status != 200 {
		t.Fatalf("active identity: %d", got.status)
	}
	if _, err := pool.Exec(context.Background(), "UPDATE identity SET disabled_at = now() WHERE id = $1", id); err != nil {
		t.Fatal(err)
	}
	if got := callWith(t, "GET", "/accounts", nil, tokenFor("second@example.com", nil)); got.status != 401 {
		t.Fatalf("disabled identity: %d, want 401 (SC-003)", got.status)
	}
}

func TestNoRouteCreatesASession(t *testing.T) {
	reset(t)
	var internal []string
	for _, r := range app.GetRoutes(true) {
		if strings.HasPrefix(r.Path, "/internal/") {
			internal = append(internal, r.Method+" "+r.Path)
		}
		low := strings.ToLower(r.Path)
		for _, bad := range []string{"login", "dev", "session", "impersonate", "token"} {
			if strings.Contains(low, bad) {
				t.Errorf("suspicious route %s %s", r.Method, r.Path)
			}
		}
	}
	want := map[string]bool{"POST /internal/sign-in": true, "POST /internal/sign-out": true, "POST /internal/step-up": true}
	if len(internal) != len(want) {
		t.Fatalf("internal routes: %v", internal)
	}
	for _, r := range internal {
		if !want[r] {
			t.Errorf("unexpected internal route %s", r)
		}
	}
	// sign-in needs a system token and then a verified Google email; an owner token and a bare call are refused
	if got := callWith(t, "POST", "/internal/sign-in", map[string]any{"email": testOwner, "providerSub": "x", "emailVerified": true}, ownerToken()); got.status != 401 {
		t.Fatalf("owner token on sign-in: %d", got.status)
	}
	r := httptest.NewRequest("POST", "/internal/sign-in", nil)
	res, err := app.Test(r, -1)
	if err != nil {
		t.Fatal(err)
	}
	if res.StatusCode != 401 {
		t.Fatalf("no token on sign-in: %d", res.StatusCode)
	}
}
