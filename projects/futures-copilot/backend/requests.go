package main

type syncUserRequest struct {
	ProviderID string `json:"providerId"`
	Email      string `json:"email"`
	Name       string `json:"name"`
}

type disableUserRequest struct {
	Email string `json:"email"`
}

type saveAlertChannelRequest struct {
	UserEmail         string `json:"userEmail"`
	Channel           string `json:"channel"`
	Destination       string `json:"destination"`
	Enabled           bool   `json:"enabled"`
	NotifyNewDraft    bool   `json:"notifyNewDraft"`
	NotifyLimitFilled bool   `json:"notifyLimitFilled"`
	NotifyClosed      bool   `json:"notifyClosed"`
	NotifyInvalidated bool   `json:"notifyInvalidated"`
}

type testAlertChannelRequest struct {
	UserEmail   string `json:"userEmail"`
	Channel     string `json:"channel"`
	Destination string `json:"destination"`
}

type scrapeRulesRequest struct {
	FeatureKey  string   `json:"featureKey"`
	URLs        []string `json:"urls"`
	AccountType string   `json:"accountType"`
}

type improveRulesRequest struct {
	FeatureKey  string `json:"featureKey"`
	Text        string `json:"text"`
	AccountType string `json:"accountType"`
}

type improveTextRequest struct {
	FeatureKey string `json:"featureKey"`
	Text       string `json:"text"`
}

type updateAIProviderConfigRequest struct {
	Features  []AIFeatureConfig `json:"features"`
	TimeoutMs int               `json:"timeoutMs"`
}

type updateTradeStatusRequest struct {
	Status string `json:"status"`
}

type invalidateTradeRequest struct {
	Reason string `json:"reason"`
}

type draftTradeRequest struct {
	ID              string  `json:"id"`
	AccountID       string  `json:"accountId"`
	RubricID        *string `json:"rubricId"`
	Instrument      string  `json:"instrument"`
	Bias            string  `json:"bias"`
	Entry           float64 `json:"entry"`
	StopLoss        float64 `json:"stopLoss"`
	TakeProfit      float64 `json:"takeProfit"`
	Contracts       int     `json:"contracts"`
	Notes           *string `json:"notes"`
	RunAISetupGrade bool    `json:"runAiSetupGrade"`
}

type journalTradeRequest struct {
	TradeID    string  `json:"tradeId"`
	PnL        float64 `json:"pnl"`
	Outcome    string  `json:"outcome"`
	Reflection string  `json:"reflection"`
}
