package api

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"tradecraft/internal/auth"
	"tradecraft/internal/store"
)

// The /internal routes are called by web-tier code only, with a system token. They decide a sign-in, end sessions
// and accept a Google confirmation; the browser can never reach them (the web tier's pass-through has an allow-list).

type signInInput struct {
	Email         string `json:"email"`
	ProviderSub   string `json:"providerSub"`
	EmailVerified bool   `json:"emailVerified"`
}

type sessionTimesJSON struct {
	Email     string `json:"email"`
	SessionAt int64  `json:"sessionAt"`
	StepUpAt  int64  `json:"stepUpAt"`
}

// refusal is the one answer for a sign-in that is not accepted, whatever the reason (FR-003).
func refusal() *apiError {
	return &apiError{status: http.StatusForbidden, Code: "refused", Message: "You can't sign in with that account."}
}

// internalSignIn decides whether the Google account that has just authenticated may be the owner: the email must
// be verified and belong to an active identity, and the provider's subject is stored on the first accepted sign-in
// and must match afterwards (FR-003, FR-004). It records sign_in or sign_in_refused, best effort.
func (s *Server) internalSignIn(c *fiber.Ctx) error {
	var in signInInput
	if err := readBody(c, &in); err != nil {
		return err
	}
	ctx := c.Context()
	deny := func(reason string) error {
		slog.Warn("sign-in refused", "reason", reason)
		writeAudit(ctx, s.q, auditEvent{Actor: "system", Kind: "sign_in_refused", Subject: cleanAttempted(in.Email)})
		return refusal()
	}
	email := auth.NormaliseEmail(in.Email)
	if !in.EmailVerified || email == "" || in.ProviderSub == "" || len(in.ProviderSub) > 255 {
		return deny("unverified or incomplete")
	}
	id, err := s.q.IdentityByEmail(ctx, email)
	if errors.Is(err, pgx.ErrNoRows) {
		return deny("not on the list")
	}
	if err != nil {
		return err
	}
	if id.DisabledAt != nil {
		return deny("identity disabled")
	}
	switch {
	case id.ProviderSub == nil:
		n, err := s.q.PinIdentityProviderSub(ctx, store.PinIdentityProviderSubParams{ID: id.ID, ProviderSub: in.ProviderSub})
		if err != nil {
			return err
		}
		if n == 0 { // a concurrent first sign-in won: read again and compare
			again, err := s.q.IdentityByID(ctx, id.ID)
			if err != nil {
				return err
			}
			if again.ProviderSub == nil || *again.ProviderSub != in.ProviderSub {
				return deny("different Google account")
			}
		}
	case *id.ProviderSub != in.ProviderSub:
		return deny("different Google account")
	}
	if err := s.q.TouchIdentitySignIn(ctx, id.ID); err != nil {
		return err
	}
	ms, err := s.q.DatabaseNowMillis(ctx)
	if err != nil {
		return err
	}
	writeAudit(ctx, s.q, auditEvent{Actor: "owner", IdentityID: &id.ID, Kind: "sign_in", Subject: id.Email})
	return c.JSON(sessionTimesJSON{Email: id.Email, SessionAt: ms, StepUpAt: ms})
}

// internalSignOut ends every session of the identity now: a session issued before this moment stops counting at
// its next request (FR-005). An unknown address is a quiet success.
func (s *Server) internalSignOut(c *fiber.Ctx) error {
	var in struct {
		Email string `json:"email"`
	}
	if err := readBody(c, &in); err != nil {
		return err
	}
	ctx := c.Context()
	id, err := s.q.IdentityByEmail(ctx, auth.NormaliseEmail(in.Email))
	if errors.Is(err, pgx.ErrNoRows) {
		return c.SendStatus(http.StatusNoContent)
	}
	if err != nil {
		return err
	}
	if err := s.q.EndIdentitySessions(ctx, id.ID); err != nil {
		return err
	}
	writeAudit(ctx, s.q, auditEvent{Actor: "owner", IdentityID: &id.ID, Kind: "sign_out", Subject: id.Email})
	return c.SendStatus(http.StatusNoContent)
}

// internalStepUp accepts a fresh Google confirmation for the identity of the current session: the subject of the
// Google account that has just authenticated must be the one stored on that identity. A confirmation is a fresh
// sign-in (FR-005, clarified), so it starts a new session time as well as a new step-up time.
func (s *Server) internalStepUp(c *fiber.Ctx) error {
	var in struct {
		Email       string `json:"email"`
		ProviderSub string `json:"providerSub"`
	}
	if err := readBody(c, &in); err != nil {
		return err
	}
	ctx := c.Context()
	wrong := &apiError{status: http.StatusForbidden, Code: "wrong_account",
		Message: "That account is not the one signed in. Nothing was changed."}
	id, err := s.q.IdentityByEmail(ctx, auth.NormaliseEmail(in.Email))
	if errors.Is(err, pgx.ErrNoRows) {
		return wrong
	}
	if err != nil {
		return err
	}
	if id.DisabledAt != nil || id.ProviderSub == nil || in.ProviderSub == "" || *id.ProviderSub != in.ProviderSub {
		slog.Warn("step-up refused")
		return wrong
	}
	ms, err := s.q.DatabaseNowMillis(ctx)
	if err != nil {
		return err
	}
	writeAudit(ctx, s.q, auditEvent{Actor: "owner", IdentityID: &id.ID, Kind: "step_up_confirmed", Subject: id.Email})
	return c.JSON(sessionTimesJSON{Email: id.Email, SessionAt: ms, StepUpAt: ms})
}
