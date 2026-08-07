package main

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/smtp"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/google/uuid"
)

// resumeRequestLimiter caps submissions per IP. This endpoint isn't just
// spam-prone — every submission fires a real, billed Claude Haiku triage
// call and an SMTP send, so a scripted flood has a real cost, not just an
// annoyance. 5/hour is generous for a real applicant (nobody re-submits
// that often) and expensive for a bot.
var resumeRequestLimiter = limiter.New(limiter.Config{
	Max:        5,
	Expiration: 1 * time.Hour,
	LimitReached: func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error": "Too many requests. Please try again later.",
		})
	},
})

type ResumeRequest struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Company   string `json:"company"`
	Reason    string `json:"reason"`
	Status    string `json:"status"` // pending, approved, rejected
	CreatedAt int64  `json:"created_at"`

	// AI triage — set by runTriage() in triage.go
	TriageStatus     string `json:"triage_status"` // queued, processing, complete, failed
	AIModel          string `json:"ai_model,omitempty"`
	Legitimacy       string `json:"legitimacy,omitempty"` // legit, suspicious, spam
	LegitimacyReason string `json:"legitimacy_reason,omitempty"`
	RoleFitSummary   string `json:"role_fit_summary,omitempty"`
	TriageError      string `json:"triage_error,omitempty"`
	TriageAttempts   int    `json:"triage_attempts,omitempty"`
}

const resumeRequestColumns = `id, name, email, company, reason, status, created_at,
	triage_status, ai_model, legitimacy, legitimacy_reason, role_fit_summary,
	triage_error, triage_attempts`

