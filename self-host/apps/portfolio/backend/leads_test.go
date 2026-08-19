package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
)

// setupLeadsTestDB mirrors setupTestDB in resume_test.go but migrates the
// leads schema instead - leads has no post-CREATE-TABLE column migrations
// (see db.go), so there's nothing else to replay here.
func setupLeadsTestDB(t *testing.T) {
	t.Helper()

	conn, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open in-memory sqlite: %v", err)
	}
	conn.SetMaxOpenConns(1)
	if _, err := conn.ExecContext(context.Background(), leadsSchema); err != nil {
		t.Fatalf("failed to migrate schema: %v", err)
	}
	if _, err := conn.ExecContext(context.Background(), auditLogSchema); err != nil {
		t.Fatalf("failed to migrate schema: %v", err)
	}

	prev := db
	db = conn
	t.Cleanup(func() {
		conn.Close()
		db = prev
	})
}

func insertTestLead(t *testing.T, l Lead) {
	t.Helper()
	_, err := db.ExecContext(context.Background(), `
		INSERT INTO leads (id, name, email, message, status, created_at)
		VALUES (?, ?, ?, ?, ?, ?)`,
		l.ID, l.Name, l.Email, l.Message, l.Status, l.CreatedAt)
	if err != nil {
		t.Fatalf("failed to insert test lead: %v", err)
	}
}

func newLeadsTestApp(t *testing.T) *fiber.App {
	t.Helper()
	setupLeadsTestDB(t)
	os.Setenv("ADMIN_API_KEY", "test-admin-token")
	t.Cleanup(func() { os.Unsetenv("ADMIN_API_KEY") })

	// leadLimiter is a package-level var whose handler value gets captured by
	// app.Post at route-registration time below - its hit counter must be
	// fresh per test, or httptest's shared request IP would let one test's
	// submissions push a later test over the limit (exactly what broke here
	// before this reset existed).
	leadLimiter = newLeadLimiter()

	app := fiber.New()
	RegisterLeadRoutes(app)
	return app
}

// TestSubmitLead_RequiresValidEmail is the regression test for one of two
// hard gates on this form (see the "Interested in working together?"
// section of the Privacy Policy): email must be present and look like an
// email, not just be non-empty. Every case here also carries a valid
// message so it's specifically the email check being exercised.
func TestSubmitLead_RequiresValidEmail(t *testing.T) {
	app := newLeadsTestApp(t)

	cases := []struct {
		name string
		body map[string]string
	}{
		{"missing email", map[string]string{"name": "Jane", "message": "hi"}},
		{"empty email", map[string]string{"name": "Jane", "email": "", "message": "hi"}},
		{"malformed email", map[string]string{"name": "Jane", "email": "not-an-email", "message": "hi"}},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			body, _ := json.Marshal(c.body)
			req := httptest.NewRequest("POST", "/api/leads", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")

			resp, err := app.Test(req, -1)
			if err != nil {
				t.Fatalf("request failed: %v", err)
			}
			if resp.StatusCode != 400 {
				t.Fatalf("expected 400, got %d", resp.StatusCode)
			}
		})
	}
}

// TestSubmitLead_RequiresMessage is the regression test for the second hard
// gate: unlike the optional Name field, Message is required - the operator
// deliberately does not want a bare email with no context (see the
// "shouldn't be optional... I don't want people to waste my time" feedback
// that added this check). A whitespace-only message must be rejected too,
// not just a literally empty string.
func TestSubmitLead_RequiresMessage(t *testing.T) {
	app := newLeadsTestApp(t)

	cases := []struct {
		name string
		body map[string]string
	}{
		{"missing message", map[string]string{"email": "jane@example.com"}},
		{"empty message", map[string]string{"email": "jane@example.com", "message": ""}},
		{"whitespace-only message", map[string]string{"email": "jane@example.com", "message": "   "}},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			body, _ := json.Marshal(c.body)
			req := httptest.NewRequest("POST", "/api/leads", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")

			resp, err := app.Test(req, -1)
			if err != nil {
				t.Fatalf("request failed: %v", err)
			}
			if resp.StatusCode != 400 {
				t.Fatalf("expected 400, got %d", resp.StatusCode)
			}
		})
	}
}

