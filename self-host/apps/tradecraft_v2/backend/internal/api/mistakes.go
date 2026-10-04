package api

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"

	"tradecraft/internal/store"
)

type mistakeJSON struct {
	ID         string  `json:"id"`
	Name       string  `json:"name"`
	StopLine   *int    `json:"stopLine"`
	StopPeriod *string `json:"stopPeriod"`
	Retired    bool    `json:"retired"`
	UpdatedAt  string  `json:"updatedAt"`
}

func toMistake(id, name string, line pgtype.Int4, period *string, retired bool, updatedAt time.Time) mistakeJSON {
	m := mistakeJSON{ID: id, Name: name, StopPeriod: period, Retired: retired, UpdatedAt: fmtTime(updatedAt)}
	if line.Valid {
		n := int(line.Int32)
		m.StopLine = &n
	}
	return m
}

type mistakeInput struct {
	Name              string     `json:"name"`
	StopLine          *int       `json:"stopLine"`
	StopPeriod        *string    `json:"stopPeriod"`
	ExpectedUpdatedAt *time.Time `json:"expectedUpdatedAt"`
}

// validateMistake cleans the name (spaces trimmed and collapsed, like an account's) and checks the stop line, which is a
// whole number from 1 to 999 together with its period, or neither.
func validateMistake(in mistakeInput) (name string, line pgtype.Int4, period *string, fe []fieldError) {
	name = strings.Join(strings.Fields(in.Name), " ")
	switch {
	case name == "":
		fe = append(fe, fieldError{"name", "Name is required."})
	case utf8.RuneCountInString(name) > 60:
		fe = append(fe, fieldError{"name", "Name can be at most 60 characters."})
	}
	hasPeriod := in.StopPeriod != nil && *in.StopPeriod != ""
	switch {
	case in.StopLine != nil && *in.StopLine < 1:
		fe = append(fe, fieldError{"stopLine", msgStopLineMin})
	case in.StopLine != nil && *in.StopLine > 999:
		fe = append(fe, fieldError{"stopLine", msgStopLineMax})
	case in.StopLine != nil && !hasPeriod:
		fe = append(fe, fieldError{"stopPeriod", "Choose per week or per month."})
	case in.StopLine == nil && hasPeriod:
		fe = append(fe, fieldError{"stopLine", "Enter a stop line, or remove the period."})
	}
	if hasPeriod && !slices.Contains([]string{"week", "month"}, *in.StopPeriod) {
		fe = append(fe, fieldError{"stopPeriod", "Choose per week or per month."})
	}
	if len(fe) == 0 && in.StopLine != nil {
		line, period = pgtype.Int4{Int32: int32(*in.StopLine), Valid: true}, in.StopPeriod
	}
	return name, line, period, fe
}

// mistakeTaken answers the unique-name violation in the wireframe wording.
func mistakeTaken(err error, name string) error {
	var pe *pgconn.PgError
	if errors.As(err, &pe) && pe.Code == "23505" && pe.ConstraintName == "mistake_name_unique" {
		return invalid("mistake", []fieldError{{"name", msgMistakeUsed(name)}})
	}
	return err
}

func (s *Server) loadMistake(ctx context.Context, id string) (mistakeJSON, error) {
	r, err := s.q.GetMistake(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return mistakeJSON{}, notFound("mistake")
	}
	if err != nil {
		return mistakeJSON{}, err
	}
	return toMistake(r.ID, r.Name, r.StopLine, r.StopPeriod, r.Retired, r.UpdatedAt), nil
}

func (s *Server) listMistakes(c *fiber.Ctx) error {
	rows, err := s.q.ListMistakes(c.Context(), c.QueryBool("includeRetired", false))
	if err != nil {
		return err
	}
	out := make([]mistakeJSON, 0, len(rows))
	for _, r := range rows {
		out = append(out, toMistake(r.ID, r.Name, r.StopLine, r.StopPeriod, r.Retired, r.UpdatedAt))
	}
	return c.JSON(out)
}

// addMistake adds a mistake. A name that matches a retired mistake brings that one back, stop line and records intact.
func (s *Server) addMistake(c *fiber.Ctx) error {
	ctx := c.Context()
	var in mistakeInput
	if err := readBody(c, &in); err != nil {
		return err
	}
	name, line, period, fe := validateMistake(in)
	if len(fe) > 0 {
		return invalid("mistake", fe)
	}
	existing, err := s.q.MistakeByName(ctx, name)
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		id, err := s.q.InsertMistake(ctx, store.InsertMistakeParams{Name: name, StopLine: line, StopPeriod: period})
		if err != nil {
			return mistakeTaken(err, name)
		}
		m, err := s.loadMistake(ctx, id)
		if err != nil {
			return err
		}
		return c.Status(fiber.StatusCreated).JSON(m)
	case err != nil:
		return err
	case !existing.Retired:
		return invalid("mistake", []fieldError{{"name", msgMistakeUsed(name)}})
	}
	if _, err := s.q.SetMistakeRetired(ctx, store.SetMistakeRetiredParams{ID: existing.ID, Retire: false}); err != nil {
		return err
	}
	m, err := s.loadMistake(ctx, existing.ID)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(m)
}