func scanResumeRequest(row interface{ Scan(...any) error }) (*ResumeRequest, error) {
	var r ResumeRequest
	err := row.Scan(&r.ID, &r.Name, &r.Email, &r.Company, &r.Reason, &r.Status, &r.CreatedAt,
		&r.TriageStatus, &r.AIModel, &r.Legitimacy, &r.LegitimacyReason, &r.RoleFitSummary,
		&r.TriageError, &r.TriageAttempts)
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
			role_fit_summary = ?, triage_error = ?, triage_attempts = ?
		WHERE id = ?`,
		req.Name, req.Email, req.Company, req.Reason, req.Status,
		req.TriageStatus, req.AIModel, req.Legitimacy, req.LegitimacyReason,
		req.RoleFitSummary, req.TriageError, req.TriageAttempts,
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
	return nil
}

func RegisterResumeRoutes(app *fiber.App) {
	// Public endpoint to submit a new resume request
	app.Post("/api/resume/request", resumeRequestLimiter, func(c *fiber.Ctx) error {
		var req ResumeRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		if req.Name == "" || req.Email == "" || req.Company == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Name, email, and company are required"})
		}

		req.ID = uuid.New().String()
		req.Status = "pending"
		req.CreatedAt = time.Now().UnixMilli()
		req.TriageStatus = "queued"

		_, err := db.ExecContext(c.Context(), `
			INSERT INTO resume_requests (id, name, email, company, reason, status, created_at, triage_status)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
			req.ID, req.Name, req.Email, req.Company, req.Reason, req.Status, req.CreatedAt, req.TriageStatus)
		if err != nil {
			log.Printf("❌ Failed to save resume request: %v", err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to save request"})
		}

		log.Printf("📩 New resume request from %s (%s)", req.Name, req.Company)

		// Fire Webhook Notification (e.g. Discord/Slack)
		webhookUrl := os.Getenv("RESUME_WEBHOOK_URL")
		if webhookUrl != "" {
			go fireNotificationWebhook(webhookUrl, req)
		}

		// Requester shouldn't have to keep the tab open to see how it went -
		// send a tracking link they can come back to from any device.
		go sendRequestReceivedEmail(req.Email, req.Name, req.ID)

		go runTriage(req.ID)

		return c.Status(201).JSON(fiber.Map{"status": "success", "id": req.ID})
	})

	// Public: poll triage status for the requester's own submission.
	// Deliberately omits name/email/company/reason — the queue page only
	// needs to render workflow state, not echo submitted PII back.
	app.Get("/api/resume/status/:id", func(c *fiber.Ctx) error {
		req, err := findResumeRequest(c.Context(), c.Params("id"))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to read request"})
		}
		if req == nil {
			return c.Status(404).JSON(fiber.Map{"error": "Request not found"})
		}
		return c.JSON(fiber.Map{
			"id":                req.ID,
			"status":            req.Status,
			"triage_status":     req.TriageStatus,
			"ai_model":          req.AIModel,
			"legitimacy":        req.Legitimacy,
			"legitimacy_reason": req.LegitimacyReason,
			"role_fit_summary":  req.RoleFitSummary,
		})
	})

	// Protected Admin Routes
	admin := app.Group("/admin/resume", authMiddleware)

	// List all requests
	admin.Get("/requests", func(c *fiber.Ctx) error {
		rows, err := db.QueryContext(c.Context(), "SELECT "+resumeRequestColumns+" FROM resume_requests ORDER BY created_at DESC")
		if err != nil {
			return c.JSON([]ResumeRequest{})
		}
		defer rows.Close()

		requests := make([]ResumeRequest, 0)
		for rows.Next() {
			req, err := scanResumeRequest(rows)
			if err != nil {
				continue
			}
			requests = append(requests, *req)
		}

		return c.JSON(requests)
	})

	// Approve or Reject a request
	admin.Post("/requests/:id/action", func(c *fiber.Ctx) error {
		id := c.Params("id")

		type ActionPayload struct {
			Action  string `json:"action"` // "approve" or "reject"
			Subject string `json:"subject"`
			Body    string `json:"body"`
		}
		var payload ActionPayload
		if err := c.BodyParser(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid action payload"})
		}

		ctx := c.Context()
		targetReq, err := findResumeRequest(ctx, id)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to read requests"})
		}
		if targetReq == nil {
			return c.Status(404).JSON(fiber.Map{"error": "Request not found"})
		}

		// Process Action
		if payload.Action == "approve" {
			// A request left "pending" for 30+ days gets its contact info
			// anonymized by the retention sweep (see runRetentionSweep) but
			// keeps its status - there's no email left to deliver a link to,
			// so fail clearly here instead of attempting (and silently
			// failing) an SMTP send to an empty recipient.
			if targetReq.Email == "" {
				return c.Status(400).JSON(fiber.Map{"error": "This request's contact info was anonymized after 30 days and can no longer be approved"})
			}

			targetReq.Status = "approved"

			// 1. Ask Filebrowser for a 24h expiring link
			shareLink, err := generateFilebrowserShareLink(ctx)
			if err != nil {
				log.Printf("❌ Failed to generate share link: %v", err)
				return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Failed to generate secure link: %v", err)})
			}

			// 2. Send the Email via SendGrid/Resend API
			err = sendEmailViaSMTP(targetReq.Email, targetReq.Name, shareLink, payload.Subject, payload.Body)
			if err != nil {
				log.Printf("❌ Failed to send email: %v", err)
				return c.Status(500).JSON(fiber.Map{"error": "Failed to send email. Link was generated."})
			}

		} else if payload.Action == "reject" {
			targetReq.Status = "rejected"
		} else {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid action. Use 'approve' or 'reject'"})
		}

		if err := saveResumeRequest(ctx, targetReq); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update request status"})
		}

		return c.JSON(fiber.Map{"status": "success", "request": targetReq})
	})

	// Requeue a failed (or stuck) AI triage call
	admin.Post("/requests/:id/retriage", func(c *fiber.Ctx) error {
		ctx := c.Context()
		id := c.Params("id")

		targetReq, err := findResumeRequest(ctx, id)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to read requests"})
		}
		if targetReq == nil {
			return c.Status(404).JSON(fiber.Map{"error": "Request not found"})
		}

		targetReq.TriageStatus = "queued"
		targetReq.TriageError = ""
		if err := saveResumeRequest(ctx, targetReq); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to requeue triage"})
		}

		go runTriage(id)

		return c.JSON(fiber.Map{"status": "success"})
	})

	startRetentionSweep()
}

