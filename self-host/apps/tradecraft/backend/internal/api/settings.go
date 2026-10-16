package api

import (
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgconn"

	"tradecraft/internal/store"
)

type settingsJSON struct {
	TimeZone string `json:"timeZone"`
}

func (s *Server) getSettings(c *fiber.Ctx) error {
	st, err := s.q.GetSettings(c.Context())
	if err != nil {
		return err
	}
	return c.JSON(settingsJSON{TimeZone: st.TimeZone})
}

// updateSettings changes the journal time zone. The trigger in migration 00005 recomputes every trading day
// in the same transaction; no trade's instant changes.
func (s *Server) updateSettings(c *fiber.Ctx) error {
	var in settingsJSON
	if err := readBody(c, &in); err != nil {
		return err
	}
	zone := strings.TrimSpace(in.TimeZone)
	bad := invalid("setting", []fieldError{{Field: "timeZone", Message: "Choose a time zone from the list."}})
	if zone == "" || zone == "Local" {
		return bad
	}
	if _, err := time.LoadLocation(zone); err != nil {
		return bad
	}
	ctx := c.Context()
	actor, by := actorOf(c)
	result := zone
	err := s.inTx(ctx, func(q *store.Queries) error {
		cur, err := q.SettingsForUpdate(ctx)
		if err != nil {
			return err
		}
		if cur == zone { // nothing changes, so nothing is recorded
			return nil
		}
		st, err := q.UpdateSettings(ctx, zone)
		if err != nil {
			var pe *pgconn.PgError
			if errors.As(err, &pe) && pe.Code == "22023" { // the database does not know that zone either
				return bad
			}
			return err
		}
		result = st.TimeZone
		return recordAudit(ctx, q, auditEvent{Actor: actor, IdentityID: by, Kind: "settings_changed",
			Subject: "Journal settings", Fields: []string{"time zone"}})
	})
	if err != nil {
		return err
	}
	return c.JSON(settingsJSON{TimeZone: result})
}
