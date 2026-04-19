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
	URLs        []string `json:"urls"`
	AccountType string   `json:"accountType"`
}

type improveRulesRequest struct {
	Text        string `json:"text"`
	AccountType string `json:"accountType"`
}

type improveTextRequest struct {
	Text string `json:"text"`
}

type updateAIProviderConfigRequest struct {
	Features  []AIFeatureConfig `json:"features"`
	TimeoutMs int               `json:"timeoutMs"`
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
