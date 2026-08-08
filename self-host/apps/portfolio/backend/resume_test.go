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

// setupTestDB points the package-level db at a fresh in-memory SQLite
// instance for the duration of the test, restoring whatever was there before.
func setupTestDB(t *testing.T) {
	t.Helper()

	conn, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open in-memory sqlite: %v", err)
	}
	conn.SetMaxOpenConns(1)
	if _, err := conn.ExecContext(context.Background(), resumeRequestsSchema); err != nil {
		t.Fatalf("failed to migrate schema: %v", err)
	}
	if _, err := conn.ExecContext(context.Background(), auditLogSchema); err != nil {
		t.Fatalf("failed to migrate schema: %v", err)
	}
	// Mirror initDB()'s post-CREATE-TABLE migrations, not just the base
	// schema - resumeRequestColumns/scanResumeRequest expect columns (e.g.
	// hiring_agency, updated_by) that only exist after these run. Letting
	// this drift from initDB() is exactly what silently broke every test
	// here once those columns were added for real.
	for _, stmt := range resumeRequestsColumnMigrations {
		if _, err := conn.ExecContext(context.Background(), stmt); err != nil {
			t.Fatalf("failed to apply column migration %q: %v", stmt, err)
		}
	}

	prev := db
	db = conn
	t.Cleanup(func() {
		conn.Close()
		db = prev
	})
}

