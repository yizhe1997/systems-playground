package api

import (
	"context"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"

	"tradecraft/internal/auth"
	"tradecraft/internal/store"
)

// auditKinds is the one place that names what the log can hold and the words the screen shows. A later feature
// adds a kind here; the table needs no migration (data-model.md "Kinds").
var auditKinds = []struct{ Code, Label string }{
	{"sign_in", "Sign-in"},
	{"sign_out", "Sign-out"},
	{"sign_in_refused", "Sign-in refused"},
	{"step_up_confirmed", "Step-up confirmed"},
	{"identity_added", "Identity added"},
	{"identity_disabled", "Identity disabled"},
	{"identity_enabled", "Identity enabled"},
	{"export_downloaded", "Export downloaded"},
	{"trade_deleted", "Trade deleted"},
	{"trade_restored", "Trade restored"},
	{"account_archived", "Account archived"},
	{"account_restored", "Account restored"},
	{"account_kind_changed", "Account kind changed"},
	{"agent_access_enabled", "Agent access turned on"},
	{"agent_access_disabled", "Agent access turned off"},
	{"agent_token_created", "Agent token created"},
	{"agent_token_revoked", "Agent token revoked"},
	{"agent_read", "Agent read"},
	{"agent_refused", "Agent refused"},
	{"settings_changed", "Settings changed"},
	{"mistake_retired", "Mistake retired"},
	{"mistake_restored", "Mistake restored"},
	{"attachment_added", "Attachment added"},
	{"attachment_removed", "Attachment removed"},
}

func kindLabel(code string) (string, bool) {
	for _, k := range auditKinds {
		if k.Code == code {
			return k.Label, true
		}
	}
	return "", false
}

// auditEvent is one entry to append. Subject and Fields are chosen by code, never typed text, amounts or notes.
type auditEvent struct {
	Actor      string  // owner, agent or system
	IdentityID *string // nil for system entries
	Kind       string
	Subject    string
	Fields     []string
	Label      string // for an agent entry: the token's name at that moment
}

// recordAudit appends one entry through q, which is the change's own transaction for the audited actions: if it
// fails, the change fails with it (FR-016).
func recordAudit(ctx context.Context, q *store.Queries, e auditEvent) error {
	if _, ok := kindLabel(e.Kind); !ok {
		return &unknownKind{e.Kind}
	}
	fields := e.Fields
	if fields == nil {
		fields = []string{}
	}
	return q.InsertAuditEntry(ctx, store.InsertAuditEntryParams{
		ActorKind:     e.Actor,
		IdentityID:    e.IdentityID,
		Kind:          e.Kind,
		Subject:       clip(e.Subject, 254),
		ChangedFields: fields,
		ActorLabel:    clip(e.Label, 80),
	})
}

// writeAudit is the best-effort form for sign-in, sign-out, refused sign-in and step-up: an audit hiccup must not
// turn a login into a failure, and there is no state change to leave unrecorded.
func writeAudit(ctx context.Context, q *store.Queries, e auditEvent) {
	if err := recordAudit(ctx, q, e); err != nil {
		slog.Error("audit entry write failed", "kind", e.Kind, "err", err)
	}
}

type unknownKind struct{ kind string }

func (e *unknownKind) Error() string { return "unknown audit kind " + strconv.Quote(e.kind) }

// clip shortens s to at most n characters (not bytes).
func clip(s string, n int) string {
	if utf8.RuneCountInString(s) <= n {
		return s
	}
	return string([]rune(s)[:n])
}

// cleanAttempted is the address of a refused sign-in as it is recorded: trimmed, lower case, control characters
// removed, at most 254 characters.
func cleanAttempted(email string) string {
	s := strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, auth.NormaliseEmail(email))
	return clip(s, 254)
}

// tradeSubject names a trade by instrument, direction and entry time in the journal zone, never by amounts:
// "NQ long trade of Wed 1 Oct 09:41". The entry is the time that decides the trade's day (feature 003).
func tradeSubject(instrument, direction string, entry time.Time, loc *time.Location) string {
	return instrument + " " + direction + " trade of " + entry.In(loc).Format("Mon 2 Jan 15:04")
}

