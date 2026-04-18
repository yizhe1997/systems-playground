package main

type syncUserRequest struct {
	ProviderID string `json:"providerId"`
	Email      string `json:"email"`
	Name       string `json:"name"`
}

type disableUserRequest struct {
	Email string `json:"email"`
}

type scrapeRulesRequest struct {
	URLs []string `json:"urls"`
}

type improveRulesRequest struct {
	Text string `json:"text"`
}

type updateTradeStatusRequest struct {
	Status string `json:"status"`
}

type journalTradeRequest struct {
	TradeID    string  `json:"tradeId"`
	PnL        float64 `json:"pnl"`
	Outcome    string  `json:"outcome"`
	Reflection string  `json:"reflection"`
}
