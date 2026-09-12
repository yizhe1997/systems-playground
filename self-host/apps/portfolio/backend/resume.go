package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/google/uuid"
	"github.com/valyala/fasthttp"
)

// This file is HTTP routing only. The resume-request feature's other
// concerns live in sibling files, split out from what used to be one
// 800+ line resume.go mixing all of it together:
//   - resume_model.go: the ResumeRequest data model and SQLite persistence
//   - resume_retention.go: the 30-day retention sweep
//   - resume_notify.go: outbound notifications - Discord webhook,
//     Filebrowser share links, and email templating/sending
//   - sse.go: the live-status-push hub used by the /stream route below
//   - triage.go: the AI triage call, invoked here via runTriage() but
//     otherwise independent

// resumeRequestLimiter caps submissions per IP. This endpoint isn't just
// spam-prone — every submission fires a real, billed AI triage call (see
// triage.go) and an SMTP send, so a scripted flood has a real cost, not
// just an annoyance. 5/hour is generous for a real applicant (nobody re-submits
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

// resumeStatusLimiter caps status lookups per IP. The id itself is a random
// UUIDv4 (122 bits) so this isn't a realistic brute-force defense - it's
// defense-in-depth against unthrottled ID-guessing/enumeration, since the
// unauthenticated status endpoint had no rate limit at all before this.
// 30/minute comfortably covers the real traffic pattern (ResumeStatusTracker
// polls every 2s while triage is in flight, then stops) with room for a
// requester refreshing the page a few times.
var resumeStatusLimiter = limiter.New(limiter.Config{
	Max:        30,
	Expiration: 1 * time.Minute,
	LimitReached: func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error": "Too many requests. Please try again shortly.",
		})
	},
})

