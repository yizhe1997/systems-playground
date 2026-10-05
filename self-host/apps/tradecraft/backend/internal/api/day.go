package api

import (
	"context"
	"errors"
	"time"
	"unicode/utf8"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"tradecraft/internal/store"
)

type planFollowedJSON struct {
	Followed    int `json:"followed"`
	NotFollowed int `json:"notFollowed"`
	Partly      int `json:"partly"`
	NotJudged   int `json:"notJudged"`
	Of          int `json:"of"`
}

type mistakeCountJSON struct {
	MistakeID string `json:"mistakeId"`
	Name      string `json:"name"`
	Count     int    `json:"count"`
}

type statsJSON struct {
	Trades       int              `json:"trades"`
	NetResult    *string          `json:"netResult"`
	Currency     string           `json:"currency"`
	PlanFollowed planFollowedJSON `json:"planFollowed"`
	Mistakes     struct {
		Count     int                `json:"count"`
		ByMistake []mistakeCountJSON `json:"byMistake"`
	} `json:"mistakes"`
	ValidLosses struct {
		Count        int `json:"count"`
		LosingTrades int `json:"losingTrades"`
	} `json:"validLosses"`
	WinRate struct {
		Wins    int  `json:"wins"`
		Trades  int  `json:"trades"`
		Percent *int `json:"percent"`
	} `json:"winRate"`
	Reasons map[string]string `json:"reasons"`
}

func plan(s store.Stats) planFollowedJSON {
	return planFollowedJSON{Followed: int(s.Followed), NotFollowed: int(s.NotFollowed), Partly: int(s.Partly), NotJudged: int(s.NotJudged), Of: int(s.Trades)}
}

// buildStats shapes the figures of a range. The numbers come from the SQL functions; this only names them.
func (s *Server) buildStats(ctx context.Context, accountID, currency string, from, to time.Time) (statsJSON, error) {
	st, err := s.q.PeriodStats(ctx, accountID, from, to)
	if err != nil {
		return statsJSON{}, err
	}
	by, err := s.q.MistakeBreakdown(ctx, accountID, from, to)
	if err != nil {
		return statsJSON{}, err
	}
	out := statsJSON{Trades: int(st.Trades), NetResult: outDecimalPtr(st.NetResult), Currency: currency, PlanFollowed: plan(st), Reasons: map[string]string{}}
	out.Mistakes.Count = int(st.MistakeTags)
	out.Mistakes.ByMistake = []mistakeCountJSON{}
	for _, m := range by {
		out.Mistakes.ByMistake = append(out.Mistakes.ByMistake, mistakeCountJSON{MistakeID: m.MistakeID, Name: m.Name, Count: int(m.Count)})
	}
	out.ValidLosses.Count, out.ValidLosses.LosingTrades = int(st.ValidLosses), int(st.Losses)
	out.WinRate.Wins, out.WinRate.Trades = int(st.Wins), int(st.Trades)
	if st.WinPercent != nil {
		p := int(*st.WinPercent)
		out.WinRate.Percent = &p
	}
	if st.Trades == 0 {
		out.Reasons["netResult"] = msgNoTrades
		out.Reasons["winRate"] = msgNoTrades
	}
	return out, nil
}

type focusJSON struct {
	Period      string  `json:"period"`
	PeriodStart string  `json:"periodStart"`
	PeriodEnd   string  `json:"periodEnd"`
	Body        *string `json:"body"`
	UpdatedAt   *string `json:"updatedAt"`
}

// focusFor reads the focus of the week or month that contains a day (null body when none is written).
func (s *Server) focusFor(ctx context.Context, period string, start, end time.Time) (focusJSON, error) {
	f := focusJSON{Period: period, PeriodStart: dayText(start), PeriodEnd: dayText(end)}
	r, err := s.q.GetFocus(ctx, store.GetFocusParams{Period: period, PeriodStart: start})
	if errors.Is(err, pgx.ErrNoRows) {
		return f, nil
	}
	if err != nil {
		return f, err
	}
	u := fmtTime(r.UpdatedAt)
	f.Body, f.UpdatedAt = &r.Body, &u
	return f, nil
}

