package api

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

type exportJSON struct {
	ExportedAt string        `json:"exportedAt"`
	Settings   settingsJSON  `json:"settings"`
	Accounts   []accountJSON `json:"accounts"`
	Trades     []tradeJSON   `json:"trades"`
}

// export answers everything as one document: settings, every account (archived marked) and every trade
// (deleted marked). Money stays as exact decimal strings.
func (s *Server) export(c *fiber.Ctx) error {
	ctx := c.Context()
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
	out := exportJSON{ExportedAt: fmtTime(s.now()), Settings: settingsJSON{TimeZone: st.TimeZone},
		Accounts: make([]accountJSON, 0, len(accts)), Trades: make([]tradeJSON, 0, len(trades))}
	for _, a := range accts {
		out.Accounts = append(out.Accounts, toAccount(a.ID, a.Name, a.Currency, a.TradingDayStart, a.Archived, a.UpdatedAt))
	}
	for _, t := range trades {
		out.Trades = append(out.Trades, toTrade(t, loc))
	}
	return c.JSON(out)
}