func (s *Server) updateMistake(c *fiber.Ctx) error {
	ctx := c.Context()
	id, err := pathID(c, "mistake")
	if err != nil {
		return err
	}
	var in mistakeInput
	if err := readBody(c, &in); err != nil {
		return err
	}
	if _, err := s.loadMistake(ctx, id); err != nil {
		return err
	}
	name, line, period, fe := validateMistake(in)
	if len(fe) > 0 {
		return invalid("mistake", fe)
	}
	_, err = s.q.UpdateMistake(ctx, store.UpdateMistakeParams{ID: id, Name: name, StopLine: line, StopPeriod: period, ExpectedUpdatedAt: in.ExpectedUpdatedAt})
	if errors.Is(err, pgx.ErrNoRows) {
		return conflict("mistake")
	}
	if err != nil {
		return mistakeTaken(err, name)
	}
	m, err := s.loadMistake(ctx, id)
	if err != nil {
		return err
	}
	return c.JSON(m)
}

func (s *Server) retireMistake(c *fiber.Ctx) error  { return s.setRetired(c, true) }
func (s *Server) restoreMistake(c *fiber.Ctx) error { return s.setRetired(c, false) }

func (s *Server) setRetired(c *fiber.Ctx, retire bool) error {
	id, err := pathID(c, "mistake")
	if err != nil {
		return err
	}
	if _, err = s.q.SetMistakeRetired(c.Context(), store.SetMistakeRetiredParams{ID: id, Retire: retire}); errors.Is(err, pgx.ErrNoRows) {
		return notFound("mistake")
	} else if err != nil {
		return err
	}
	m, err := s.loadMistake(c.Context(), id)
	if err != nil {
		return err
	}
	return c.JSON(m)
}

type dayMistakesInput struct {
	AccountID  string   `json:"accountId"`
	Date       string   `json:"date"`
	MistakeIDs []string `json:"mistakeIds"`
}

