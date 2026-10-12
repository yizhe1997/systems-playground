package tests

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"regexp"
	"strings"
	"testing"
)

// Feature 003, user story 2: the switch and the tokens.

var tokenValue = regexp.MustCompile(`^tca_[A-Za-z0-9_-]{43}$`)

// makeToken creates a token as the owner and returns the answer (the value is in it, once).
func makeToken(t *testing.T, name string) resp {
	t.Helper()
	r := call(t, "POST", "/agent/tokens", map[string]any{"name": name})
	mustStatus(t, r, 201)
	return r
}

func tokenOf(r resp) string { return r.body["value"].(string) }

func turnAgentAccess(t *testing.T, on bool) {
	t.Helper()
	mustStatus(t, call(t, "PUT", "/agent", map[string]any{"enabled": on}), 200)
}

func TestAgentAccessIsOffUntilTurnedOnAndTheSwitchIsAudited(t *testing.T) {
	reset(t)
	r := call(t, "GET", "/agent", nil)
	mustStatus(t, r, 200)
	if r.body["enabled"] != false || len(r.body["tokens"].([]any)) != 0 {
		t.Fatalf("a new journal: %s", r.raw)
	}
	// a stale confirmation changes nothing and says so
	off := callWith(t, "PUT", "/agent", map[string]any{"enabled": true}, tokenFor(testOwner, stale()))
	mustStatus(t, off, 403)
	if off.str("code") != "step_up_required" {
		t.Fatalf("code: %s", off.raw)
	}
	if call(t, "GET", "/agent", nil).body["enabled"] != false {
		t.Fatal("a refused change was made")
	}
	if len(auditRows(t)) != 0 {
		t.Fatal("a refused change was recorded")
	}

	mustStatus(t, call(t, "PUT", "/agent", map[string]any{"enabled": true}), 200)
	e := lastEntry(t)
	if e.Kind != "agent_access_enabled" || e.Subject != "Agent access" || fieldsOf(e) != "status" || e.Actor != "owner" || e.Email != testOwner {
		t.Fatalf("on: %+v", e)
	}
	n := len(auditRows(t))
	mustStatus(t, call(t, "PUT", "/agent", map[string]any{"enabled": true}), 200) // the same again records nothing
	if len(auditRows(t)) != n {
		t.Fatal("a repeat was recorded")
	}
	mustStatus(t, call(t, "PUT", "/agent", map[string]any{"enabled": false}), 200)
	if e := lastEntry(t); e.Kind != "agent_access_disabled" {
		t.Fatalf("off: %+v", e)
	}
	mustStatus(t, call(t, "PUT", "/agent", map[string]any{}), 422)
}

func TestTokenIsShownOnceStoredAsADigestAndNamed(t *testing.T) {
	reset(t)
	turnAgentAccess(t, true)
	// the name is required, at most 60 characters, and needs a recent confirmation
	mustStatus(t, call(t, "POST", "/agent/tokens", map[string]any{"name": "   "}), 422)
	mustStatus(t, call(t, "POST", "/agent/tokens", map[string]any{"name": strings.Repeat("x", 61)}), 422)
	mustStatus(t, callWith(t, "POST", "/agent/tokens", map[string]any{"name": "Claude Desktop"}, tokenFor(testOwner, stale())), 403)

	made := makeToken(t, "  Claude   Desktop,  backtests ")
	value := tokenOf(made)
	if !tokenValue.MatchString(value) {
		t.Fatalf("value %q", value)
	}
	tok := made.body["token"].(map[string]any)
	if tok["name"] != "Claude Desktop, backtests" || tok["active"] != true || tok["lastUsedAt"] != nil || tok["revokedAt"] != nil {
		t.Fatalf("token: %v", tok)
	}
	// one entry, named by the token's name, never its value
	e := lastEntry(t)
	if e.Kind != "agent_token_created" || e.Subject != "Claude Desktop, backtests" || fieldsOf(e) != "name" || e.Actor != "owner" {
		t.Fatalf("entry: %+v", e)
	}

	// only the SHA-256 digest is stored
	ctx := context.Background()
	sum := sha256.Sum256([]byte(value))
	var stored, n int
	if err := pool.QueryRow(ctx, "SELECT count(*) FROM agent_token WHERE token_hash = $1", hex.EncodeToString(sum[:])).Scan(&stored); err != nil || stored != 1 {
		t.Fatalf("digest not stored: %v %d", err, stored)
	}
	if err := pool.QueryRow(ctx, "SELECT count(*) FROM agent_token WHERE token_hash = $1 OR name = $1", value).Scan(&n); err != nil || n != 0 {
		t.Fatalf("the value itself is stored: %v %d", err, n)
	}

	// it is in no later answer, no audit entry and no export (SC-004)
	for _, p := range []string{"/agent", "/audit?limit=200", "/export"} {
		r := call(t, "GET", p, nil)
		mustStatus(t, r, 200)
		if strings.Contains(string(r.raw), value) {
			t.Errorf("%s holds the token value", p)
		}
	}
	var inAudit int
	if err := pool.QueryRow(ctx, "SELECT count(*) FROM audit_entry WHERE position($1 in subject) > 0 OR position($1 in actor_label) > 0", value).Scan(&inAudit); err != nil || inAudit != 0 {
		t.Fatalf("an audit entry holds the value: %v %d", err, inAudit)
	}
	if list := call(t, "GET", "/agent", nil); len(list.body["tokens"].([]any)) != 1 {
		t.Fatalf("list: %s", list.raw)
	}
}

