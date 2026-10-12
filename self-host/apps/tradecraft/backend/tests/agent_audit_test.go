package tests

import (
	"context"
	"strings"
	"testing"
)

// Feature 003, user story 3: every agent read and every refused request is one audit entry, with no content in it.

type agentRow struct{ Actor, Email, Kind, Subject, Label string }

// agentRows returns the agent_read and agent_refused entries, oldest first.
func agentRows(t *testing.T) []agentRow {
	t.Helper()
	rows, err := pool.Query(context.Background(), `
		SELECT a.actor_kind, COALESCE(i.email, ''), a.kind, a.subject, a.actor_label
		  FROM audit_entry a LEFT JOIN identity i ON i.id = a.identity_id
		 WHERE a.kind IN ('agent_read', 'agent_refused') ORDER BY a.at, a.id`)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	var out []agentRow
	for rows.Next() {
		var r agentRow
		if err := rows.Scan(&r.Actor, &r.Email, &r.Kind, &r.Subject, &r.Label); err != nil {
			t.Fatal(err)
		}
		out = append(out, r)
	}
	return out
}

func lastUsed(t *testing.T, name string) *string {
	t.Helper()
	var s *string
	if err := pool.QueryRow(context.Background(), "SELECT last_used_at::text FROM agent_token WHERE name = $1", name).Scan(&s); err != nil {
		t.Fatal(err)
	}
	return s
}

func TestEachReadIsOneEntryAndHandshakeIsNone(t *testing.T) {
	reset(t)
	sd := sampleDay(t)
	judgeSample(t, sd)
	token := agentWithToken(t, "Claude Desktop, backtests")
	d := startDoor(t)

	s := d.connect(t, token) // initialize
	if _, err := s.ListTools(context.Background(), nil); err != nil {
		t.Fatal(err)
	}
	if n := len(agentRows(t)); n != 0 {
		t.Fatalf("connecting and listing tools wrote %d entries, want none", n)
	}
	if lastUsed(t, "Claude Desktop, backtests") == nil {
		t.Error("an accepted request did not move last used")
	}

	callTool(t, s, "list_accounts", map[string]any{})
	callTool(t, s, "get_day", map[string]any{"accountId": sd.acct, "date": "2025-10-01"})
	callTool(t, s, "list_accounts", map[string]any{}) // the same question twice is two entries
	rows := agentRows(t)
	if len(rows) != 3 {
		t.Fatalf("%d entries, want 3: %+v", len(rows), rows)
	}
	want := []string{"list_accounts", "get_day, Funded 50K", "list_accounts"}
	for i, r := range rows {
		if r.Kind != "agent_read" || r.Actor != "agent" || r.Email != testOwner || r.Label != "Claude Desktop, backtests" || r.Subject != want[i] {
			t.Errorf("entry %d: %+v", i, r)
		}
	}
	// nothing of the answer is in any entry: no figure, no text
	var withChanged int
	if err := pool.QueryRow(context.Background(), "SELECT count(*) FROM audit_entry WHERE kind = 'agent_read' AND cardinality(changed_fields) > 0").Scan(&withChanged); err != nil || withChanged != 0 {
		t.Errorf("fields on a read: %v %d", err, withChanged)
	}
	for _, r := range rows {
		if strings.ContainsAny(r.Subject, "$0123456789") && !strings.Contains(r.Subject, "50K") {
			t.Errorf("a figure in a subject: %q", r.Subject)
		}
	}
}