// startRetentionSweep runs an immediate sweep, then repeats daily. The
// retention window is 30 days from CreatedAt for every request regardless of
// status — a failed or never-resolved request is anonymized on the same
// clock as a resolved one, since a stale pending request is either spam or
// something forgotten, not something worth holding identifiable data on
// indefinitely.
func startRetentionSweep() {
	go func() {
		runRetentionSweep(context.Background())
		ticker := time.NewTicker(24 * time.Hour)
		for range ticker.C {
			runRetentionSweep(context.Background())
		}
	}()
}

// runRetentionSweep anonymizes (not deletes) requests older than 30 days:
// name, email, and reason — the fields that can identify or contain
// free-text PII about the requester — are cleared, while company, status,
// and the triage/legitimacy verdict survive so conversion/volume trends
// stay analyzable without retaining anyone's contact info. The WHERE clause
// doubles as the idempotency check: email is required at submission time
// (see the POST handler), so `email != ''` is exactly "not yet anonymized"
// and re-running this daily against already-anonymized rows is a no-op.
func runRetentionSweep(ctx context.Context) {
	if db == nil {
		return
	}

	cutoff := time.Now().AddDate(0, 0, -30).UnixMilli()
	res, err := db.ExecContext(ctx, `
		UPDATE resume_requests SET name = '', email = '', reason = ''
		WHERE created_at < ? AND email != ''`, cutoff)
	if err != nil {
		log.Printf("⚠️ Retention sweep: failed to anonymize resume_requests: %v", err)
		return
	}

	anonymized, err := res.RowsAffected()
	if err != nil || anonymized == 0 {
		return
	}

	log.Printf("🧹 Retention sweep: anonymized %d resume request(s) older than 30 days", anonymized)
}

// ---------------------------------------------
// Helper Functions
// ---------------------------------------------

func fireNotificationWebhook(url string, req ResumeRequest) {
	payload := map[string]any{
		"content": fmt.Sprintf("🚨 **New Resume Request!**\n**Name:** %s\n**Company:** %s\n**Reason:** %s\n\nLogin to the Control Plane to approve.", req.Name, req.Company, req.Reason),
	}
	jsonPayload, _ := json.Marshal(payload)
	http.Post(url, "application/json", bytes.NewBuffer(jsonPayload))
}

func generateFilebrowserShareLink(ctx context.Context) (string, error) {
	// Get internal filebrowser API token
	token, err := getFilebrowserToken()
	if err != nil {
		return "", err
	}

	fbUrl := filebrowserPublicURL()

	// Fetch dynamic path from Redis global settings
	resumePath, err := GetConfig(ctx, "resumeUrl", "/resume.pdf")
	if err != nil || resumePath == "" {
		resumePath = "/resume.pdf"
	}

	// Ensure the path starts with a slash
	if len(resumePath) > 0 && resumePath[0] != '/' {
		resumePath = "/" + resumePath
	}

	// Post to /api/share/{path}
	payload := map[string]any{
		"password": "",
		"expires":  "24", // 24 hour expiration
		"unit":     "hours",
	}
	jsonPayload, _ := json.Marshal(payload)

	reqUrl := fmt.Sprintf("%s/api/share%s", fbUrl, resumePath)
	req, _ := http.NewRequest("POST", reqUrl, bytes.NewBuffer(jsonPayload))
	req.Header.Set("X-Auth", token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("filebrowser rejected share request: %d", resp.StatusCode)
	}

	// The API returns an object with a "hash" string
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	hash, ok := result["hash"].(string)
	if !ok {
		return "", fmt.Errorf("no hash returned from filebrowser")
	}

	// Distinct from fbUrl above: that's the Docker-internal address this
	// backend uses to reach Filebrowser (host.docker.internal), but this URL
	// is emailed to a human and opened in their browser, so its fallback
	// must be something actually reachable from outside the container.
	publicDomain := os.Getenv("FILEBROWSER_PUBLIC_URL")
	if publicDomain == "" {
		publicDomain = "http://localhost:8088"
	}

	return fmt.Sprintf("%s/share/%s", publicDomain, hash), nil
}

