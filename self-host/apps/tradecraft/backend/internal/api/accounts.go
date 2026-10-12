package api

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"

	"tradecraft/internal/store"
)

type accountInput struct {
	Name              string     `json:"name"`
	Currency          string     `json:"currency"`
	TradingDayStart   *string    `json:"tradingDayStart"`
	Kind              *string    `json:"kind"` // live or backtest; omitted means live on create and unchanged on update
	ExpectedUpdatedAt *time.Time `json:"expectedUpdatedAt"`
}

type accountJSON struct {
	ID              string  `json:"id"`
	Name            string  `json:"name"`
	Currency        string  `json:"currency"`
	TradingDayStart *string `json:"tradingDayStart"`
	Archived        bool    `json:"archived"`
	Kind            string  `json:"kind"`
	UpdatedAt       string  `json:"updatedAt"`
}

func startPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func toAccount(id, name, currency, start string, archived bool, updatedAt time.Time, kind string) accountJSON {
	return accountJSON{ID: id, Name: name, Currency: currency, TradingDayStart: startPtr(start), Archived: archived, Kind: kind, UpdatedAt: fmtTime(updatedAt)}
}

var timeOfDay = regexp.MustCompile(`^([01][0-9]|2[0-3]):[0-5][0-9]$`)

const msgMidnight = "Start time cannot be 00:00. Leave it empty to use the calendar date of each entry."

// validateAccount cleans and checks the typed account. The name has surrounding spaces trimmed and runs of
// spaces collapsed to one (the database also refuses anything else).
func validateAccount(in accountInput) (name, start, kind string, fe []fieldError) {
	name = strings.Join(strings.Fields(in.Name), " ")
	switch {
	case name == "":
		fe = append(fe, fieldError{"name", "Name is required."})
	case utf8.RuneCountInString(name) > 80:
		fe = append(fe, fieldError{"name", "Name can be at most 80 characters."})
	}
	if !validCurrency(strings.TrimSpace(in.Currency)) {
		fe = append(fe, fieldError{"currency", "Choose a currency from the list."})
	}
	if in.TradingDayStart != nil {
		start = strings.TrimSpace(*in.TradingDayStart)
		switch {
		case start == "":
		case start == "00:00":
			fe = append(fe, fieldError{"tradingDayStart", msgMidnight})
		case !timeOfDay.MatchString(start):
			fe = append(fe, fieldError{"tradingDayStart", "Enter a time as HH:MM, for example 17:00."})
		}
	}
	if in.Kind != nil {
		switch k := strings.TrimSpace(*in.Kind); k {
		case "live", "backtest":
			kind = k
		default:
			fe = append(fe, fieldError{"kind", "Choose Live or Backtest."})
		}
	}
	return name, start, kind, fe
}

// nameTaken reports whether err is the unique-name violation, and answers it in the wireframe wording,
// naming the account that already has the name.
func (s *Server) nameTaken(ctx context.Context, err error, name string) error {
	var pe *pgconn.PgError
	if errors.As(err, &pe) && pe.Code == "23505" && pe.ConstraintName == "account_name_unique" {
		existing := name
		accts, lerr := s.q.ListAccounts(ctx, true)
		if lerr == nil {
			for _, a := range accts {
				if strings.EqualFold(a.Name, name) {
					existing = a.Name
				}
			}
		}
		return invalid("account", []fieldError{{"name", "An account named " + existing + " already exists. Names are not case sensitive."}})
	}
	return err
}

func (s *Server) listAccounts(c *fiber.Ctx) error {
	rows, err := s.q.ListAccounts(c.Context(), c.QueryBool("includeArchived", false))
	if err != nil {
		return err
	}
	out := make([]accountJSON, 0, len(rows))
	for _, r := range rows {
		out = append(out, toAccount(r.ID, r.Name, r.Currency, r.TradingDayStart, r.Archived, r.UpdatedAt, r.Kind))
	}
	return c.JSON(out)
}

func (s *Server) loadAccount(c *fiber.Ctx, id string) (accountJSON, error) {
	r, err := s.q.GetAccount(c.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		return accountJSON{}, notFound("account")
	}
	if err != nil {
		return accountJSON{}, err
	}
	return toAccount(r.ID, r.Name, r.Currency, r.TradingDayStart, r.Archived, r.UpdatedAt, r.Kind), nil
}

