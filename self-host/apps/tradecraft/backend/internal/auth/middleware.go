package auth

import (
	"errors"
	"log/slog"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"tradecraft/internal/store"
)

// StepUpRequiredCode is the machine-readable code of the 403 a step-up route answers, so clients branch on it
// instead of on the message text.
const StepUpRequiredCode = "step_up_required"

const (
	claimsKey   = "auth.claims"
	identityKey = "auth.identity"
)

// Gate holds what the middleware needs. One per running app.
type Gate struct {
	secret  string
	q       *store.Queries
	now     func() time.Time
	replays *replayGuard
}

// NewGate builds the gate. now is the wall clock (tokens speak of real time, not the journal's pinned clock).
func NewGate(secret string, q *store.Queries, now func() time.Time) *Gate {
	if now == nil {
		now = time.Now
	}
	return &Gate{secret: secret, q: q, now: now, replays: newReplayGuard()}
}

// reject answers the one body every authentication failure gets (no hint about why) and logs the real reason.
func reject(c *fiber.Ctx, reason string, err error) error {
	slog.Warn("auth.rejected", "reason", reason, "err", err, "method", c.Method(), "path", c.Path())
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"code": "unauthorized", "message": "Not signed in."})
}

func bearer(c *fiber.Ctx) (string, bool) {
	h := c.Get("Authorization")
	const p = "Bearer "
	if !strings.HasPrefix(h, p) {
		return "", false
	}
	return strings.TrimPrefix(h, p), true
}

// verified runs the checks every role shares: a bearer token with a good signature, expiry, bounds and audience,
// the expected role, and a jti not seen before.
func (g *Gate) verified(c *fiber.Ctx, role string) (Claims, bool) {
	tok, ok := bearer(c)
	if !ok {
		_ = reject(c, "missing bearer token", nil)
		return Claims{}, false
	}
	now := g.now()
	claims, err := Verify(tok, g.secret, now)
	if err != nil {
		_ = reject(c, "token verify failed", err)
		return Claims{}, false
	}
	if claims.Role != role {
		_ = reject(c, "wrong role", nil)
		return Claims{}, false
	}
	if !g.replays.firstUse(claims.Jti, claims.Exp, now) {
		_ = reject(c, "token replayed", nil)
		return Claims{}, false
	}
	return claims, true
}

// System admits only the /internal routes: a token with role system, which only web-tier code can sign.
func (g *Gate) System() fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims, ok := g.verified(c, RoleSystem)
		if !ok {
			return nil
		}
		c.Locals(claimsKey, claims)
		return c.Next()
	}
}

// Owner admits an ordinary request: a good token for an identity that exists and is active, whose session is
// under SessionMaxAge old and was not ended by a sign-out. It re-checks the database on every request, so
// disabling an identity or signing out takes effect at once.
func (g *Gate) Owner() fiber.Handler {
	return func(c *fiber.Ctx) error {
		claims, ok := g.verified(c, RoleOwner)
		if !ok {
			return nil
		}
		identity, err := g.q.IdentityByEmail(c.Context(), NormaliseEmail(claims.Sub))
		if errors.Is(err, pgx.ErrNoRows) {
			return reject(c, "unknown identity", nil)
		}
		if err != nil {
			// A database failure is not an authentication failure: it still fails closed, but as a 500 that is
			// logged, not a 401 that hides the outage.
			slog.Error("identity lookup failed", "path", c.Path(), "err", err)
			return fiber.NewError(fiber.StatusInternalServerError, "could not verify identity")
		}
		if identity.DisabledAt != nil {
			return reject(c, "identity disabled", nil)
		}
		if claims.SessionAt == 0 {
			return reject(c, "no session time", nil)
		}
		if g.now().Sub(time.UnixMilli(claims.SessionAt)) >= SessionMaxAge {
			return reject(c, "session too old", nil)
		}
		if claims.SessionAt < identity.SessionsValidAfter.UnixMilli() {
			return reject(c, "session ended by sign-out", nil)
		}
		c.Locals(claimsKey, claims)
		c.Locals(identityKey, identity)
		return c.Next()
	}
}

// RequireStepUp guards the identity routes on top of Owner: the Google confirmation must be within StepUpWindow.
func (g *Gate) RequireStepUp() fiber.Handler {
	return func(c *fiber.Ctx) error {
		at := ClaimsFrom(c).StepUpAt
		if at == 0 || g.now().Sub(time.UnixMilli(at)) >= StepUpWindow {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"code":    StepUpRequiredCode,
				"message": "A recent Google confirmation is needed first. Nothing was changed.",
			})
		}
		return c.Next()
	}
}

// ClaimsFrom returns the claims a preceding gate handler verified.
func ClaimsFrom(c *fiber.Ctx) Claims {
	v, _ := c.Locals(claimsKey).(Claims)
	return v
}

// IdentityFrom returns the identity Owner resolved.
func IdentityFrom(c *fiber.Ctx) (store.Identity, bool) {
	v, ok := c.Locals(identityKey).(store.Identity)
	return v, ok
}

// NormaliseEmail is how an address is compared and stored: trimmed and lower case.
func NormaliseEmail(s string) string { return strings.ToLower(strings.TrimSpace(s)) }