func TestTokenNamesAreUniqueIgnoringCaseAndSpacesRevokedIncluded(t *testing.T) {
	reset(t)
	first := makeToken(t, "Claude Desktop")
	for _, dup := range []string{"claude desktop", "  CLAUDE    desktop  "} {
		r := call(t, "POST", "/agent/tokens", map[string]any{"name": dup})
		mustStatus(t, r, 409)
		if r.str("code") != "name_used" || r.str("message") != "That name is already used. Choose another." {
			t.Errorf("%q: %s", dup, r.raw)
		}
	}
	// a revoked token keeps its name
	id := first.body["token"].(map[string]any)["id"].(string)
	mustStatus(t, call(t, "POST", "/agent/tokens/"+id+"/revoke", nil), 200)
	mustStatus(t, call(t, "POST", "/agent/tokens", map[string]any{"name": "Claude Desktop"}), 409)
}

func TestRevokeIsFinalAndAuditedAndTokensAreNeverDeleted(t *testing.T) {
	reset(t)
	made := makeToken(t, "Claude Code")
	id := made.body["token"].(map[string]any)["id"].(string)

	mustStatus(t, callWith(t, "POST", "/agent/tokens/"+id+"/revoke", nil, tokenFor(testOwner, stale())), 403)
	mustStatus(t, call(t, "POST", "/agent/tokens/00000000-0000-0000-0000-000000000000/revoke", nil), 404)

	r := call(t, "POST", "/agent/tokens/"+id+"/revoke", nil)
	mustStatus(t, r, 200)
	if r.body["active"] != false || r.body["revokedAt"] == nil {
		t.Fatalf("revoked: %s", r.raw)
	}
	e := lastEntry(t)
	if e.Kind != "agent_token_revoked" || e.Subject != "Claude Code" || fieldsOf(e) != "status" {
		t.Fatalf("entry: %+v", e)
	}
	n := len(auditRows(t))
	again := call(t, "POST", "/agent/tokens/"+id+"/revoke", nil)
	mustStatus(t, again, 200)
	if again.str("revokedAt") != r.str("revokedAt") || len(auditRows(t)) != n {
		t.Fatal("a repeat changed or recorded something")
	}
	// it stays in the list, marked revoked
	list := call(t, "GET", "/agent", nil).body["tokens"].([]any)
	if len(list) != 1 || list[0].(map[string]any)["active"] != false {
		t.Fatalf("list: %v", list)
	}

	// the database refuses what the API never does
	ctx := context.Background()
	if _, err := pool.Exec(ctx, "UPDATE agent_token SET revoked_at = NULL WHERE id = $1", id); err == nil {
		t.Error("a revoked token could be made active again")
	}
	if _, err := pool.Exec(ctx, "DELETE FROM agent_token WHERE id = $1", id); err == nil {
		t.Error("a token could be deleted")
	}
	if _, err := pool.Exec(ctx, "TRUNCATE agent_token"); err == nil {
		t.Error("tokens could be truncated")
	}
}
