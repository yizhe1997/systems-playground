package tests

import (
	"context"
	"strings"
	"testing"
)

func TestTheDatabaseRefusesToChangeOrRemoveAnEntry(t *testing.T) {
	reset(t)
	mustStatus(t, signIn(t, testOwner, "sub", true), 200)
	ctx := context.Background()
	for _, q := range []string{
		"UPDATE audit_entry SET subject = 'edited'",
		"DELETE FROM audit_entry",
		"TRUNCATE audit_entry",
	} {
		_, err := pool.Exec(ctx, q)
		if err == nil || !strings.Contains(err.Error(), "audit entries cannot be changed or removed") {
			t.Errorf("%s: %v", q, err)
		}
	}
	if len(auditRows(t)) != 1 {
		t.Fatal("the entry is gone")
	}
	// the table's own checks: an entry for a person needs an identity, and the kind has a fixed shape
	for _, q := range []string{
		"INSERT INTO audit_entry (actor_kind, kind) VALUES ('owner', 'sign_in')",
		"INSERT INTO audit_entry (actor_kind, kind) VALUES ('robot', 'sign_in')",
		"INSERT INTO audit_entry (actor_kind, kind) VALUES ('system', 'Not A Kind')",
	} {
		if _, err := pool.Exec(ctx, q); err == nil {
			t.Errorf("accepted: %s", q)
		}
	}
}

// FR-016: when the entry cannot be written, the change is not made and the owner is told nothing was changed.
func TestAChangeWithoutItsEntryIsNotMade(t *testing.T) {
	reset(t)
	ctx := context.Background()
	acct := account(t, "Rollback account", "USD", "")
	id := trade(t, tradeA(acct)).str("id")
	m := call(t, "POST", "/mistakes", map[string]any{"name": "Rollback mistake"})
	mustStatus(t, m, 201)

	for _, q := range []string{
		`CREATE FUNCTION test_block_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'blocked for the test'; END $$`,
		`CREATE TRIGGER test_block BEFORE INSERT ON audit_entry FOR EACH ROW EXECUTE FUNCTION test_block_audit()`,
	} {
		if _, err := pool.Exec(ctx, q); err != nil {
			t.Fatal(err)
		}
	}
	defer func() {
		_, _ = pool.Exec(ctx, "DROP TRIGGER test_block ON audit_entry")
		_, _ = pool.Exec(ctx, "DROP FUNCTION test_block_audit()")
	}()

	const msg = "Something went wrong. Nothing was changed."
	for name, r := range map[string]resp{
		"delete trade":    call(t, "DELETE", "/trades/"+id, nil),
		"archive account": call(t, "POST", "/accounts/"+acct+"/archive", nil),
		"change settings": call(t, "PUT", "/settings", map[string]any{"timeZone": "Asia/Tokyo"}),
		"retire mistake":  call(t, "POST", "/mistakes/"+m.str("id")+"/retire", nil),
		"export":          call(t, "GET", "/export", nil),
		"add identity":    call(t, "POST", "/identities", map[string]any{"email": "new@example.com"}),
	} {
		if r.status != 500 || r.str("message") != msg {
			t.Errorf("%s: %d %s", name, r.status, r.raw)
		}
	}
	var deleted, archived, retired bool
	var zone string
	var identities int
	if err := pool.QueryRow(ctx, "SELECT deleted_at IS NOT NULL FROM trade WHERE id = $1", id).Scan(&deleted); err != nil {
		t.Fatal(err)
	}
	_ = pool.QueryRow(ctx, "SELECT archived_at IS NOT NULL FROM account WHERE id = $1", acct).Scan(&archived)
	_ = pool.QueryRow(ctx, "SELECT retired_at IS NOT NULL FROM mistake WHERE id = $1", m.str("id")).Scan(&retired)
	_ = pool.QueryRow(ctx, "SELECT time_zone FROM journal_settings WHERE id = 1").Scan(&zone)
	_ = pool.QueryRow(ctx, "SELECT count(*) FROM identity").Scan(&identities)
	if deleted || archived || retired || zone != "America/Chicago" || identities != 1 {
		t.Fatalf("a change was made without its entry: deleted=%v archived=%v retired=%v zone=%s identities=%d",
			deleted, archived, retired, zone, identities)
	}
	// the best-effort entries do not turn a sign-in into a failure
	mustStatus(t, signIn(t, testOwner, "sub", true), 200)
}
