package api

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"tradecraft/internal/store"
)

// The gate in front of POST /mcp (feature 003). It is not the owner's gate: it takes an agent token, never a service
// token, and an agent token is refused by every owner route. Checked in this order, and the first failure names the
// refusal in the audit log; the caller always gets the same answer.
//
//  1. A request carrying an Origin header is a web page, not an agent: refused at once (403), recorded as
//     "Browser request". A page cannot know a token anyway; this is the second layer.
//  2. The token is looked up by the SHA-256 of what was presented.
//  3. Agent access is on.   4. The token is known.   5. It is not revoked.   6. Its creator identity is active.

var errNotSignedIn = &apiError{status: http.StatusUnauthorized, Code: "unauthorized", Message: "Not signed in."}

// agentToken is the Fiber middleware for /mcp.
func (s *Server) agentToken() fiber.Handler {
	return func(c *fiber.Ctx) error {
		ctx := c.Context()
		// the id of an accepted token travels to the tools in this header; a caller's own copy is never trusted
		c.Request().Header.Del(agentHeader)

		if c.Get("Origin") != "" {
			s.agentRefused(c, nil, "Browser request")
			return &apiError{status: http.StatusForbidden, Code: "forbidden", Message: "Not allowed."}
		}

		var row *store.AgentTokenByHashRow
		// the scheme name is case-insensitive (RFC 9110); the value is not
		auth := strings.TrimSpace(c.Get("Authorization"))
		if len(auth) > 7 && strings.EqualFold(auth[:7], "bearer ") && strings.TrimSpace(auth[7:]) != "" {
			r, err := s.q.AgentTokenByHash(ctx, hashToken(strings.TrimSpace(auth[7:])))
			switch {
			case err == nil:
				row = &r
			case !errors.Is(err, pgx.ErrNoRows):
				return err
			}
		}
		enabled, err := s.q.GetAgentAccess(ctx)
		if err != nil {
			return err
		}
		reason := ""
		switch {
		case !enabled:
			reason = "Access off"
		case row == nil:
			reason = "Unknown token"
		case row.RevokedAt != nil:
			reason = "Revoked token"
		case row.CreatorDisabled:
			reason = "Identity disabled"
		}
		if reason != "" {
			s.agentRefused(c, row, reason)
			return errNotSignedIn
		}
		if err := s.q.TouchAgentToken(ctx, row.ID); err != nil {
			return err
		}
		c.Request().Header.Set(agentHeader, row.ID)
		return c.Next()
	}
}

// A refusal is one row of an append-only log that is never trimmed, and anything that can reach this port can cause one,
// a web page the owner has open included. So the rows an unauthenticated caller can make are capped: a burst of
// refusalBurst, then one more every refusalEvery. The caller is refused all the same; a refusal that is not written is
// counted in the server log (never with the token).
const (
	refusalBurst = 30
	refusalEvery = 10 * time.Second
)

type refusalLimiter struct {
	mu      sync.Mutex
	tokens  float64
	last    time.Time
	dropped int
}

// allow reports whether one more refusal may be written now.
func (l *refusalLimiter) allow(now time.Time) (ok bool, dropped int) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.last.IsZero() {
		l.tokens = refusalBurst
	} else {
		l.tokens = min(refusalBurst, l.tokens+now.Sub(l.last).Seconds()/refusalEvery.Seconds())
	}
	l.last = now
	if l.tokens < 1 {
		l.dropped++
		return false, 0
	}
	l.tokens--
	dropped, l.dropped = l.dropped, 0
	return true, dropped
}

// agentRefused records one refused request. It is best effort: the caller is refused either way. An entry names the
// token (as an agent acting for its creator) only when the token is known; otherwise it is a system entry.
func (s *Server) agentRefused(c *fiber.Ctx, row *store.AgentTokenByHashRow, reason string) {
	slog.Warn("agent.refused", "reason", reason) // never the token
	ok, dropped := s.refusals.allow(time.Now())
	if !ok {
		return // over the cap: refused, counted in the next row's log line
	}
	if dropped > 0 {
		slog.Warn("agent.refused rows not written", "count", dropped)
	}
	ev := auditEvent{Actor: "system", Kind: "agent_refused", Subject: reason}
	if row != nil {
		by := row.CreatedBy
		ev.Actor, ev.IdentityID, ev.Label = "agent", &by, row.Name
	}
	if err := recordAudit(c.Context(), s.q, ev); err != nil {
		slog.Error("agent refusal not recorded", "reason", reason, "err", err)
	}
}
