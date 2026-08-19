package main

import (
	"context"
	"database/sql"
	"log"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/google/uuid"
)

// newLeadLimiter builds the rate limiter applied to POST /api/leads - caps
// submissions per IP, much less expensive per-submission than the resume
// request flow (no AI triage, no SMTP send here), but still worth capping
// against a scripted flood filling the table with junk. Factored out (not
// just a package-level literal) so tests can rebuild a fresh instance
// per-test instead of sharing one accumulating hit counter across the whole
// test binary run.
func newLeadLimiter() fiber.Handler {
	return limiter.New(limiter.Config{
		Max:        5,
		Expiration: 1 * time.Hour,
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Too many requests. Please try again later.",
			})
		},
	})
}

var leadLimiter = newLeadLimiter()

var emailPattern = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

type Lead struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Message   string `json:"message"`
	Status    string `json:"status"` // new, contacted, archived
	CreatedAt int64  `json:"created_at"`
}

const leadColumns = `id, name, email, message, status, created_at`

func scanLead(row interface{ Scan(...any) error }) (*Lead, error) {
	var l Lead
	if err := row.Scan(&l.ID, &l.Name, &l.Email, &l.Message, &l.Status, &l.CreatedAt); err != nil {
		return nil, err
	}
	return &l, nil
}

func findLead(ctx context.Context, id string) (*Lead, error) {
	row := db.QueryRowContext(ctx, "SELECT "+leadColumns+" FROM leads WHERE id = ?", id)
	lead, err := scanLead(row)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return lead, nil
}

func RegisterLeadRoutes(app *fiber.App) {
	// Public: submit the "Interested in working together?" form.
	app.Post("/api/leads", leadLimiter, func(c *fiber.Ctx) error {
		var req Lead
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		if req.Email == "" || !emailPattern.MatchString(req.Email) {
			return c.Status(400).JSON(fiber.Map{"error": "A valid email is required"})
		}
		if strings.TrimSpace(req.Message) == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Message is required"})
		}

		req.ID = uuid.New().String()
		req.Status = "new"
		req.CreatedAt = time.Now().UnixMilli()

		_, err := db.ExecContext(c.Context(), `
			INSERT INTO leads (id, name, email, message, status, created_at)
			VALUES (?, ?, ?, ?, ?, ?)`,
			req.ID, req.Name, req.Email, req.Message, req.Status, req.CreatedAt)
		if err != nil {
			log.Printf("❌ Failed to save lead: %v", err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to save request"})
		}

		log.Printf("🤝 New lead from %s", req.Email)

		return c.Status(201).JSON(fiber.Map{"status": "success", "id": req.ID})
	})

	admin := app.Group("/admin/leads", authMiddleware)

	admin.Get("/", func(c *fiber.Ctx) error {
		rows, err := db.QueryContext(c.Context(), "SELECT "+leadColumns+" FROM leads ORDER BY created_at DESC")
		if err != nil {
			return c.JSON([]Lead{})
		}
		defer rows.Close()

		leads := make([]Lead, 0)
		for rows.Next() {
			lead, err := scanLead(rows)
			if err != nil {
				continue
			}
			leads = append(leads, *lead)
		}
		return c.JSON(leads)
	})

	// Update the operator-facing status tracker (new/contacted/archived) -
	// this doesn't gate anything automated, it's purely so the admin table
	// can distinguish "haven't looked at this yet" from "already emailed them".
	admin.Post("/:id/status", func(c *fiber.Ctx) error {
		ctx := c.Context()
		id := c.Params("id")

		type StatusPayload struct {
			Status string `json:"status"`
		}
		var payload StatusPayload
		if err := c.BodyParser(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}
		if payload.Status != "new" && payload.Status != "contacted" && payload.Status != "archived" {
			return c.Status(400).JSON(fiber.Map{"error": "Status must be 'new', 'contacted', or 'archived'"})
		}

		lead, err := findLead(ctx, id)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to read lead"})
		}
		if lead == nil {
			return c.Status(404).JSON(fiber.Map{"error": "Lead not found"})
		}

		if _, err := db.ExecContext(ctx, "UPDATE leads SET status = ? WHERE id = ?", payload.Status, id); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update status"})
		}

		actor := actorFromRequest(c)
		recordAudit(ctx, actor, "lead.status."+payload.Status, "lead", id, "")

		lead.Status = payload.Status
		return c.JSON(fiber.Map{"status": "success", "lead": lead})
	})

	// Manually redact a lead's PII on demand - the same fields
	// runLeadRetentionSweep clears automatically at 30 days. Soft delete:
	// the row and its status stay, there's no hard-delete route.
	admin.Post("/:id/redact", func(c *fiber.Ctx) error {
		ctx := c.Context()
		id := c.Params("id")

		lead, err := findLead(ctx, id)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to read lead"})
		}
		if lead == nil {
			return c.Status(404).JSON(fiber.Map{"error": "Lead not found"})
		}

		if _, err := db.ExecContext(ctx, "UPDATE leads SET name = '', email = '', message = '' WHERE id = ?", id); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to redact lead"})
		}

		actor := actorFromRequest(c)
		recordAudit(ctx, actor, "lead.redact", "lead", id, "")

		lead.Name, lead.Email, lead.Message = "", "", ""
		return c.JSON(fiber.Map{"status": "success", "lead": lead})
	})

	startLeadRetentionSweep()
}

// startLeadRetentionSweep mirrors startRetentionSweep in resume.go - an
// immediate sweep, then daily. Same 30-day window from CreatedAt regardless
// of status: an ignored or archived lead is anonymized on the same clock as
// one that was already contacted.
func startLeadRetentionSweep() {
	go func() {
		runLeadRetentionSweep(context.Background())
		ticker := time.NewTicker(24 * time.Hour)
		for range ticker.C {
			runLeadRetentionSweep(context.Background())
		}
	}()
}

// runLeadRetentionSweep anonymizes (not deletes) leads older than 30 days:
// name, email, and message all get cleared - unlike resume_requests, there's
// no separate non-identifying field worth preserving here (no company/reason
// split; the message itself is the only content, and it's free text that
// could contain identifying details). status survives, so volume trends stay
// visible. email != '' doubles as the idempotency check, same as resume.go.
func runLeadRetentionSweep(ctx context.Context) {
	if db == nil {
		return
	}

	cutoff := time.Now().AddDate(0, 0, -30).UnixMilli()
	res, err := db.ExecContext(ctx, `
		UPDATE leads SET name = '', email = '', message = ''
		WHERE created_at < ? AND email != ''`, cutoff)
	if err != nil {
		log.Printf("⚠️ Retention sweep: failed to anonymize leads: %v", err)
		return
	}

	anonymized, err := res.RowsAffected()
	if err != nil || anonymized == 0 {
		return
	}

	log.Printf("🧹 Retention sweep: anonymized %d lead(s) older than 30 days", anonymized)
}