func RegisterResumeRoutes(app *fiber.App) {
	// Public endpoint to submit a new resume request
	app.Post("/api/resume/request", resumeRequestLimiter, func(c *fiber.Ctx) error {
		var req ResumeRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		if req.Name == "" || req.Email == "" || req.Company == "" || req.Reason == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Name, email, hiring company, and reason are required"})
		}

		req.ID = uuid.New().String()
		req.Status = "pending"
		req.CreatedAt = time.Now().UnixMilli()
		req.TriageStatus = "queued"

		_, err := db.ExecContext(c.Context(), `
			INSERT INTO resume_requests (id, name, email, company, reason, status, created_at, triage_status, hiring_agency, work_type, industry, salary_range, job_posting_url)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			req.ID, req.Name, req.Email, req.Company, req.Reason, req.Status, req.CreatedAt, req.TriageStatus,
			req.HiringAgency, req.WorkType, req.Industry, req.SalaryRange, req.JobPostingURL)
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

	// Public: check triage status for the requester's own submission.
	// Deliberately omits name/email/company/reason — the queue page only
	// needs to render workflow state, not echo submitted PII back. Kept
	// around (not replaced by the stream below) as a plain existence/state
	// check - the frontend calls this once before opening the SSE stream
	// (EventSource has no clean way to distinguish "404" from "network
	// hiccup" on its own), and it's the simplest thing for any other
	// non-browser consumer that just wants a snapshot.
	app.Get("/api/resume/status/:id", resumeStatusLimiter, func(c *fiber.Ctx) error {
		req, err := findResumeRequest(c.Context(), c.Params("id"))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to read request"})
		}
		if req == nil {
			return c.Status(404).JSON(fiber.Map{"error": "Request not found"})
		}
		return c.JSON(buildStatusPayload(req))
	})

	// Public: live-push status updates for the requester's own submission.
	// Replaces what used to be client-side polling - the frontend opens one
	// long-lived connection instead of re-fetching on a timer; every save
	// to this row (runTriage's transitions, an admin approve/reject/
	// retriage) publishes to resumeStatusHub, which streams straight
	// through here. Same rate limiter as the plain-fetch endpoint above,
	// guarding against reconnect-storms rather than the connection itself.
	app.Get("/api/resume/status/:id/stream", resumeStatusLimiter, func(c *fiber.Ctx) error {
		id := c.Params("id")
		req, err := findResumeRequest(c.Context(), id)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to read request"})
		}
		if req == nil {
			return c.Status(404).JSON(fiber.Map{"error": "Request not found"})
		}

		c.Set("Content-Type", "text/event-stream")
		c.Set("Cache-Control", "no-cache")
		c.Set("Connection", "keep-alive")

		initial, err := json.Marshal(buildStatusPayload(req))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to encode status"})
		}

		ch := resumeStatusHub.subscribe(id)

		c.Context().SetBodyStreamWriter(fasthttp.StreamWriter(func(w *bufio.Writer) {
			defer resumeStatusHub.unsubscribe(id, ch)

			if _, err := fmt.Fprintf(w, "data: %s\n\n", initial); err != nil || w.Flush() != nil {
				return
			}

			// A heartbeat comment (blank "data" would surface as an empty
			// message to onmessage - a comment line starting with ":" is
			// invisible to EventSource by spec) keeps the connection from
			// looking idle to any intermediary, well under Cloudflare's
			// ~100s idle timeout. The hard cap bounds a goroutine + open
			// connection to one browser tab's realistic max lifetime -
			// EventSource reconnects on its own if this fires while the
			// tab is still open, so nothing is lost, just re-established.
			heartbeat := time.NewTicker(25 * time.Second)
			defer heartbeat.Stop()
			hardCap := time.NewTimer(35 * time.Minute)
			defer hardCap.Stop()

			for {
				select {
				case payload, ok := <-ch:
					if !ok {
						return
					}
					if _, err := fmt.Fprintf(w, "data: %s\n\n", payload); err != nil || w.Flush() != nil {
						return
					}
				case <-heartbeat.C:
					if _, err := fmt.Fprint(w, ": ping\n\n"); err != nil || w.Flush() != nil {
						return
					}
				case <-hardCap.C:
					return
				}
			}
		}))

		return nil
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
			Action      string   `json:"action"` // "approve" or "reject"
			Subject     string   `json:"subject"`
			Body        string   `json:"body"`
			ResumePaths []string `json:"resumePaths"` // Filebrowser paths to attach - required for "approve"
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

			// Which resume(s) to attach is the admin's explicit choice made in
			// the approve dialog, not a fallback default - a silent single
			// "the configured resume" default stopped making sense the moment
			// more than one resume file could exist.
			if len(payload.ResumePaths) == 0 {
				return c.Status(400).JSON(fiber.Map{"error": "Select at least one resume to attach before approving."})
			}

			targetReq.Status = "approved"

			// 1. Ask Filebrowser for a 24h expiring link per selected resume
			links := make([]ResumeLink, 0, len(payload.ResumePaths))
			for _, path := range payload.ResumePaths {
				url, err := generateFilebrowserShareLink(path)
				if err != nil {
					log.Printf("❌ Failed to generate share link for %s: %v", path, err)
					return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Failed to generate a secure link for %s: %v", storedFilenameToDisplayName(filepath.Base(path)), err)})
				}
				links = append(links, ResumeLink{Name: storedFilenameToDisplayName(filepath.Base(path)), URL: url})
			}

			// 2. Send the Email via SendGrid/Resend API
			err = sendEmailViaSMTP(targetReq.Email, targetReq.Name, links, payload.Subject, payload.Body)
			if err != nil {
				log.Printf("❌ Failed to send email: %v", err)
				// A bad {{ }} in the admin's own custom body is a typo, not
				// an SMTP/network problem - surface renderEmailTemplate's
				// actual message instead of the generic one below, so the
				// admin knows to go fix their template instead of retrying
				// blindly against what looks like a delivery failure.
				if strings.Contains(err.Error(), "invalid template syntax") {
					return c.Status(400).JSON(fiber.Map{"error": err.Error() + " - fix the email body and try again. Link(s) were generated."})
				}
				return c.Status(500).JSON(fiber.Map{"error": "Failed to send email. Link(s) were generated."})
			}

		} else if payload.Action == "reject" {
			targetReq.Status = "rejected"
		} else {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid action. Use 'approve' or 'reject'"})
		}

		targetReq.DecidedAt = time.Now().UnixMilli()

		actor := actorFromRequest(c)
		targetReq.UpdatedBy = actor
		if err := saveResumeRequest(ctx, targetReq); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update request status"})
		}
		recordAudit(ctx, actor, "resume_request."+payload.Action, "resume_request", id, targetReq.Name)

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

		actor := actorFromRequest(c)
		targetReq.TriageStatus = "queued"
		targetReq.TriageError = ""
		targetReq.UpdatedBy = actor
		if err := saveResumeRequest(ctx, targetReq); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to requeue triage"})
		}
		recordAudit(ctx, actor, "resume_request.retriage", "resume_request", id, "")

		go runTriage(id)

		return c.JSON(fiber.Map{"status": "success"})
	})

	// Manually redact a single request's PII on demand - the same fields
	// runRetentionSweep clears automatically at 30 days (name, email), just
	// triggered immediately instead of waiting. This is a soft delete: the
	// row and its non-identifying fields (company, reason, status, triage
	// verdict) stay - there's no hard-delete route.
	admin.Post("/requests/:id/redact", func(c *fiber.Ctx) error {
		ctx := c.Context()
		id := c.Params("id")

		targetReq, err := findResumeRequest(ctx, id)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to read requests"})
		}
		if targetReq == nil {
			return c.Status(404).JSON(fiber.Map{"error": "Request not found"})
		}

		actor := actorFromRequest(c)
		targetReq.Name = ""
		targetReq.Email = ""
		targetReq.UpdatedBy = actor
		if err := saveResumeRequest(ctx, targetReq); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to redact request"})
		}
		recordAudit(ctx, actor, "resume_request.redact", "resume_request", id, "")

		return c.JSON(fiber.Map{"status": "success", "request": targetReq})
	})

	startRetentionSweep()
}