// setDayMistakes replaces the mistakes recorded once for a whole day. A mistake can be recorded when it is in use, or
// when the day already has it (a retired one stays), like the tags of a trade.
func (s *Server) setDayMistakes(c *fiber.Ctx) error {
	ctx := c.Context()
	var in dayMistakesInput
	if err := readBody(c, &in); err != nil {
		return err
	}
	acct, err := s.accountFor(c, in.AccountID)
	if err != nil {
		return err
	}
	day, ok := parseDay(in.Date)
	if !ok {
		return invalid("review", []fieldError{{"date", "Choose a date like 2025-10-01."}})
	}
	ids := slices.Compact(slices.Sorted(slices.Values(in.MistakeIDs)))
	current, err := s.q.DayMistakeIDs(ctx, store.DayMistakeIDsParams{AccountID: acct.ID, Day: day})
	if err != nil {
		return err
	}
	var fresh []string
	for _, m := range ids {
		if !uuidText.MatchString(m) {
			return invalid("review", []fieldError{{"mistakeIds", "Choose mistakes from the list."}})
		}
		if !slices.Contains(current, m) {
			fresh = append(fresh, m)
		}
	}
	if len(fresh) > 0 {
		n, err := s.q.CountUsableMistakes(ctx, fresh)
		if err != nil {
			return err
		}
		if int(n) != len(fresh) {
			return invalid("review", []fieldError{{"mistakeIds", "Choose mistakes from the list."}})
		}
	}
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck // a no-op after commit
	q := s.q.WithTx(tx)
	if err := q.ClearDayMistakes(ctx, store.ClearDayMistakesParams{AccountID: acct.ID, Day: day}); err != nil {
		return err
	}
	for _, m := range ids {
		if err := q.AddDayMistake(ctx, store.AddDayMistakeParams{AccountID: acct.ID, Day: day, MistakeID: m}); err != nil {
			return err
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}
	out, err := s.loadDay(c, acct, day)
	if err != nil {
		return err
	}
	return c.JSON(out)
}

// ---- the counter ----

type counterCell struct {
	OnTrades int `json:"onTrades"`
	OnDays   int `json:"onDays"`
	Total    int `json:"total"`
}

type counterAccount struct {
	AccountID string `json:"accountId"`
	Name      string `json:"name"`
	Count     int    `json:"count"`
}

type counterRow struct {
	MistakeID  string           `json:"mistakeId"`
	Name       string           `json:"name"`
	Retired    bool             `json:"retired"`
	Accounts   []counterAccount `json:"accounts"`
	Week       counterCell      `json:"week"`
	Month      counterCell      `json:"month"`
	StopLine   *int             `json:"stopLine"`
	StopPeriod *string          `json:"stopPeriod"`
	Status     string           `json:"status"`
	Progress   *string          `json:"progress"`
}

type counterJSON struct {
	Period      string       `json:"period"`
	PeriodStart string       `json:"periodStart"`
	PeriodEnd   string       `json:"periodEnd"`
	Rows        []counterRow `json:"rows"`
}

// mistakeCounter is the habit counter (screen S3): for the week and the month that contain a date, how many records each
// mistake has, split by account. Every mistake in use is listed (so a stop line can be set before the first tag); a
// retired one only when it has a count in the viewed period. The status is read from the stop line's own period.
func (s *Server) mistakeCounter(c *fiber.Ctx) error {
	ctx := c.Context()
	period := c.Query("period")
	if period != "week" && period != "month" {
		return invalid("counter", []fieldError{{"period", "Choose week or month."}})
	}
	var day time.Time
	if d := c.Query("date"); d != "" {
		var ok bool
		if day, ok = parseDay(d); !ok {
			return invalid("counter", []fieldError{{"date", "Choose a date like 2025-10-01."}})
		}
	} else {
		loc, err := s.journalLocation(ctx)
		if err != nil {
			return err
		}
		n := time.Now().In(loc)
		day = time.Date(n.Year(), n.Month(), n.Day(), 0, 0, 0, 0, time.UTC)
	}
	var acct *string
	if a := c.Query("accountId"); a != "" {
		if !uuidText.MatchString(a) {
			return notFound("account")
		}
		if _, err := s.accountFor(c, a); err != nil {
			return err
		}
		acct = &a
	}
	b, err := s.q.PeriodBounds(ctx, day)
	if err != nil {
		return err
	}
	weekCounts, err := s.q.CounterCounts(ctx, b.WeekStart, b.WeekEnd, acct)
	if err != nil {
		return err
	}
	monthCounts, err := s.q.CounterCounts(ctx, b.MonthStart, b.MonthEnd, acct)
	if err != nil {
		return err
	}
	mistakes, err := s.q.ListMistakes(ctx, true)
	if err != nil {
		return err
	}

	out := counterJSON{Period: period, Rows: []counterRow{}}
	out.PeriodStart, out.PeriodEnd = dayText(b.WeekStart), dayText(b.WeekEnd)
	chosen := weekCounts
	if period == "month" {
		out.PeriodStart, out.PeriodEnd = dayText(b.MonthStart), dayText(b.MonthEnd)
		chosen = monthCounts
	}
	cell := func(counts []store.CounterCount, id string) (cl counterCell) {
		for _, x := range counts {
			if x.MistakeID == id {
				cl.OnTrades += int(x.OnTrades)
				cl.OnDays += int(x.OnDays)
			}
		}
		cl.Total = cl.OnTrades + cl.OnDays
		return cl
	}
	for _, m := range mistakes {
		row := counterRow{MistakeID: m.ID, Name: m.Name, Retired: m.Retired, Accounts: []counterAccount{},
			Week: cell(weekCounts, m.ID), Month: cell(monthCounts, m.ID), Status: "count_only"}
		viewed := row.Week
		if period == "month" {
			viewed = row.Month
		}
		if m.Retired && viewed.Total == 0 {
			continue
		}
		for _, x := range chosen {
			if x.MistakeID == m.ID {
				row.Accounts = append(row.Accounts, counterAccount{AccountID: x.AccountID, Name: x.AccountName, Count: int(x.OnTrades + x.OnDays)})
			}
		}
		if m.StopLine.Valid && m.StopPeriod != nil {
			line := int(m.StopLine.Int32)
			row.StopLine, row.StopPeriod = &line, m.StopPeriod
			own := row.Week
			if *m.StopPeriod == "month" {
				own = row.Month
			}
			if own.Total >= line {
				row.Status = "stop"
			}
			p := fmt.Sprintf("%d of %d this %s", own.Total, line, *m.StopPeriod)
			row.Progress = &p
		}
		out.Rows = append(out.Rows, row)
	}
	return c.JSON(out)
}
