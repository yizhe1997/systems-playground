package api

import (
	"errors"
	"net/http"
	"regexp"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"tradecraft/internal/auth"
	"tradecraft/internal/store"
)

type identityJSON struct {
	ID           string  `json:"id"`
	Email        string  `json:"email"`
	Provider     string  `json:"provider"`
	AddedAt      string  `json:"addedAt"`
	LastSignInAt *string `json:"lastSignInAt"`
	DisabledAt   *string `json:"disabledAt"`
	Active       bool    `json:"active"`
}

func toIdentity(i store.Identity) identityJSON {
	return identityJSON{ID: i.ID, Email: i.Email, Provider: i.Provider, AddedAt: fmtTime(i.AddedAt),
		LastSignInAt: timePtr(i.LastSignInAt), DisabledAt: timePtr(i.DisabledAt), Active: i.DisabledAt == nil}
}

// emailShape mirrors the table's own check: one @, no spaces, a dot in the domain.
var emailShape = regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)

const (
	msgBadEmail    = "Enter a valid email address, for example name@example.com."
	msgAlreadyList = "That address is already on the list. Enable it instead."
	msgLastActive  = "This is the last active address. Enable another one before disabling it."
)

func (s *Server) listIdentities(c *fiber.Ctx) error {
	status := c.Query("status", "all")
	if status != "all" && status != "active" && status != "disabled" {
		return badFilter("status", "Choose All, Active or Disabled.")
	}
	ctx := c.Context()
	rows, err := s.q.ListIdentities(ctx, status)
	if err != nil {
		return err
	}
	counts, err := s.q.IdentityCounts(ctx)
	if err != nil {
		return err
	}
	out := make([]identityJSON, 0, len(rows))
	for _, r := range rows {
		out = append(out, toIdentity(r))
	}
	return c.JSON(fiber.Map{
		"identities": out,
		"counts":     fiber.Map{"all": counts.Total, "active": counts.Active, "disabled": counts.Disabled},
	})
}

// addIdentity adds an email that counts as the owner. A step-up has already been required by the route. The
// address is compared and stored lower case and trimmed, and one address can belong to one identity, disabled ones
// included (FR-010).
func (s *Server) addIdentity(c *fiber.Ctx) error {
	var in struct {
		Email string `json:"email"`
	}
	if err := readBody(c, &in); err != nil {
		return err
	}
	email := auth.NormaliseEmail(in.Email)
	if email == "" || utf8.RuneCountInString(email) > 254 || !emailShape.MatchString(email) {
		return invalidEmail()
	}
	ctx := c.Context()
	actor, by := actorOf(c)
	var created store.Identity
	err := s.inTx(ctx, func(q *store.Queries) error {
		if err := q.LockIdentityChanges(ctx); err != nil {
			return err
		}
		if _, err := q.IdentityByEmail(ctx, email); err == nil {
			return &apiError{status: http.StatusConflict, Code: "already_listed", Message: msgAlreadyList}
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}
		var err error
		if created, err = q.CreateIdentity(ctx, email); err != nil {
			return err
		}
		return recordAudit(ctx, q, auditEvent{Actor: actor, IdentityID: by, Kind: "identity_added", Subject: email, Fields: []string{"email"}})
	})
	if err != nil {
		return err
	}
	return c.Status(http.StatusCreated).JSON(toIdentity(created))
}

func invalidEmail() *apiError {
	return &apiError{status: http.StatusUnprocessableEntity, Code: "invalid",
		Message: "1 thing to fix before this address can be added.",
		Fields:  []fieldError{{Field: "email", Message: msgBadEmail}}}
}

func (s *Server) disableIdentity(c *fiber.Ctx) error { return s.setIdentityActive(c, false) }
func (s *Server) enableIdentity(c *fiber.Ctx) error  { return s.setIdentityActive(c, true) }

// setIdentityActive disables or enables an identity. Every change that can lower the number of active identities
// takes the advisory lock and counts inside the same transaction, so two requests cannot both disable the last two
// (FR-011, SC-005). A repeat that changes nothing records nothing.
func (s *Server) setIdentityActive(c *fiber.Ctx, active bool) error {
	id, err := pathID(c, "identity")
	if err != nil {
		return err
	}
	ctx := c.Context()
	actor, by := actorOf(c)
	var result store.Identity
	err = s.inTx(ctx, func(q *store.Queries) error {
		if err := q.LockIdentityChanges(ctx); err != nil {
			return err
		}
		cur, err := q.IdentityByID(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			return notFound("identity")
		}
		if err != nil {
			return err
		}
		if (cur.DisabledAt == nil) == active { // already in that state
			result = cur
			return nil
		}
		kind := "identity_enabled"
		if active {
			result, err = q.EnableIdentity(ctx, id)
		} else {
			counts, cerr := q.IdentityCounts(ctx)
			if cerr != nil {
				return cerr
			}
			if counts.Active <= 1 {
				return &apiError{status: http.StatusConflict, Code: "last_active_identity", Message: msgLastActive}
			}
			kind = "identity_disabled"
			result, err = q.DisableIdentity(ctx, id)
		}
		if err != nil {
			return err
		}
		return recordAudit(ctx, q, auditEvent{Actor: actor, IdentityID: by, Kind: kind, Subject: cur.Email, Fields: []string{"status"}})
	})
	if err != nil {
		return err
	}
	return c.JSON(toIdentity(result))
}