type dayTradeJSON struct {
	ID         string            `json:"id"`
	Instrument string            `json:"instrument"`
	Direction  string            `json:"direction"`
	Size       string            `json:"size"`
	EntryAt    string            `json:"entryAt"`
	ExitAt     string            `json:"exitAt"`
	Currency   string            `json:"currency"`
	NetResult  *string           `json:"netResult"`
	Risk       *string           `json:"risk"`
	RMultiple  *string           `json:"rMultiple"`
	Thesis     *string           `json:"thesis"`
	Reasons    map[string]string `json:"reasons"`
	Judgement  struct {
		PlanFollowed *string  `json:"planFollowed"`
		Label        *string  `json:"label"`
		Mistakes     []string `json:"mistakes"`
	} `json:"judgement"`
}

func toDayTrade(r store.DayTradesRow, loc *time.Location) dayTradeJSON {
	t := dayTradeJSON{
		ID: r.ID, Instrument: r.Instrument, Direction: r.Direction, Size: outDecimal(r.Size),
		EntryAt: r.EntryAt.In(loc).Format(time.RFC3339), ExitAt: r.ExitAt.In(loc).Format(time.RFC3339), Currency: r.Currency,
		NetResult: outDecimalPtr(r.NetResult), Risk: outDecimalPtr(r.Risk), RMultiple: outDecimalPtr(r.RMultiple), Thesis: r.Thesis,
		Reasons: map[string]string{},
	}
	if r.Risk == nil {
		t.Reasons["risk"] = riskReason(r.StopPrice, r.DollarsPerPoint)
		t.Reasons["rMultiple"] = t.Reasons["risk"]
	}
	t.Judgement.PlanFollowed, t.Judgement.Label = r.PlanFollowed, r.Label
	t.Judgement.Mistakes = r.Mistakes
	if t.Judgement.Mistakes == nil {
		t.Judgement.Mistakes = []string{}
	}
	return t
}

type dailyReviewJSON struct {
	AccountID   string  `json:"accountId"`
	AccountName string  `json:"accountName"`
	Currency    string  `json:"currency"`
	Date        string  `json:"date"`
	Today       string  `json:"today"`
	IsToday     bool    `json:"isToday"`
	State       *string `json:"state"`
	Answers     struct {
		DidWell      string `json:"didWell"`
		CouldImprove string `json:"couldImprove"`
		NextFocus    string `json:"nextFocus"`
	} `json:"answers"`
	MentalGrade              *int    `json:"mentalGrade"`
	TechnicalGrade           *int    `json:"technicalGrade"`
	ReviewedAt               *string `json:"reviewedAt"`
	EditedAt                 *string `json:"editedAt"`
	UpdatedAt                *string `json:"updatedAt"`
	TradesChangedAfterReview int     `json:"tradesChangedAfterReview"`
	PreviousDate             string  `json:"previousDate"`
	NextDate                 string  `json:"nextDate"`
	Focus                    struct {
		Yesterday *struct {
			Date string `json:"date"`
			Body string `json:"body"`
		} `json:"yesterday"`
		Week  focusJSON `json:"week"`
		Month focusJSON `json:"month"`
	} `json:"focus"`
	Stats       statsJSON      `json:"stats"`
	Trades      []dayTradeJSON `json:"trades"`
	DayMistakes []struct {
		MistakeID string `json:"mistakeId"`
		Name      string `json:"name"`
	} `json:"dayMistakes"`
}

func intPtr(v pgtype.Int2) *int {
	if !v.Valid {
		return nil
	}
	i := int(v.Int16)
	return &i
}

