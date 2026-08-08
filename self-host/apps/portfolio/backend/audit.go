package main

import (
	"context"
	"log/slog"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// actorFromRequest identifies which admin made this call. The backend itself
// has no identity concept beyond the shared ADMIN_API_KEY - it's the Next.js
// proxy routes that know the authenticated Google session, and they set this
// header from session.user.email on every admin write. A call that skips the
// frontend (e.g. curl with the raw token) legitimately has no identity to
// report, hence the fallback.
func actorFromRequest(c *fiber.Ctx) string {
	if actor := c.Get("X-Admin-User"); actor != "" {
		return actor
	}
	return "unknown"
}

// recordAudit writes one row to audit_log and emits a matching structured
// log line. The table is the queryable "who did X and when" record; the log
// line rides the same path every other structured log takes into the
// existing Loki/Grafana pipeline (see infra/observability), so an admin
// action can be cross-referenced against the HTTP request that triggered it
// without a second logging system.
func recordAudit(ctx context.Context, actor, action, targetType, targetID, detail string) {
	if db != nil {
		_, err := db.ExecContext(ctx, `
			INSERT INTO audit_log (id, created_at, actor, action, target_type, target_id, detail)
			VALUES (?, ?, ?, ?, ?, ?, ?)`,
			uuid.New().String(), time.Now().UnixMilli(), actor, action, targetType, targetID, detail)
		if err != nil {
			slog.Error("audit log write failed", "action", action, "actor", actor, "error", err)
		}
	}
	slog.Info("admin.action", "actor", actor, "action", action, "target_type", targetType, "target_id", targetID, "detail", detail)
}