func sendEmailViaSMTP(toEmail string, name string, shareLink string, customSubject string, customBody string) error {
	smtpEmail := os.Getenv("SMTP_EMAIL")
	smtpPassword := os.Getenv("SMTP_PASSWORD")

	if smtpEmail == "" || smtpPassword == "" {
		log.Println("⚠️ SMTP credentials not set. Skipping actual email dispatch (Simulation Mode).")
		log.Printf("📩 SIMULATED EMAIL TO %s: Here is your link: %s\n", toEmail, shareLink)
		return nil
	}

	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	auth := smtp.PlainAuth("", smtpEmail, smtpPassword, smtpHost)

	from := smtpEmail
	to := []string{toEmail}

	subjectLine := customSubject
	if subjectLine == "" {
		subjectLine = "Chin Yi Zhe - Requested Resume"
	}
	subject := "Subject: " + subjectLine + "\r\n"

	mime := "MIME-version: 1.0;\r\nContent-Type: text/html; charset=\"UTF-8\";\r\n\r\n"

	body := customBody
	if body == "" {
		body = fmt.Sprintf("<p>Hi %s,</p><p>Thank you for your interest! As requested, here is the link to download my resume.</p><p><a href='%s'>Download Resume (Expires in 24 hours)</a></p><p>Best regards,<br/>Chin Yi Zhe</p>", name, shareLink)
	} else {
		// Replace line breaks with HTML line breaks and inject variables
		body = strings.ReplaceAll(body, "\n", "<br/>")
		body = strings.ReplaceAll(body, "{{name}}", name)
		body = strings.ReplaceAll(body, "{{link}}", fmt.Sprintf("<a href='%s'>Download Resume (Expires in 24 hours)</a>", shareLink))
		body = strings.ReplaceAll(body, "{{raw_link}}", shareLink)
	}

	msg := []byte("From: " + from + "\r\nTo: " + toEmail + "\r\n" + subject + mime + body)

	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, from, to, msg)
	if err != nil {
		return fmt.Errorf("smtp error: %v", err)
	}

	return nil
}

// sendRequestReceivedEmail confirms the submission and gives the requester a
// link back to the live status page - they shouldn't have to keep the tab
// open while a human reviews the request.
func sendRequestReceivedEmail(toEmail string, name string, requestID string) {
	statusURL := fmt.Sprintf("%s/resume/status/%s", frontendPublicURL(), requestID)

	smtpEmail := os.Getenv("SMTP_EMAIL")
	smtpPassword := os.Getenv("SMTP_PASSWORD")
	if smtpEmail == "" || smtpPassword == "" {
		log.Printf("📩 SIMULATED EMAIL TO %s: Track your request here: %s\n", toEmail, statusURL)
		return
	}

	smtpHost := "smtp.gmail.com"
	smtpPort := "587"
	auth := smtp.PlainAuth("", smtpEmail, smtpPassword, smtpHost)

	subject := "Subject: Chin Yi Zhe - Resume request received\r\n"
	mime := "MIME-version: 1.0;\r\nContent-Type: text/html; charset=\"UTF-8\";\r\n\r\n"
	body := fmt.Sprintf(
		"<p>Hi %s,</p><p>Got your resume request - it's being triaged and reviewed now.</p><p><a href='%s'>Track its status here</a></p><p>Best regards,<br/>Chin Yi Zhe</p>",
		name, statusURL,
	)
	msg := []byte("From: " + smtpEmail + "\r\nTo: " + toEmail + "\r\n" + subject + mime + body)

	if err := smtp.SendMail(smtpHost+":"+smtpPort, auth, smtpEmail, []string{toEmail}, msg); err != nil {
		log.Printf("⚠️ Failed to send request-received email to %s: %v", toEmail, err)
	}
}

func frontendPublicURL() string {
	url := os.Getenv("FRONTEND_PUBLIC_URL")
	if url == "" {
		return "http://localhost:8086"
	}
	return url
}
