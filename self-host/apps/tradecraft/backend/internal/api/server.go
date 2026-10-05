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

	"tradecraft/internal/store"
)

type Server struct {
	pool *pgxpool.Pool
	q    *store.Queries
	now  func() time.Time
}

// New builds the app. now may be nil (the real clock); tests pass their own to pin the future-time check.
func New(pool *pgxpool.Pool, now func() time.Time) *fiber.App {
	if now == nil {
		now = time.Now
	}
	s := &Server{pool: pool, q: store.New(pool), now: now}
	app := fiber.New(fiber.Config{
		ErrorHandler:          errorHandler,
		DisableStartupMessage: true,
		BodyLimit:             1 << 20,
	})
	app.Get("/health", s.health)

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