// TestSubmitLead_Success covers the documented behavior that Name is the
// only optional field - Email and Message are both required - and that a
// valid submission is persisted with status "new".
func TestSubmitLead_Success(t *testing.T) {
	app := newLeadsTestApp(t)

	body, _ := json.Marshal(map[string]string{"email": "jane@example.com", "message": "Hiring for a backend role."})
	req := httptest.NewRequest("POST", "/api/leads", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != 201 {
		t.Fatalf("expected 201, got %d", resp.StatusCode)
	}

	var out map[string]string
	json.NewDecoder(resp.Body).Decode(&out)
	if out["id"] == "" {
		t.Fatal("expected a generated id in the response")
	}

	stored, err := findLead(context.Background(), out["id"])
	if err != nil || stored == nil {
		t.Fatalf("expected lead to be persisted, err=%v stored=%v", err, stored)
	}
	if stored.Status != "new" {
		t.Errorf("expected status 'new', got %q", stored.Status)
	}
	if stored.Email != "jane@example.com" || stored.Message != "Hiring for a backend role." {
		t.Errorf("expected email and message to be persisted, got %+v", stored)
	}
}

// TestSubmitLead_RateLimited is the regression test for the spam-prevention
// requirement: the 6th submission from the same IP within an hour must be
// rejected with 429, not silently accepted.
func TestSubmitLead_RateLimited(t *testing.T) {
	app := newLeadsTestApp(t)

	submit := func() int {
		body, _ := json.Marshal(map[string]string{"email": "jane@example.com", "message": "hi"})
		req := httptest.NewRequest("POST", "/api/leads", bytes.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		resp, err := app.Test(req, -1)
		if err != nil {
			t.Fatalf("request failed: %v", err)
		}
		return resp.StatusCode
	}

	for i := 1; i <= 5; i++ {
		if got := submit(); got != 201 {
			t.Fatalf("request %d: expected 201, got %d", i, got)
		}
	}
	if got := submit(); got != 429 {
		t.Fatalf("6th request: expected 429 (rate limited), got %d", got)
	}
}

func TestLeadsAdminRoutes_RequireAuth(t *testing.T) {
	app := newLeadsTestApp(t)

	req := httptest.NewRequest("GET", "/admin/leads/", nil)
	resp, _ := app.Test(req, -1)
	if resp.StatusCode != 403 {
		t.Fatalf("expected 403 without admin token, got %d", resp.StatusCode)
	}
}

// TestRunLeadRetentionSweep_ClockStartsAtCreation is the explicit regression
// test for the Privacy Policy's claim: "Your identifying data is
// permanently erased 30 days after you submit either form... regardless of
// status". Unlike resume_requests, all three PII-bearing fields (name,
// email, message) must be cleared - there's no non-identifying remainder to
// preserve, since the message itself is free text.
func TestRunLeadRetentionSweep_ClockStartsAtCreation(t *testing.T) {
	setupLeadsTestDB(t)

	now := time.Now()
	old := now.AddDate(0, 0, -31).UnixMilli()
	recent := now.AddDate(0, 0, -1).UnixMilli()

	insertTestLead(t, Lead{
		ID: "old-archived", Name: "Old", Email: "old@example.com", Message: "a project idea",
		Status: "archived", CreatedAt: old,
	})
	insertTestLead(t, Lead{
		ID: "old-new", Name: "Old2", Email: "old2@example.com", Message: "hiring for a role",
		Status: "new", CreatedAt: old,
	})
	insertTestLead(t, Lead{
		ID: "recent", Name: "Recent", Email: "recent@example.com", Message: "hi",
		Status: "new", CreatedAt: recent,
	})

	runLeadRetentionSweep(context.Background())

	oldArchived, _ := findLead(context.Background(), "old-archived")
	if oldArchived == nil {
		t.Fatal("expected old archived lead row to survive anonymization (not be deleted), got nil")
	}
	if oldArchived.Name != "" || oldArchived.Email != "" || oldArchived.Message != "" {
		t.Errorf("expected old archived lead to be fully anonymized regardless of status, still has PII: %+v", oldArchived)
	}
	if oldArchived.Status != "archived" {
		t.Errorf("expected status to survive anonymization, got: %+v", oldArchived)
	}

	oldNew, _ := findLead(context.Background(), "old-new")
	if oldNew.Name != "" || oldNew.Email != "" || oldNew.Message != "" {
		t.Errorf("expected old 'new' lead to be anonymized too, still has PII: %+v", oldNew)
	}

	recentLead, _ := findLead(context.Background(), "recent")
	if recentLead == nil {
		t.Fatal("expected recent lead to survive the sweep, got nil")
	}
	if recentLead.Name == "" || recentLead.Email == "" || recentLead.Message == "" {
		t.Error("expected recent lead to keep its PII, it was anonymized early")
	}

	// Re-running the sweep against already-anonymized rows must be a no-op -
	// this is the idempotency the `email != ''` WHERE clause is supposed to
	// guarantee, same as runRetentionSweep in resume.go.
	runLeadRetentionSweep(context.Background())
	if again, _ := findLead(context.Background(), "old-archived"); again == nil || again.Status != "archived" {
		t.Errorf("expected re-running the sweep to be a no-op on already-anonymized rows, got: %+v", again)
	}
}

func TestRunLeadRetentionSweep_NilDBIsNoop(t *testing.T) {
	prev := db
	db = nil
	defer func() { db = prev }()

	// Must not panic.
	runLeadRetentionSweep(context.Background())
}

func TestLeadStatus_ValidTransition(t *testing.T) {
	app := newLeadsTestApp(t)
	insertTestLead(t, Lead{ID: "abc", Email: "jane@example.com", Status: "new", CreatedAt: time.Now().UnixMilli()})

	body, _ := json.Marshal(map[string]string{"status": "contacted"})
	req := httptest.NewRequest("POST", "/admin/leads/abc/status", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Admin-Token", "test-admin-token")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	stored, _ := findLead(context.Background(), "abc")
	if stored.Status != "contacted" {
		t.Errorf("expected status 'contacted', got %q", stored.Status)
	}
}

func TestLeadStatus_RejectsInvalidValue(t *testing.T) {
	app := newLeadsTestApp(t)
	insertTestLead(t, Lead{ID: "abc", Email: "jane@example.com", Status: "new", CreatedAt: time.Now().UnixMilli()})

	body, _ := json.Marshal(map[string]string{"status": "nonsense"})
	req := httptest.NewRequest("POST", "/admin/leads/abc/status", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Admin-Token", "test-admin-token")

	resp, _ := app.Test(req, -1)
	if resp.StatusCode != 400 {
		t.Fatalf("expected 400 for invalid status, got %d", resp.StatusCode)
	}
}

func TestLeadStatus_NotFound(t *testing.T) {
	app := newLeadsTestApp(t)

	body, _ := json.Marshal(map[string]string{"status": "contacted"})
	req := httptest.NewRequest("POST", "/admin/leads/does-not-exist/status", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Admin-Token", "test-admin-token")

	resp, _ := app.Test(req, -1)
	if resp.StatusCode != 404 {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}

// TestAdminRedactLead_ClearsNameEmailAndMessage is the regression test for
// the manual "Delete (redact PII)" action mirroring runLeadRetentionSweep's
// own field list - unlike resume_requests' redact (name/email only), this
// must also clear message, and must not delete the row.
func TestAdminRedactLead_ClearsNameEmailAndMessage(t *testing.T) {
	app := newLeadsTestApp(t)
	insertTestLead(t, Lead{
		ID: "abc", Name: "Jane", Email: "jane@example.com", Message: "let's talk",
		Status: "contacted", CreatedAt: time.Now().UnixMilli(),
	})

	req := httptest.NewRequest("POST", "/admin/leads/abc/redact", nil)
	req.Header.Set("X-Admin-Token", "test-admin-token")
	req.Header.Set("X-Admin-User", "yizhechin97@gmail.com")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	stored, _ := findLead(context.Background(), "abc")
	if stored == nil {
		t.Fatal("expected the row to survive redaction (soft delete), got nil")
	}
	if stored.Name != "" || stored.Email != "" || stored.Message != "" {
		t.Errorf("expected name/email/message to be cleared, got %+v", stored)
	}
	if stored.Status != "contacted" {
		t.Errorf("expected status to survive redaction, got %+v", stored)
	}
}

func TestAdminRedactLead_NotFound(t *testing.T) {
	app := newLeadsTestApp(t)

	req := httptest.NewRequest("POST", "/admin/leads/does-not-exist/redact", nil)
	req.Header.Set("X-Admin-Token", "test-admin-token")

	resp, _ := app.Test(req, -1)
	if resp.StatusCode != 404 {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}