func timePtr(t *time.Time) *string {
	if t == nil {
		return nil
	}
	s := fmtTime(*t)
	return &s
}

// accountFor reads the account of a request (404 when unknown).
func (s *Server) accountFor(c *fiber.Ctx, id string) (store.GetAccountRow, error) {
	if !uuidText.MatchString(id) {
		return store.GetAccountRow{}, notFound("account")
	}
	a, err := s.q.GetAccount(c.Context(), id)
	if errors.Is(err, pgx.ErrNoRows) {
		return a, notFound("account")
	}
	return a, err
}

// loadDay assembles the daily review of one account and day.
func (s *Server) loadDay(c *fiber.Ctx, acct store.GetAccountRow, day time.Time) (dailyReviewJSON, error) {
	ctx := c.Context()
	var out dailyReviewJSON
	loc, err := s.journalLocation(ctx)
	if err != nil {
		return out, err
	}
	today, err := s.q.AccountToday(ctx, acct.ID)
	if err != nil {
		return out, err
	}
	out.AccountID, out.AccountName, out.Currency, out.Date = acct.ID, acct.Name, acct.Currency, dayText(day)
	out.Today, out.IsToday = dayText(today), day.Equal(today)
	out.PreviousDate, out.NextDate = dayText(plusDays(day, -1)), dayText(plusDays(day, 1))

	state, err := s.q.DayState(ctx, store.DayStateParams{AccountID: acct.ID, Day: day})
	if err != nil {
		return out, err
	}
	if state != "" {
		out.State = &state
	}

	rv, err := s.q.GetDailyReview(ctx, store.GetDailyReviewParams{AccountID: acct.ID, Day: day})
	switch {
	case errors.Is(err, pgx.ErrNoRows):
	case err != nil:
		return out, err
	default:
		out.Answers.DidWell, out.Answers.CouldImprove, out.Answers.NextFocus = rv.DidWell, rv.CouldImprove, rv.NextFocus
		out.MentalGrade, out.TechnicalGrade = intPtr(rv.MentalGrade), intPtr(rv.TechnicalGrade)
		out.ReviewedAt, out.EditedAt = timePtr(rv.ReviewedAt), timePtr(rv.EditedAt)
		u := fmtTime(rv.UpdatedAt)
		out.UpdatedAt = &u
		if rv.ReviewedAt != nil {
			n, err := s.q.TradesChangedAfter(ctx, store.TradesChangedAfterParams{AccountID: acct.ID, Day: day, After: *rv.ReviewedAt})
			if err != nil {
				return out, err
			}
			out.TradesChangedAfterReview = int(n)
		}
	}

	// the focus lines
	b, err := s.q.Bounds(ctx, day)
	if err != nil {
		return out, err
	}
	if out.Focus.Week, err = s.focusFor(ctx, "week", b.WeekStart, b.WeekEnd); err != nil {
		return out, err
	}
	if out.Focus.Month, err = s.focusFor(ctx, "month", b.MonthStart, b.MonthEnd); err != nil {
		return out, err
	}
	y, err := s.q.YesterdayFocus(ctx, store.YesterdayFocusParams{AccountID: acct.ID, Day: day})
	switch {
	case errors.Is(err, pgx.ErrNoRows):
	case err != nil:
		return out, err
	default:
		out.Focus.Yesterday = &struct {
			Date string `json:"date"`
			Body string `json:"body"`
		}{Date: dayText(y.TradingDay), Body: y.NextFocus}
	}

	if out.Stats, err = s.buildStats(ctx, acct.ID, acct.Currency, day, day); err != nil {
		return out, err
	}
	trades, err := s.q.DayTrades(ctx, store.DayTradesParams{AccountID: acct.ID, Day: day})
	if err != nil {
		return out, err
	}
	out.Trades = make([]dayTradeJSON, 0, len(trades))
	for _, t := range trades {
		out.Trades = append(out.Trades, toDayTrade(t, loc))
	}
	dm, err := s.q.DayMistakes(ctx, store.DayMistakesParams{AccountID: acct.ID, Day: day})
	if err != nil {
		return out, err
	}
	out.DayMistakes = make([]struct {
		MistakeID string `json:"mistakeId"`
		Name      string `json:"name"`
	}, 0, len(dm))
	for _, m := range dm {
		out.DayMistakes = append(out.DayMistakes, struct {
			MistakeID string `json:"mistakeId"`
			Name      string `json:"name"`
		}{MistakeID: m.ID, Name: m.Name})
	}
	return out, nil
}