func insertTestRequest(t *testing.T, r ResumeRequest) {
	t.Helper()
	_, err := db.ExecContext(context.Background(), `
		INSERT INTO resume_requests (id, name, email, company, reason, status, created_at, triage_status,
			ai_model, legitimacy, legitimacy_reason, role_fit_summary, triage_error, triage_attempts)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		r.ID, r.Name, r.Email, r.Company, r.Reason, r.Status, r.CreatedAt, r.TriageStatus,
		r.AIModel, r.Legitimacy, r.LegitimacyReason, r.RoleFitSummary, r.TriageError, r.TriageAttempts)
	if err != nil {
		t.Fatalf("failed to insert test request: %v", err)
	}
}

func TestFindResumeRequest_NotFound(t *testing.T) {
	setupTestDB(t)

	got, err := findResumeRequest(context.Background(), "does-not-exist")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != nil {
		t.Fatalf("expected nil for missing request, got %+v", got)
	}
}

func TestFindResumeRequest_Found(t *testing.T) {
	setupTestDB(t)
	insertTestRequest(t, ResumeRequest{
		ID: "abc", Name: "Jane", Email: "jane@example.com", Company: "Acme",
		Reason: "hiring", Status: "pending", CreatedAt: time.Now().UnixMilli(), TriageStatus: "queued",
	})

	got, err := findResumeRequest(context.Background(), "abc")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got == nil {
		t.Fatal("expected a request, got nil")
	}
	if got.Name != "Jane" || got.Company != "Acme" {
		t.Errorf("unexpected fields: %+v", got)
	}
}

func TestSaveResumeRequest_UpdatesFields(t *testing.T) {
	setupTestDB(t)
	insertTestRequest(t, ResumeRequest{
		ID: "abc", Name: "Jane", Email: "jane@example.com", Company: "Acme",
		Status: "pending", CreatedAt: time.Now().UnixMilli(), TriageStatus: "queued",
	})

	req, _ := findResumeRequest(context.Background(), "abc")
	req.Status = "approved"
	req.TriageStatus = "complete"
	req.Legitimacy = "legit"

	if err := saveResumeRequest(context.Background(), req); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	got, _ := findResumeRequest(context.Background(), "abc")
	if got.Status != "approved" || got.TriageStatus != "complete" || got.Legitimacy != "legit" {
		t.Errorf("update did not persist: %+v", got)
	}
}

func TestSaveResumeRequest_UnknownID(t *testing.T) {
	setupTestDB(t)

	err := saveResumeRequest(context.Background(), &ResumeRequest{ID: "ghost", Status: "approved"})
	if err == nil {
		t.Fatal("expected an error saving an unknown request, got nil")
	}
}

// TestRunRetentionSweep_ClockStartsAtCreation is the explicit regression test
// for the operator's requirement that retention is 30 days from CreatedAt for
// every request regardless of status - a failed/never-resolved request does
// not get a fresh clock just because it was retried. Retention anonymizes
// (clears name/email) rather than deleting the row - company, reason,
// status, and triage/legitimacy fields must survive for aggregate analysis.
func TestRunRetentionSweep_ClockStartsAtCreation(t *testing.T) {
	setupTestDB(t)

	now := time.Now()
	old := now.AddDate(0, 0, -31).UnixMilli()
	recent := now.AddDate(0, 0, -1).UnixMilli()

	insertTestRequest(t, ResumeRequest{
		ID: "old-failed", Name: "Old", Email: "old@example.com", Company: "Acme",
		Reason: "hiring", Status: "pending", CreatedAt: old, TriageStatus: "failed", TriageAttempts: 3,
	})
	insertTestRequest(t, ResumeRequest{
		ID: "old-approved", Name: "Old2", Email: "old2@example.com", Company: "Acme",
		Reason: "hiring", Status: "approved", CreatedAt: old, TriageStatus: "complete",
	})
	insertTestRequest(t, ResumeRequest{
		ID: "recent", Name: "Recent", Email: "recent@example.com", Company: "Acme",
		Reason: "hiring", Status: "pending", CreatedAt: recent, TriageStatus: "queued",
	})

	runRetentionSweep(context.Background())

	oldFailed, _ := findResumeRequest(context.Background(), "old-failed")
	if oldFailed == nil {
		t.Fatal("expected old failed request row to survive anonymization (not be deleted), got nil")
	}
	if oldFailed.Name != "" || oldFailed.Email != "" {
		t.Errorf("expected old failed request to be anonymized regardless of status, still has PII: %+v", oldFailed)
	}
	if oldFailed.Company != "Acme" || oldFailed.Status != "pending" || oldFailed.Reason != "hiring" {
		t.Errorf("expected non-PII fields (including reason) to survive anonymization, got: %+v", oldFailed)
	}

	oldApproved, _ := findResumeRequest(context.Background(), "old-approved")
	if oldApproved == nil {
		t.Fatal("expected old approved request row to survive anonymization, got nil")
	}
	if oldApproved.Name != "" || oldApproved.Email != "" {
		t.Errorf("expected old approved request to be anonymized, still has PII: %+v", oldApproved)
	}
	if oldApproved.Reason != "hiring" {
		t.Errorf("expected reason to survive anonymization, got: %+v", oldApproved)
	}

	recentReq, _ := findResumeRequest(context.Background(), "recent")
	if recentReq == nil {
		t.Fatal("expected recent request to survive the sweep, got nil")
	}
	if recentReq.Name == "" || recentReq.Email == "" {
		t.Error("expected recent request to keep its PII, it was anonymized early")
	}

	// Re-running the sweep against already-anonymized rows must be a no-op,
	// not an error - this is the idempotency the `email != ''` WHERE clause
	// is supposed to guarantee.
	runRetentionSweep(context.Background())
	if again, _ := findResumeRequest(context.Background(), "old-failed"); again == nil || again.Company != "Acme" {
		t.Errorf("expected re-running the sweep to be a no-op on already-anonymized rows, got: %+v", again)
	}
}

func TestRunRetentionSweep_NilDBIsNoop(t *testing.T) {
	prev := db
	db = nil
	defer func() { db = prev }()

	// Must not panic.
	runRetentionSweep(context.Background())
}

// waitForTriageSettled polls until the background runTriage goroutine kicked
// off by a handler has finished, so tests can safely return (and tear down
// their in-memory DB) without racing an in-flight goroutine.
func waitForTriageSettled(t *testing.T, id string) {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		stored, _ := findResumeRequest(context.Background(), id)
		if stored != nil && (stored.TriageStatus == "complete" || stored.TriageStatus == "failed") {
			return
		}
		time.Sleep(10 * time.Millisecond)
	}
	t.Fatalf("triage for %s did not settle within timeout", id)
}

func newTestApp(t *testing.T) *fiber.App {
	t.Helper()
	setupTestDB(t)
	os.Setenv("ADMIN_API_KEY", "test-admin-token")
	t.Cleanup(func() { os.Unsetenv("ADMIN_API_KEY") })

	// Avoid firing real triage goroutines during handler tests.
	prevCallTriage := callTriage
	callTriage = func(ctx context.Context, req *ResumeRequest) (*triageResult, error) {
		return &triageResult{Legitimacy: "legit", LegitimacyReason: "test", RoleFitSummary: ""}, nil
	}
	t.Cleanup(func() { callTriage = prevCallTriage })

	app := fiber.New()
	RegisterResumeRoutes(app)
	return app
}

func TestSubmitResumeRequest_Success(t *testing.T) {
	app := newTestApp(t)

	body, _ := json.Marshal(map[string]string{
		"name": "Jane", "email": "jane@example.com", "company": "Acme", "reason": "hiring",
	})
	req := httptest.NewRequest("POST", "/api/resume/request", bytes.NewReader(body))
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
		t.Error("expected a generated id in the response")
	}

	stored, err := findResumeRequest(context.Background(), out["id"])
	if err != nil || stored == nil {
		t.Fatalf("expected request to be persisted, err=%v stored=%v", err, stored)
	}
	if stored.TriageStatus != "queued" && stored.TriageStatus != "processing" && stored.TriageStatus != "complete" {
		t.Errorf("unexpected initial triage_status %q", stored.TriageStatus)
	}

	// Submit fires runTriage in a background goroutine; wait for it to settle
	// before the test's t.Cleanup tears down the in-memory DB out from under
	// it (an unawaited goroutine touching a closed *sql.DB panics the whole
	// test binary, not just this test).
	waitForTriageSettled(t, out["id"])
}

func TestSubmitResumeRequest_MissingFields(t *testing.T) {
	app := newTestApp(t)

	body, _ := json.Marshal(map[string]string{"name": "Jane"})
	req := httptest.NewRequest("POST", "/api/resume/request", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, _ := app.Test(req, -1)
	if resp.StatusCode != 400 {
		t.Fatalf("expected 400 for missing fields, got %d", resp.StatusCode)
	}
}

func TestStatusEndpoint_NotFound(t *testing.T) {
	app := newTestApp(t)

	req := httptest.NewRequest("GET", "/api/resume/status/does-not-exist", nil)
	resp, _ := app.Test(req, -1)
	if resp.StatusCode != 404 {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}

// TestStatusEndpoint_OmitsPII is the explicit regression test for the
// deliberate privacy choice: the public status endpoint must never echo
// name/email/company/reason back, even though the caller likely already
// knows their own submission.
func TestStatusEndpoint_OmitsPII(t *testing.T) {
	app := newTestApp(t)
	insertTestRequest(t, ResumeRequest{
		ID: "abc", Name: "Jane Secret", Email: "jane@example.com", Company: "Acme",
		Reason: "very private reason", Status: "pending", CreatedAt: time.Now().UnixMilli(), TriageStatus: "complete",
		Legitimacy: "legit",
	})

	req := httptest.NewRequest("GET", "/api/resume/status/abc", nil)
	resp, _ := app.Test(req, -1)
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var out map[string]any
	json.NewDecoder(resp.Body).Decode(&out)
	for _, field := range []string{"name", "email", "company", "reason"} {
		if _, present := out[field]; present {
			t.Errorf("status response leaked PII field %q: %+v", field, out)
		}
	}
	if out["legitimacy"] != "legit" {
		t.Errorf("expected legitimacy in response, got %+v", out)
	}
}

func TestAdminRoutes_RequireAuth(t *testing.T) {
	app := newTestApp(t)

	req := httptest.NewRequest("GET", "/admin/resume/requests", nil)
	resp, _ := app.Test(req, -1)
	if resp.StatusCode != 403 {
		t.Fatalf("expected 403 without admin token, got %d", resp.StatusCode)
	}
}

func TestAdminAction_Reject(t *testing.T) {
	app := newTestApp(t)
	insertTestRequest(t, ResumeRequest{
		ID: "abc", Name: "Jane", Email: "jane@example.com", Company: "Acme",
		Status: "pending", CreatedAt: time.Now().UnixMilli(), TriageStatus: "complete",
	})

	body, _ := json.Marshal(map[string]string{"action": "reject"})
	req := httptest.NewRequest("POST", "/admin/resume/requests/abc/action", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Admin-Token", "test-admin-token")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	stored, _ := findResumeRequest(context.Background(), "abc")
	if stored.Status != "rejected" {
		t.Errorf("expected status 'rejected', got %q", stored.Status)
	}
}

func TestAdminAction_InvalidAction(t *testing.T) {
	app := newTestApp(t)
	insertTestRequest(t, ResumeRequest{
		ID: "abc", Name: "Jane", Email: "jane@example.com", Company: "Acme",
		Status: "pending", CreatedAt: time.Now().UnixMilli(), TriageStatus: "complete",
	})

	body, _ := json.Marshal(map[string]string{"action": "nonsense"})
	req := httptest.NewRequest("POST", "/admin/resume/requests/abc/action", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Admin-Token", "test-admin-token")

	resp, _ := app.Test(req, -1)
	if resp.StatusCode != 400 {
		t.Fatalf("expected 400 for invalid action, got %d", resp.StatusCode)
	}
}

func TestAdminRetriage_RequeuesFailedRequest(t *testing.T) {
	app := newTestApp(t)
	insertTestRequest(t, ResumeRequest{
		ID: "abc", Name: "Jane", Email: "jane@example.com", Company: "Acme",
		Status: "pending", CreatedAt: time.Now().UnixMilli(), TriageStatus: "failed",
		TriageError: "model unavailable", TriageAttempts: 1,
	})

	req := httptest.NewRequest("POST", "/admin/resume/requests/abc/retriage", nil)
	req.Header.Set("X-Admin-Token", "test-admin-token")

	resp, _ := app.Test(req, -1)
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	// The retriage handler resets state synchronously before firing the
	// (faked) triage goroutine, so wait for the async result before asserting
	// on it — and before the test's cleanup tears down the DB.
	waitForTriageSettled(t, "abc")

	stored, _ := findResumeRequest(context.Background(), "abc")
	if stored.TriageStatus != "complete" || stored.Legitimacy != "legit" {
		t.Errorf("expected fake triage result to be applied, got %+v", stored)
	}
}

// TestAdminRedact_ClearsOnlyNameAndEmail is the regression test for the
// manual "Delete" action mirroring runRetentionSweep's own field list - it
// must clear exactly name/email (not reason, company, or status) and must
// not delete the row.
func TestAdminRedact_ClearsOnlyNameAndEmail(t *testing.T) {
	app := newTestApp(t)
	insertTestRequest(t, ResumeRequest{
		ID: "abc", Name: "Jane", Email: "jane@example.com", Company: "Acme",
		Reason: "hiring", Status: "approved", CreatedAt: time.Now().UnixMilli(), TriageStatus: "complete",
	})

	req := httptest.NewRequest("POST", "/admin/resume/requests/abc/redact", nil)
	req.Header.Set("X-Admin-Token", "test-admin-token")
	req.Header.Set("X-Admin-User", "yizhechin97@gmail.com")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != 200 {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	stored, _ := findResumeRequest(context.Background(), "abc")
	if stored == nil {
		t.Fatal("expected the row to survive redaction (soft delete), got nil")
	}
	if stored.Name != "" || stored.Email != "" {
		t.Errorf("expected name/email to be cleared, got %+v", stored)
	}
	if stored.Company != "Acme" || stored.Reason != "hiring" || stored.Status != "approved" {
		t.Errorf("expected company/reason/status to survive redaction, got %+v", stored)
	}
	if stored.UpdatedBy != "yizhechin97@gmail.com" {
		t.Errorf("expected updated_by to record the actor, got %+v", stored)
	}
}

func TestAdminRedact_NotFound(t *testing.T) {
	app := newTestApp(t)

	req := httptest.NewRequest("POST", "/admin/resume/requests/does-not-exist/redact", nil)
	req.Header.Set("X-Admin-Token", "test-admin-token")

	resp, _ := app.Test(req, -1)
	if resp.StatusCode != 404 {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}
