package api

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"tradecraft/internal/auth"
	"tradecraft/internal/store"
)

// The owner's side of agent access (feature 003, user story 2): the switch and the tokens. Changing either needs a
// recent Google confirmation (the route's RequireStepUp) and is audited in the change's own transaction. A token's value
// is made here, returned once, and never stored: only its SHA-256 is.

type agentTokenJSON struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	CreatedAt  string  `json:"createdAt"`
	LastUsedAt *string `json:"lastUsedAt"`
	RevokedAt  *string `json:"revokedAt"`
	Active     bool    `json:"active"`
}

type agentAccessJSON struct {
	Enabled bool             `json:"enabled"`
	Tokens  []agentTokenJSON `json:"tokens"`
}

func toAgentToken(id, name string, created time.Time, lastUsed, revoked *time.Time) agentTokenJSON {
	return agentTokenJSON{ID: id, Name: name, CreatedAt: fmtTime(created), LastUsedAt: timePtr(lastUsed), RevokedAt: timePtr(revoked), Active: revoked == nil}
}

// tokenPrefix marks a value as ours, so a stray copy of one is recognisable (and a secret scanner can look for it).
const tokenPrefix = "tca_"

// newTokenValue is 32 random bytes in base64url behind the prefix: 43 characters after "tca_".
func newTokenValue() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return tokenPrefix + base64.RawURLEncoding.EncodeToString(b), nil
}

// hashToken is what is stored and looked up: the lower-case hex SHA-256 of the whole value.
func hashToken(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func (s *Server) loadAgentAccess(c *fiber.Ctx) (agentAccessJSON, error) {
	ctx := c.Context()
	enabled, err := s.q.GetAgentAccess(ctx)
	if err != nil {
		return agentAccessJSON{}, err
	}
	rows, err := s.q.ListAgentTokens(ctx)
	if err != nil {
		return agentAccessJSON{}, err
	}
	out := agentAccessJSON{Enabled: enabled, Tokens: make([]agentTokenJSON, 0, len(rows))}
	for _, r := range rows {
		out.Tokens = append(out.Tokens, toAgentToken(r.ID, r.Name, r.CreatedAt, r.LastUsedAt, r.RevokedAt))
	}
	return out, nil
}

// getAgent is GET /agent: the switch and every token, newest first. A value is never in it.
func (s *Server) getAgent(c *fiber.Ctx) error {
	a, err := s.loadAgentAccess(c)
	if err != nil {
		return err
	}
	return c.JSON(a)
}

// setAgent is PUT /agent: turn agent access on or off. Off refuses every token and revokes none.
func (s *Server) setAgent(c *fiber.Ctx) error {
	var in struct {
		Enabled *bool `json:"enabled"`
	}
	if err := readBody(c, &in); err != nil {
		return err
	}
	if in.Enabled == nil {
		return invalid("setting", []fieldError{{"enabled", "Choose on or off."}})
	}
	ctx := c.Context()
	actor, by := actorOf(c)
	err := s.inTx(ctx, func(q *store.Queries) error {
		cur, err := q.AgentAccessForUpdate(ctx)
		if err != nil {
			return err
		}
		if cur == *in.Enabled {
			return nil // nothing changes, so nothing is recorded
		}
		if err := q.SetAgentAccess(ctx, *in.Enabled); err != nil {
			return err
		}
		kind := "agent_access_disabled"
		if *in.Enabled {
			kind = "agent_access_enabled"
		}
		return recordAudit(ctx, q, auditEvent{Actor: actor, IdentityID: by, Kind: kind, Subject: "Agent access", Fields: []string{"status"}})
	})
	if err != nil {
		return err
	}
	return s.getAgent(c)
}

const msgTokenNameUsed = "That name is already used. Choose another."

// createAgentToken is POST /agent/tokens: make a token. The answer holds the value, once.
func (s *Server) createAgentToken(c *fiber.Ctx) error {
	var in struct {
		Name string `json:"name"`
	}
	if err := readBody(c, &in); err != nil {
		return err
	}
	name := strings.Join(strings.Fields(in.Name), " ")
	switch {
	case name == "":
		return invalid("token", []fieldError{{"name", "Name is required."}})
	case utf8.RuneCountInString(name) > 60:
		return invalid("token", []fieldError{{"name", "Name can be at most 60 characters."}})
	}
	id, ok := auth.IdentityFrom(c)
	if !ok {
		return &apiError{status: http.StatusUnauthorized, Code: "unauthorized", Message: "Not signed in."}
	}
	value, err := newTokenValue()
	if err != nil {
		return err
	}
	ctx := c.Context()
	actor, by := actorOf(c)
	var made store.InsertAgentTokenRow
	err = s.inTx(ctx, func(q *store.Queries) error {
		var err error
		made, err = q.InsertAgentToken(ctx, store.InsertAgentTokenParams{Name: name, TokenHash: hashToken(value), CreatedBy: id.ID})
		if err != nil {
			return err
		}
		return recordAudit(ctx, q, auditEvent{Actor: actor, IdentityID: by, Kind: "agent_token_created", Subject: name, Fields: []string{"name"}})
	})
	var pe *pgconn.PgError
	if errors.As(err, &pe) && pe.Code == "23505" && pe.ConstraintName == "agent_token_name_unique" {
		return &apiError{status: http.StatusConflict, Code: "name_used", Message: msgTokenNameUsed,
			Fields: []fieldError{{"name", msgTokenNameUsed}}}
	}
	if err != nil {
		return err
	}
	c.Set("Cache-Control", "no-store") // the answer holds a secret, once
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"token": toAgentToken(made.ID, made.Name, made.CreatedAt, made.LastUsedAt, made.RevokedAt),
		"value": value,
	})
}

// revokeAgentToken is POST /agent/tokens/:id/revoke. Final; a repeat changes and records nothing.
func (s *Server) revokeAgentToken(c *fiber.Ctx) error {
	id, err := pathID(c, "token")
	if err != nil {
		return err
	}
	ctx := c.Context()
	actor, by := actorOf(c)
	var out agentTokenJSON
	err = s.inTx(ctx, func(q *store.Queries) error {
		cur, err := q.AgentTokenForRevoke(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			return notFound("token")
		}
		if err != nil {
			return err
		}
		if cur.RevokedAt != nil {
			out = toAgentToken(cur.ID, cur.Name, cur.CreatedAt, cur.LastUsedAt, cur.RevokedAt)
			return nil
		}
		r, err := q.RevokeAgentToken(ctx, id)
		if err != nil {
			return err
		}
		out = toAgentToken(r.ID, r.Name, r.CreatedAt, r.LastUsedAt, r.RevokedAt)
		return recordAudit(ctx, q, auditEvent{Actor: actor, IdentityID: by, Kind: "agent_token_revoked", Subject: r.Name, Fields: []string{"status"}})
	})
	if err != nil {
		return err
	}
	return c.JSON(out)
}