// actorOf is who made the request: the signed-in identity, or the system.
func actorOf(c *fiber.Ctx) (kind string, identityID *string) {
	if id, ok := auth.IdentityFrom(c); ok {
		return "owner", &id.ID
	}
	return "system", nil
}

type auditEntryJSON struct {
	ID            string   `json:"id"`
	At            string   `json:"at"`
	ActorKind     string   `json:"actorKind"`
	IdentityEmail *string  `json:"identityEmail"`
	Kind          string   `json:"kind"`
	KindLabel     string   `json:"kindLabel"`
	Subject       string   `json:"subject"`
	ChangedFields []string `json:"changedFields"`
	ActorLabel    string   `json:"actorLabel"`
}

func badFilter(field, msg string) *apiError {
	return &apiError{status: http.StatusUnprocessableEntity, Code: "invalid", Message: "That filter is not valid.",
		Fields: []fieldError{{Field: field, Message: msg}}}
}

// listAudit answers the Audit log screen: newest first, filtered by identity, kind and period, paged like the
// Trades list. There is no route that creates, edits or deletes an entry (FR-017).
func (s *Server) listAudit(c *fiber.Ctx) error {
	ctx := c.Context()
	p := store.ListAuditParams{RowLimit: 50}
	if v := c.Query("identity"); v != "" {
		if v != "none" && !uuidText.MatchString(v) {
			return badFilter("identity", "Choose an identity from the list.")
		}
		p.Identity = &v
	}
	if v := c.Query("kind"); v != "" {
		if _, ok := kindLabel(v); !ok {
			return badFilter("kind", "Choose a kind from the list.")
		}
		p.Kind = &v
	}
	loc, err := s.journalLocation(ctx)
	if err != nil {
		return err
	}
	if v := c.Query("from"); v != "" {
		d, ok := parseDay(v)
		if !ok {
			return badFilter("from", "Use a date like 2025-10-01.")
		}
		t := time.Date(d.Year(), d.Month(), d.Day(), 0, 0, 0, 0, loc)
		p.FromAt = &t
	}
	if v := c.Query("to"); v != "" {
		d, ok := parseDay(v)
		if !ok {
			return badFilter("to", "Use a date like 2025-10-01.")
		}
		t := time.Date(d.Year(), d.Month(), d.Day()+1, 0, 0, 0, 0, loc) // the day after the last, exclusive
		p.ToAt = &t
	}
	if v := c.Query("limit"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 || n > 200 {
			return badFilter("limit", "Use a number from 1 to 200.")
		}
		p.RowLimit = int32(n)
	}
	if v := c.Query("offset"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 0 {
			return badFilter("offset", "Use a number from 0.")
		}
		p.RowOffset = int32(n)
	}
	rows, err := s.q.ListAudit(ctx, p)
	if err != nil {
		return err
	}
	total, err := s.q.CountAudit(ctx, store.CountAuditParams{Identity: p.Identity, Kind: p.Kind, FromAt: p.FromAt, ToAt: p.ToAt})
	if err != nil {
		return err
	}
	out := make([]auditEntryJSON, 0, len(rows))
	for _, r := range rows {
		label, _ := kindLabel(r.Kind)
		fields := r.ChangedFields
		if fields == nil {
			fields = []string{}
		}
		out = append(out, auditEntryJSON{ID: r.ID, At: fmtTime(r.At), ActorKind: r.ActorKind, IdentityEmail: r.IdentityEmail,
			Kind: r.Kind, KindLabel: label, Subject: r.Subject, ChangedFields: fields, ActorLabel: r.ActorLabel})
	}
	c.Set("X-Total-Count", strconv.Itoa(int(total)))
	return c.JSON(out)
}

// listAuditKinds is what the "What" filter offers.
func (s *Server) listAuditKinds(c *fiber.Ctx) error {
	type kind struct {
		Kind  string `json:"kind"`
		Label string `json:"label"`
	}
	out := make([]kind, 0, len(auditKinds))
	for _, k := range auditKinds {
		out = append(out, kind{k.Code, k.Label})
	}
	return c.JSON(out)
}
