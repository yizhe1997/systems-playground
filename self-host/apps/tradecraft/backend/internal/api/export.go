package api

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

// exportTradeJSON is a trade as feature 000 exports it, plus what feature 001 records about it.
type exportTradeJSON struct {
	tradeJSON
	Judgement struct {
		PlanFollowed *string  `json:"planFollowed"`
		Label        *string  `json:"label"`
		Mistakes     []string `json:"mistakes"`
	} `json:"judgement"`
}

type exportReviewJSON struct {
	AccountID      string  `json:"accountId"`
	AccountName    string  `json:"accountName"`
	Date           string  `json:"date"`
	DidWell        string  `json:"didWell"`
	CouldImprove   string  `json:"couldImprove"`
	NextFocus      string  `json:"nextFocus"`
	MentalGrade    *int    `json:"mentalGrade"`
	TechnicalGrade *int    `json:"technicalGrade"`
	ReviewedAt     *string `json:"reviewedAt"`
	EditedAt       *string `json:"editedAt"`
}

type exportFocusJSON struct {
	Period      string `json:"period"`
	PeriodStart string `json:"periodStart"`
	Body        string `json:"body"`
}

type exportMarkJSON struct {
	AccountID   string `json:"accountId"`
	AccountName string `json:"accountName"`
	WeekStart   string `json:"weekStart"`
	ReviewedAt  string `json:"reviewedAt"`
}

type exportDayMistakeJSON struct {
	AccountID   string `json:"accountId"`
	AccountName string `json:"accountName"`
	Date        string `json:"date"`
	MistakeID   string `json:"mistakeId"`
	Mistake     string `json:"mistake"`
}

type exportJSON struct {
	ExportedAt  string                 `json:"exportedAt"`
	Settings    settingsJSON           `json:"settings"`
	Accounts    []accountJSON          `json:"accounts"`
	Trades      []exportTradeJSON      `json:"trades"`
	Mistakes    []mistakeJSON          `json:"mistakes"`
	DailyReview []exportReviewJSON     `json:"dailyReviews"`
	Focuses     []exportFocusJSON      `json:"focuses"`
	WeeklyMarks []exportMarkJSON       `json:"weeklyMarks"`
	DayMistakes []exportDayMistakeJSON `json:"dayMistakes"`
	Identities  []exportIdentityJSON   `json:"identities"`
	AuditEntries []exportAuditJSON     `json:"auditEntries"`
}

// exportIdentityJSON is an identity without the provider's account identifier (FR-019).
type exportIdentityJSON struct {
	ID           string  `json:"id"`
	Email        string  `json:"email"`
	Provider     string  `json:"provider"`
	AddedAt      string  `json:"addedAt"`
	LastSignInAt *string `json:"lastSignInAt"`
	DisabledAt   *string `json:"disabledAt"`
}

type exportAuditJSON struct {
	ID            string   `json:"id"`
	At            string   `json:"at"`
	ActorKind     string   `json:"actorKind"`
	IdentityEmail *string  `json:"identityEmail"`
	Kind          string   `json:"kind"`
	Subject       string   `json:"subject"`
	ChangedFields []string `json:"changedFields"`
}

