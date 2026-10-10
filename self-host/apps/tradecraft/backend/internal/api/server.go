// Package api is the HTTP interface of the journal (contracts/openapi.yaml). It validates, calls the stored
// queries and shapes JSON; the trading rules themselves live in SQL functions (docs/domain.md).
package api

import (
	"context"
	"encoding/json"
	"regexp"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"tradecraft/internal/auth"
	"tradecraft/internal/store"
)

type Server struct {
	pool *pgxpool.Pool
	q    *store.Queries
	now  func() time.Time
	gate *auth.Gate
}

// New builds the app. now may be nil (the real clock); tests pass their own to pin the future-time check. secret
// is the service token secret shared with the web tier: every route except GET /health refuses a request that does
// not carry a token signed with it (constitution IV; the token's own times are wall time, not now).
func New(pool *pgxpool.Pool, now func() time.Time, secret string) *fiber.App {
	if now == nil {
		now = time.Now
	}
	q := store.New(pool)
	s := &Server{pool: pool, q: q, now: now, gate: auth.NewGate(secret, q, nil)}
	app := fiber.New(fiber.Config{
		ErrorHandler:          errorHandler,
		DisableStartupMessage: true,
		BodyLimit:             1 << 20,
	})
	app.Get("/health", s.health) // the one open route; registered first so nothing below can gate it

	// Called by web-tier code only, with a system token: sign-in decisions, sign-out, step-up confirmations.
	internal := app.Group("/internal", s.gate.System())
	internal.Post("/sign-in", s.internalSignIn)
	internal.Post("/sign-out", s.internalSignOut)
	internal.Post("/step-up", s.internalStepUp)

	// Everything else needs a signed token for an identity that is active and whose session still counts. Unknown
	// addresses are refused the same way, so the gate also hides which routes exist.
	app.Use(s.gate.Owner())

	app.Get("/identities", s.listIdentities)
	app.Post("/identities", s.gate.RequireStepUp(), s.addIdentity)
	app.Post("/identities/:id/disable", s.gate.RequireStepUp(), s.disableIdentity)
	app.Post("/identities/:id/enable", s.gate.RequireStepUp(), s.enableIdentity)
	app.Get("/audit", s.listAudit)
	app.Get("/audit/kinds", s.listAuditKinds)

	app.Get("/currencies", s.listCurrencies)
	app.Get("/settings", s.getSettings)
	app.Put("/settings", s.updateSettings)

	app.Get("/accounts", s.listAccounts)
	app.Post("/accounts", s.createAccount)
	app.Get("/accounts/:id", s.getAccount)
	app.Put("/accounts/:id", s.updateAccount)
	app.Post("/accounts/:id/archive", s.archiveAccount)
	app.Post("/accounts/:id/restore", s.restoreAccount)

	app.Get("/trades", s.listTrades)
	app.Post("/trades", s.createTrade)
	app.Post("/trades/preview", s.previewTrade)
	app.Get("/trades/:id", s.getTrade)
	app.Put("/trades/:id", s.updateTrade)
	app.Delete("/trades/:id", s.deleteTrade)
	app.Post("/trades/:id/restore", s.restoreTrade)
	app.Get("/trades/:id/judgement", s.getJudgement)
	app.Put("/trades/:id/judgement", s.saveJudgement)

	app.Get("/reviews", s.listReviews)
	app.Get("/reviews/calendar", s.reviewsCalendar)
	app.Get("/reviews/day", s.getDailyReview)
	app.Put("/reviews/day", s.saveDailyReview)

	app.Get("/weekly", s.getWeekly)
	app.Post("/weekly/mark", s.markWeek)

	app.Get("/focus", s.getFocus)
	app.Put("/focus", s.saveFocus)

	app.Put("/reviews/day-mistakes", s.setDayMistakes)

	app.Get("/mistakes", s.listMistakes)
	app.Post("/mistakes", s.addMistake)
	app.Get("/mistakes/counter", s.mistakeCounter) // before /mistakes/:id
	app.Put("/mistakes/:id", s.updateMistake)
	app.Post("/mistakes/:id/retire", s.retireMistake)
	app.Post("/mistakes/:id/restore", s.restoreMistake)

	app.Get("/export", s.export)
	return app
}

// inTx runs fn in one transaction: a change and its audit entry succeed or fail together (FR-016). An error from fn
// rolls everything back and is returned as it is.
func (s *Server) inTx(ctx context.Context, fn func(q *store.Queries) error) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }() // a no-op after Commit
	if err := fn(s.q.WithTx(tx)); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (s *Server) health(c *fiber.Ctx) error {
	if err := s.pool.Ping(c.Context()); err != nil {
		return err
	}
	return c.JSON(fiber.Map{"status": "ok"})
}

var uuidText = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`)

// pathID returns the :id parameter, or a 404 for something that cannot be an id.
func pathID(c *fiber.Ctx, what string) (string, error) {
	id := c.Params("id")
	if !uuidText.MatchString(id) {
		return "", notFound(what)
	}
	return id, nil
}

// readBody decodes a JSON body into v.
func readBody(c *fiber.Ctx, v any) error {
	if err := json.Unmarshal(c.Body(), v); err != nil {
		return badRequest("The request body is not valid JSON.")
	}
	return nil
}

// journalLocation is the journal time zone as a *time.Location.
func (s *Server) journalLocation(ctx context.Context) (*time.Location, error) {
	st, err := s.q.GetSettings(ctx)
	if err != nil {
		return nil, err
	}
	return time.LoadLocation(st.TimeZone)
}

func fmtTime(t time.Time) string { return t.UTC().Format(time.RFC3339Nano) }