func (s *Server) getAccount(c *fiber.Ctx) error {
	id, err := pathID(c, "account")
	if err != nil {
		return err
	}
	a, err := s.loadAccount(c, id)
	if err != nil {
		return err
	}
	return c.JSON(a)
}

func (s *Server) createAccount(c *fiber.Ctx) error {
	var in accountInput
	if err := readBody(c, &in); err != nil {
		return err
	}
	name, start, kind, fe := validateAccount(in)
	if len(fe) > 0 {
		return invalid("account", fe)
	}
	if kind == "" {
		kind = "live" // an account is Live unless the owner chooses Backtest
	}
	id, err := s.q.InsertAccount(c.Context(), store.InsertAccountParams{Name: name, Currency: strings.TrimSpace(in.Currency), TradingDayStart: start, Kind: kind})
	if err != nil {
		return s.nameTaken(c.Context(), err, name)
	}
	a, err := s.loadAccount(c, id)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(a)
}

func (s *Server) updateAccount(c *fiber.Ctx) error {
	id, err := pathID(c, "account")
	if err != nil {
		return err
	}
	var in accountInput
	if err := readBody(c, &in); err != nil {
		return err
	}
	if _, err := s.loadAccount(c, id); err != nil {
		return err
	}
	name, start, kind, fe := validateAccount(in)
	if len(fe) > 0 {
		return invalid("account", fe)
	}
	// One transaction: a change of kind moves where the account's days and trades count, so it is recorded with the
	// change itself (FR-002). Nothing typed is altered by it.
	ctx := c.Context()
	actor, by := actorOf(c)
	err = s.inTx(ctx, func(q *store.Queries) error {
		cur, err := q.AccountForAudit(ctx, id) // locks the row, and holds the kind as it is now
		if errors.Is(err, pgx.ErrNoRows) {
			return notFound("account")
		}
		if err != nil {
			return err
		}
		if kind == "" {
			kind = cur.Kind
		}
		_, err = q.UpdateAccount(ctx, store.UpdateAccountParams{
			ID: id, Name: name, Currency: strings.TrimSpace(in.Currency), TradingDayStart: start, Kind: kind, ExpectedUpdatedAt: in.ExpectedUpdatedAt})
		if errors.Is(err, pgx.ErrNoRows) {
			return conflict("account")
		}
		if err != nil {
			return err
		}
		if cur.Kind == kind {
			return nil
		}
		return recordAudit(ctx, q, auditEvent{Actor: actor, IdentityID: by, Kind: "account_kind_changed", Subject: name, Fields: []string{"kind"}})
	})
	if err != nil {
		return s.nameTaken(ctx, err, name)
	}
	a, err := s.loadAccount(c, id)
	if err != nil {
		return err
	}
	return c.JSON(a)
}

func (s *Server) archiveAccount(c *fiber.Ctx) error { return s.setArchived(c, true) }
func (s *Server) restoreAccount(c *fiber.Ctx) error { return s.setArchived(c, false) }

func (s *Server) setArchived(c *fiber.Ctx, archive bool) error {
	id, err := pathID(c, "account")
	if err != nil {
		return err
	}
	ctx := c.Context()
	actor, by := actorOf(c)
	err = s.inTx(ctx, func(q *store.Queries) error {
		cur, err := q.AccountForAudit(ctx, id)
		if errors.Is(err, pgx.ErrNoRows) {
			return notFound("account")
		}
		if err != nil {
			return err
		}
		if cur.Archived == archive {
			return nil
		}
		kind := "account_restored"
		if archive {
			kind = "account_archived"
			_, err = q.ArchiveAccount(ctx, id)
		} else {
			_, err = q.RestoreAccount(ctx, id)
		}
		if err != nil {
			return err
		}
		return recordAudit(ctx, q, auditEvent{Actor: actor, IdentityID: by, Kind: kind, Subject: cur.Name, Fields: []string{"status"}})
	})
	if err != nil {
		return err
	}
	a, err := s.loadAccount(c, id)
	if err != nil {
		return err
	}
	return c.JSON(a)
}