// export answers everything as one document: settings, every account (archived marked), every trade (deleted marked)
// with its judgement, the mistake list (retired ones too, with stop lines), the daily reviews, the focuses, the
// weekly reviewed marks and the whole-day mistake records. Money stays as exact decimal strings.
func (s *Server) export(c *fiber.Ctx) error {
	ctx := c.Context()
	// the entry is written first: an export that cannot be recorded is not made (FR-015, FR-016)
	actor, by := actorOf(c)
	if err := recordAudit(ctx, s.q, auditEvent{Actor: actor, IdentityID: by, Kind: "export_downloaded", Subject: "Full export"}); err != nil {
		return err
	}
	st, err := s.q.GetSettings(ctx)
	if err != nil {
		return err
	}
	loc, err := time.LoadLocation(st.TimeZone)
	if err != nil {
		return err
	}
	accts, err := s.q.ListAccounts(ctx, true)
	if err != nil {
		return err
	}
	trades, err := s.q.ExportTrades(ctx)
	if err != nil {
		return err
	}
	tags, err := s.q.ExportTradeMistakes(ctx)
	if err != nil {
		return err
	}
	byTrade := map[string][]string{}
	for _, t := range tags {
		byTrade[t.TradeID] = append(byTrade[t.TradeID], t.Mistake)
	}
	mistakes, err := s.q.ListMistakes(ctx, true)
	if err != nil {
		return err
	}
	reviews, err := s.q.ExportDailyReviews(ctx)
	if err != nil {
		return err
	}
	focuses, err := s.q.ExportFocuses(ctx)
	if err != nil {
		return err
	}
	marks, err := s.q.ExportWeeklyMarks(ctx)
	if err != nil {
		return err
	}
	dayMistakes, err := s.q.ExportDayMistakes(ctx)
	if err != nil {
		return err
	}

	identities, err := s.q.ExportIdentities(ctx)
	if err != nil {
		return err
	}
	entries, err := s.q.ExportAuditEntries(ctx)
	if err != nil {
		return err
	}

	out := exportJSON{
		Identities: []exportIdentityJSON{}, AuditEntries: []exportAuditJSON{},
		ExportedAt: fmtTime(s.now()), Settings: settingsJSON{TimeZone: st.TimeZone},
		Accounts: make([]accountJSON, 0, len(accts)), Trades: make([]exportTradeJSON, 0, len(trades)),
		Mistakes: make([]mistakeJSON, 0, len(mistakes)), DailyReview: []exportReviewJSON{}, Focuses: []exportFocusJSON{},
		WeeklyMarks: []exportMarkJSON{}, DayMistakes: []exportDayMistakeJSON{},
	}
	for _, a := range accts {
		out.Accounts = append(out.Accounts, toAccount(a.ID, a.Name, a.Currency, a.TradingDayStart, a.Archived, a.UpdatedAt, a.Kind))
	}
	for _, t := range trades {
		e := exportTradeJSON{tradeJSON: toTrade(t, loc)}
		e.Judgement.PlanFollowed, e.Judgement.Label, e.Judgement.Mistakes = t.PlanFollowed, t.Label, byTrade[t.ID]
		if e.Judgement.Mistakes == nil {
			e.Judgement.Mistakes = []string{}
		}
		out.Trades = append(out.Trades, e)
	}
	for _, m := range mistakes {
		out.Mistakes = append(out.Mistakes, toMistake(m.ID, m.Name, m.StopLine, m.StopPeriod, m.Retired, m.UpdatedAt))
	}
	for _, r := range reviews {
		out.DailyReview = append(out.DailyReview, exportReviewJSON{
			AccountID: r.AccountID, AccountName: r.AccountName, Date: dayText(r.TradingDay), DidWell: r.DidWell, CouldImprove: r.CouldImprove,
			NextFocus: r.NextFocus, MentalGrade: intPtr(r.MentalGrade), TechnicalGrade: intPtr(r.TechnicalGrade),
			ReviewedAt: timePtr(r.ReviewedAt), EditedAt: timePtr(r.EditedAt),
		})
	}
	for _, f := range focuses {
		out.Focuses = append(out.Focuses, exportFocusJSON{Period: f.Period, PeriodStart: dayText(f.PeriodStart), Body: f.Body})
	}
	for _, m := range marks {
		out.WeeklyMarks = append(out.WeeklyMarks, exportMarkJSON{AccountID: m.AccountID, AccountName: m.AccountName, WeekStart: dayText(m.WeekStart), ReviewedAt: fmtTime(m.ReviewedAt)})
	}
	for _, d := range dayMistakes {
		out.DayMistakes = append(out.DayMistakes, exportDayMistakeJSON{AccountID: d.AccountID, AccountName: d.AccountName, Date: dayText(d.TradingDay), MistakeID: d.MistakeID, Mistake: d.Mistake})
	}
	for _, i := range identities {
		out.Identities = append(out.Identities, exportIdentityJSON{ID: i.ID, Email: i.Email, Provider: i.Provider,
			AddedAt: fmtTime(i.AddedAt), LastSignInAt: timePtr(i.LastSignInAt), DisabledAt: timePtr(i.DisabledAt)})
	}
	for _, e := range entries {
		fields := e.ChangedFields
		if fields == nil {
			fields = []string{}
		}
		out.AuditEntries = append(out.AuditEntries, exportAuditJSON{ID: e.ID, At: fmtTime(e.At), ActorKind: e.ActorKind,
			IdentityEmail: e.IdentityEmail, Kind: e.Kind, Subject: e.Subject, ChangedFields: fields})
	}
	return c.JSON(out)
}