func (s *Server) getDailyReview(c *fiber.Ctx) error {
	acct, err := s.accountFor(c, c.Query("accountId"))
	if err != nil {
		return err
	}
	day, ok := parseDay(c.Query("date"))
	if !ok {
		return invalid("review", []fieldError{{"date", "Choose a date like 2025-10-01."}})
	}
	out, err := s.loadDay(c, acct, day)
	if err != nil {
		return err
	}
	return c.JSON(out)
}

type dailyReviewInput struct {
	AccountID         string     `json:"accountId"`
	Date              string     `json:"date"`
	DidWell           string     `json:"didWell"`
	CouldImprove      string     `json:"couldImprove"`
	NextFocus         string     `json:"nextFocus"`
	MentalGrade       *int       `json:"mentalGrade"`
	TechnicalGrade    *int       `json:"technicalGrade"`
	MarkReviewed      bool       `json:"markReviewed"`
	ExpectedUpdatedAt *time.Time `json:"expectedUpdatedAt"`
}

func (s *Server) saveDailyReview(c *fiber.Ctx) error {
	var in dailyReviewInput
	if err := readBody(c, &in); err != nil {
		return err
	}
	acct, err := s.accountFor(c, in.AccountID)
	if err != nil {
		return err
	}
	day, ok := parseDay(in.Date)
	var fe []fieldError
	if !ok {
		fe = append(fe, fieldError{"date", "Choose a date like 2025-10-01."})
	}
	grade := func(field string, g *int) pgtype.Int2 {
		if g == nil {
			return pgtype.Int2{}
		}
		if *g < 1 || *g > 5 {
			fe = append(fe, fieldError{field, "Grade must be from 1 to 5."})
			return pgtype.Int2{}
		}
		return pgtype.Int2{Int16: int16(*g), Valid: true}
	}
	mental, technical := grade("mentalGrade", in.MentalGrade), grade("technicalGrade", in.TechnicalGrade)
	for field, v := range map[string]string{"didWell": in.DidWell, "couldImprove": in.CouldImprove, "nextFocus": in.NextFocus} {
		if utf8.RuneCountInString(v) > 2000 {
			fe = append(fe, fieldError{field, "Answer can be at most 2,000 characters."})
		}
	}
	if ok && in.MarkReviewed {
		today, err := s.q.AccountToday(c.Context(), acct.ID)
		if err != nil {
			return err
		}
		if day.After(today) {
			fe = append(fe, fieldError{"markReviewed", msgDayNotYet})
		}
	}
	if len(fe) > 0 {
		return invalid("review", fe)
	}
	_, err = s.q.SaveDailyReview(c.Context(), store.SaveDailyReviewParams{
		AccountID: acct.ID, Day: day, DidWell: in.DidWell, CouldImprove: in.CouldImprove, NextFocus: in.NextFocus,
		MentalGrade: mental, TechnicalGrade: technical, MarkReviewed: in.MarkReviewed, ExpectedUpdatedAt: in.ExpectedUpdatedAt,
	})
	if errors.Is(err, pgx.ErrNoRows) {
		return conflict("review")
	}
	if err != nil {
		return err
	}
	out, err := s.loadDay(c, acct, day)
	if err != nil {
		return err
	}
	return c.JSON(out)
}
