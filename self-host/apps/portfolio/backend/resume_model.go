package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"

	"github.com/gofiber/fiber/v2"
)

type ResumeRequest struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Company   string `json:"company"` // labeled "Hiring company" on the public form - the company with the open role
	Reason    string `json:"reason"`
	Status    string `json:"status"` // pending, approved, rejected, expired (still-pending past the 30-day retention cutoff - see runRetentionSweep)
	CreatedAt int64  `json:"created_at"`

	// Optional context, collected in the public form's "Advanced" section -
	// none of these gate submission the way Name/Email/Company/Reason do.
	// There's no Position field: Reason is mandatory and already elicits the
	// role ("Hiring for a backend role...") so a separate field just asks the
	// same thing twice.
	HiringAgency  string `json:"hiring_agency,omitempty"` // set when a recruiting agency is asking on the hiring company's behalf
	WorkType      string `json:"work_type,omitempty"`     // Remote, Hybrid, Onsite, or blank
	Industry      string `json:"industry,omitempty"`
	SalaryRange   string `json:"salary_range,omitempty"`
	JobPostingURL string `json:"job_posting_url,omitempty"` // a real posting is a stronger legitimacy signal than a bare company URL

	// AI triage — set by runTriage() in triage.go
	TriageStatus     string `json:"triage_status"` // queued, processing, complete, failed
	AIModel          string `json:"ai_model,omitempty"`
	Legitimacy       string `json:"legitimacy,omitempty"` // legit, suspicious, spam
	LegitimacyReason string `json:"legitimacy_reason,omitempty"`
	RoleFitSummary   string `json:"role_fit_summary,omitempty"`
	TriageError      string `json:"triage_error,omitempty"`
	TriageAttempts   int    `json:"triage_attempts,omitempty"`

	// TriageCompletedAt/DecidedAt power the status page's elapsed-time
	// displays - 0 means "hasn't happened yet" (checked with > 0, not
	// omitempty, since the frontend needs to tell "not yet" apart from a
	// dropped field). Triage duration is measured from CreatedAt, not a
	// separate started-at column - see the db.go migration comment for why.
	TriageCompletedAt int64 `json:"triage_completed_at"`
	DecidedAt         int64 `json:"decided_at"`

	// UpdatedBy is the admin email that performed the last approve/reject/
	// retriage action, from the X-Admin-User header the frontend proxy sets
	// (see audit.go's actorFromRequest) - blank until the first admin action.
	UpdatedBy string `json:"updated_by,omitempty"`
}

const resumeRequestColumns = `id, name, email, company, reason, status, created_at,
	triage_status, ai_model, legitimacy, legitimacy_reason, role_fit_summary,
	triage_error, triage_attempts, hiring_agency, work_type, industry, salary_range, job_posting_url,
	triage_completed_at, decided_at, updated_by`

func scanResumeRequest(row interface{ Scan(...any) error }) (*ResumeRequest, error) {
	var r ResumeRequest
	err := row.Scan(&r.ID, &r.Name, &r.Email, &r.Company, &r.Reason, &r.Status, &r.CreatedAt,
		&r.TriageStatus, &r.AIModel, &r.Legitimacy, &r.LegitimacyReason, &r.RoleFitSummary,
		&r.TriageError, &r.TriageAttempts, &r.HiringAgency, &r.WorkType,
		&r.Industry, &r.SalaryRange, &r.JobPostingURL,
		&r.TriageCompletedAt, &r.DecidedAt, &r.UpdatedBy)
	if err != nil {
		return nil, err
	}
	return &r, nil
}

// findResumeRequest looks up a request by ID. Returns (nil, nil) if not found.
func findResumeRequest(ctx context.Context, id string) (*ResumeRequest, error) {
	row := db.QueryRowContext(ctx, "SELECT "+resumeRequestColumns+" FROM resume_requests WHERE id = ?", id)
	req, err := scanResumeRequest(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return req, nil
}

// saveResumeRequest persists every mutable field of req. CreatedAt is
// immutable after insert — the 30-day retention clock always starts at
// creation, regardless of how many times a request is updated or retried.
func saveResumeRequest(ctx context.Context, req *ResumeRequest) error {
	res, err := db.ExecContext(ctx, `
		UPDATE resume_requests SET
			name = ?, email = ?, company = ?, reason = ?, status = ?,
			triage_status = ?, ai_model = ?, legitimacy = ?, legitimacy_reason = ?,
			role_fit_summary = ?, triage_error = ?, triage_attempts = ?,
			hiring_agency = ?, work_type = ?, industry = ?, salary_range = ?, job_posting_url = ?,
			triage_completed_at = ?, decided_at = ?,
			updated_by = ?
		WHERE id = ?`,
		req.Name, req.Email, req.Company, req.Reason, req.Status,
		req.TriageStatus, req.AIModel, req.Legitimacy, req.LegitimacyReason,
		req.RoleFitSummary, req.TriageError, req.TriageAttempts,
		req.HiringAgency, req.WorkType, req.Industry, req.SalaryRange, req.JobPostingURL,
		req.TriageCompletedAt, req.DecidedAt,
		req.UpdatedBy,
		req.ID)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return fmt.Errorf("resume request %s not found", req.ID)
	}

	// Publishing from the one place every mutation already funnels through
	// (rather than a manual publishResumeStatus(req) call at every call
	// site: runTriage's transitions, admin approve/reject/retriage/redact)
	// means a future save path can't forget to push - it publishes by
	// construction. Redact only touches name/email, neither of which are
	// in the payload, so its publish is a harmless no-op update to any
	// open stream, not a special case worth branching around.
	publishResumeStatus(req)

	return nil
}

// buildStatusPayload is the one place the public status shape is defined -
// shared by the plain GET, the SSE stream's initial snapshot, and every
// push through it, so the three can't drift out of sync with each other.
// Deliberately excludes Name/Email/Company/Reason - see the GET handler's
// own comment on why the public queue page never echoes submitted PII back.
func buildStatusPayload(req *ResumeRequest) fiber.Map {
	return fiber.Map{
		"id":                  req.ID,
		"status":              req.Status,
		"created_at":          req.CreatedAt,
		"triage_status":       req.TriageStatus,
		"ai_model":            req.AIModel,
		"legitimacy":          req.Legitimacy,
		"legitimacy_reason":   req.LegitimacyReason,
		"role_fit_summary":    req.RoleFitSummary,
		"triage_completed_at": req.TriageCompletedAt,
		"decided_at":          req.DecidedAt,
	}
}

func publishResumeStatus(req *ResumeRequest) {
	payload, err := json.Marshal(buildStatusPayload(req))
	if err != nil {
		log.Printf("⚠️ Failed to encode status push for %s: %v", req.ID, err)
		return
	}
	resumeStatusHub.publish(req.ID, string(payload))
}
