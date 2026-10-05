package api

import (
	"context"
	"errors"
	"slices"
	"time"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"

	"tradecraft/internal/store"
)

const maxFocus = 280

// focusPeriod reads the period and a day of it, and says which week or month holds the day (the database decides).
func (s *Server) focusPeriod(ctx context.Context, period, date string) (start, end time.Time, err error) {
	if !slices.Contains([]string{"week", "month"}, period) {
		return start, end, invalid("focus", []fieldError{{"period", "Choose week or month."}})
	}
	day, ok := parseDay(date)
	if !ok {
		return start, end, invalid("focus", []fieldError{{"date", "Choose a date like 2025-10-01."}})
	}
	b, err := s.q.PeriodBounds(ctx, day)
	if err != nil {
		return start, end, err
	}
	if period == "week" {
		return b.WeekStart, b.WeekEnd, nil
	}
	return b.MonthStart, b.MonthEnd, nil
}

func (s *Server) getFocus(c *fiber.Ctx) error {
	start, end, err := s.focusPeriod(c.Context(), c.Query("period"), c.Query("date"))
	if err != nil {
		return err
	}
	f, err := s.focusFor(c.Context(), c.Query("period"), start, end)
	if err != nil {
		return err
	}
	return c.JSON(f)
}

type focusInput struct {
	Period            string     `json:"period"`
	Date              string     `json:"date"`
	Body              string     `json:"body"`
	ExpectedUpdatedAt *time.Time `json:"expectedUpdatedAt"`
}

// saveFocus writes, replaces or (with an empty body) clears the one focus of a week or month. The focus is the
// owner's, not an account's.
func (s *Server) saveFocus(c *fiber.Ctx) error {
	ctx := c.Context()
	var in focusInput
	if err := readBody(c, &in); err != nil {
		return err
	}
	start, end, err := s.focusPeriod(ctx, in.Period, in.Date)
	if err != nil {
		return err
	}
	if n := utf8.RuneCountInString(in.Body); n > maxFocus {
		return invalid("focus", []fieldError{{"body", msgTooLong(n - maxFocus)}})
	}
	if in.Body == "" {
		n, err := s.q.ClearFocus(ctx, store.ClearFocusParams{Period: in.Period, PeriodStart: start, ExpectedUpdatedAt: in.ExpectedUpdatedAt})
		if err != nil {
			return err
		}
		if n == 0 {
			// nothing deleted: fine when no focus is there, a stale copy when one is
			if _, err := s.q.GetFocus(ctx, store.GetFocusParams{Period: in.Period, PeriodStart: start}); !errors.Is(err, pgx.ErrNoRows) {
				if err != nil {
					return err
				}
				return conflict("focus")
			}
		}
	} else if _, err := s.q.SaveFocus(ctx, store.SaveFocusParams{Period: in.Period, PeriodStart: start, Body: in.Body, ExpectedUpdatedAt: in.ExpectedUpdatedAt}); errors.Is(err, pgx.ErrNoRows) {
		return conflict("focus")
	} else if err != nil {
		return err
	}
	f, err := s.focusFor(ctx, in.Period, start, end)
	if err != nil {
		return err
	}
	return c.JSON(f)
}