func TestRefusedRequestsAreOneGenericAnswerAndOneEntryEach(t *testing.T) {
	reset(t)
	token := agentWithToken(t, "Claude Desktop")
	d := startDoor(t)
	var generic string
	refused := func(what, token string, header map[string]string, wantStatus int) {
		t.Helper()
		before := len(agentRows(t))
		status, body := d.raw(t, token, header, rpcCallAccounts)
		if status != wantStatus {
			t.Errorf("%s: status %d, want %d: %s", what, status, wantStatus, body)
		}
		if wantStatus == 401 {
			if generic == "" {
				generic = body
			} else if body != generic {
				t.Errorf("%s: the refusal differs from the others:\n %s\n %s", what, body, generic)
			}
		}
		if got := len(agentRows(t)); got != before+1 {
			t.Errorf("%s: %d entries written, want 1", what, got-before)
		}
	}
	last := func() agentRow { r := agentRows(t); return r[len(r)-1] }

	refused("no token", "", nil, 401)
	if r := last(); r.Kind != "agent_refused" || r.Subject != "Unknown token" || r.Actor != "system" || r.Email != "" || r.Label != "" {
		t.Errorf("no token: %+v", r)
	}
	refused("wrong token", "tca_"+strings.Repeat("x", 43), nil, 401)
	if r := last(); r.Subject != "Unknown token" || r.Actor != "system" {
		t.Errorf("wrong token: %+v", r)
	}
	refused("a web page", token, map[string]string{"Origin": "https://evil.example"}, 403)
	if r := last(); r.Subject != "Browser request" || r.Actor != "system" || r.Label != "" {
		t.Errorf("origin: %+v", r)
	}

	// revoked: known, so the entry names the token and its creator
	made := call(t, "GET", "/agent", nil).body["tokens"].([]any)[0].(map[string]any)["id"].(string)
	mustStatus(t, call(t, "POST", "/agent/tokens/"+made+"/revoke", nil), 200)
	refused("revoked", token, nil, 401)
	if r := last(); r.Subject != "Revoked token" || r.Actor != "agent" || r.Email != testOwner || r.Label != "Claude Desktop" {
		t.Errorf("revoked: %+v", r)
	}

	// the switch off: every token, the unknown one under the system
	live := tokenOf(makeToken(t, "Claude Code"))
	turnAgentAccess(t, false)
	refused("switch off", live, nil, 401)
	if r := last(); r.Subject != "Access off" || r.Actor != "agent" || r.Label != "Claude Code" {
		t.Errorf("switch off: %+v", r)
	}
	refused("switch off, unknown token", "tca_"+strings.Repeat("y", 43), nil, 401)
	if r := last(); r.Subject != "Access off" || r.Actor != "system" {
		t.Errorf("switch off, unknown: %+v", r)
	}
	// turning it on again: the token that was not revoked works again
	turnAgentAccess(t, true)
	if status, body := d.raw(t, live, nil, rpcCallAccounts); status != 200 || !strings.Contains(body, "result") {
		t.Errorf("after switching on again: %d %s", status, body)
	}

	// the creator disabled
	addIdentitySQL(t, "second@example.com", false)
	second := callWith(t, "POST", "/agent/tokens", map[string]any{"name": "Second's"}, tokenFor("second@example.com", nil))
	mustStatus(t, second, 201)
	exec(t, "UPDATE identity SET disabled_at = now() WHERE email = 'second@example.com'")
	refused("creator disabled", tokenOf(second), nil, 401)
	if r := last(); r.Subject != "Identity disabled" || r.Actor != "agent" || r.Email != "second@example.com" || r.Label != "Second's" {
		t.Errorf("disabled creator: %+v", r)
	}
	// a refused request never moves last used
	if lastUsed(t, "Second's") != nil || lastUsed(t, "Claude Desktop") != nil {
		t.Error("a refused request moved last used")
	}
}

// An agent token opens nothing of the owner's; a service token opens nothing of the agent's (FR-013).
func TestTheTwoKindsOfTokenAreNotInterchangeable(t *testing.T) {
	reset(t)
	token := agentWithToken(t, "Claude Desktop")
	accounts := len(call(t, "GET", "/accounts", nil).list)
	for _, c := range []struct{ method, path string }{
		{"GET", "/accounts"}, {"POST", "/accounts"}, {"GET", "/trades"}, {"GET", "/audit"}, {"GET", "/agent"},
		{"PUT", "/agent"}, {"POST", "/agent/tokens"}, {"GET", "/export"}, {"GET", "/identities"},
	} {
		r := callWith(t, c.method, c.path, map[string]any{"name": "Sneaky", "currency": "USD", "enabled": false}, token)
		if r.status != 401 {
			t.Errorf("%s %s with an agent token: %d, want 401", c.method, c.path, r.status)
		}
	}
	if got := len(call(t, "GET", "/accounts", nil).list); got != accounts {
		t.Errorf("an agent token changed the journal: %d accounts, was %d", got, accounts)
	}
	if call(t, "GET", "/agent", nil).body["enabled"] != true {
		t.Error("an agent token turned the switch off")
	}
	// the owner's service token at the agent door: refused, as an unknown token
	d := startDoor(t)
	before := len(agentRows(t))
	status, _ := d.raw(t, ownerToken(), nil, rpcCallAccounts)
	if status != 401 {
		t.Errorf("a service token at /mcp: %d, want 401", status)
	}
	rows := agentRows(t)
	if len(rows) != before+1 || rows[len(rows)-1].Subject != "Unknown token" || rows[len(rows)-1].Actor != "system" {
		t.Errorf("entries: %+v", rows)
	}
}

// A read whose entry cannot be written is refused and returns nothing (SC-005's other half).
func TestReadIsRefusedWhenItsEntryCannotBeWritten(t *testing.T) {
	reset(t)
	account(t, "Funded 50K", "USD", "")
	s := startDoor(t).connect(t, agentWithToken(t, "Claude Desktop"))
	ctx := context.Background()
	for _, q := range []string{
		`CREATE FUNCTION test_refuse_agent_read() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'no agent entries today'; END $$`,
		`CREATE TRIGGER test_refuse_agent_read BEFORE INSERT ON audit_entry FOR EACH ROW WHEN (NEW.kind = 'agent_read') EXECUTE FUNCTION test_refuse_agent_read()`,
	} {
		if _, err := pool.Exec(ctx, q); err != nil {
			t.Fatal(err)
		}
	}
	t.Cleanup(func() {
		_, _ = pool.Exec(ctx, "DROP TRIGGER IF EXISTS test_refuse_agent_read ON audit_entry")
		_, _ = pool.Exec(ctx, "DROP FUNCTION IF EXISTS test_refuse_agent_read()")
	})
	text, isErr := callTool(t, s, "list_accounts", map[string]any{})
	if !isErr || strings.Contains(text, "Funded 50K") {
		t.Errorf("the read was answered although it could not be recorded: error %v: %s", isErr, text)
	}
}

// SC-003: revoke and the switch stop every call, and turning the switch on again changes no token.
func TestRevokeAndTheSwitchStopEveryCall(t *testing.T) {
	reset(t)
	a := makeTokenOn(t, "Token A")
	b := makeTokenOn(t, "Token B")
	d := startDoor(t)
	ok := func(token string) bool { status, _ := d.raw(t, token, nil, rpcCallAccounts); return status == 200 }
	if !ok(a) || !ok(b) {
		t.Fatal("fresh tokens are refused while access is on")
	}
	idOf := func(name string) string {
		for _, x := range call(t, "GET", "/agent", nil).body["tokens"].([]any) {
			if m := x.(map[string]any); m["name"] == name {
				return m["id"].(string)
			}
		}
		t.Fatalf("no token %q", name)
		return ""
	}
	mustStatus(t, call(t, "POST", "/agent/tokens/"+idOf("Token A")+"/revoke", nil), 200)
	if ok(a) || !ok(b) {
		t.Error("after revoking A: A must be refused and B must work")
	}
	turnAgentAccess(t, false)
	if ok(a) || ok(b) {
		t.Error("with the switch off a token still works")
	}
	turnAgentAccess(t, true)
	if ok(a) || !ok(b) {
		t.Error("after switching on again: A stays revoked and B works again")
	}
	// the switch off revoked nobody
	for _, x := range call(t, "GET", "/agent", nil).body["tokens"].([]any) {
		m := x.(map[string]any)
		if m["name"] == "Token B" && m["active"] != true {
			t.Error("turning the switch off revoked a token")
		}
	}
}

// makeTokenOn turns the switch on and makes a token, returning its value.
func makeTokenOn(t *testing.T, name string) string {
	t.Helper()
	turnAgentAccess(t, true)
	return tokenOf(makeToken(t, name))
}
