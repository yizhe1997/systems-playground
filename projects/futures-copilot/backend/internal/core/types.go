package core

// Structs mapping to the Next.js forms.
type AccountConfig struct {
	ID                    string  `json:"id"`
	Type                  string  `json:"type"`
	CurrentBalance        float64 `json:"currentBalance"`
	CurrentDailyStopLevel float64 `json:"currentDailyStopLevel"`
	CurrentMaxLossLevel   float64 `json:"currentMaxLossLevel"`
	RulesContext          string  `json:"rulesContext"`
	CreatedAt             string  `json:"createdAt"`
}

type Rubric struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Rules string `json:"rules"`
}

type InstrumentDefinition struct {
	Code       string  `json:"code"`
	PointValue float64 `json:"pointValue"`
	CreatedAt  string  `json:"createdAt,omitempty"`
}

type TradePlan struct {
	ID                 string   `json:"id"`
	AccountID          string   `json:"accountId"`
	RubricID           *string  `json:"rubricId"`
	Instrument         string   `json:"instrument"`
	Bias               string   `json:"bias"`
	Entry              float64  `json:"entry"`
	StopLoss           float64  `json:"stopLoss"`
	TakeProfit         float64  `json:"takeProfit"`
	Contracts          int      `json:"contracts"`
	RiskAmount         float64  `json:"riskAmount"`
	Notes              *string  `json:"notes"`
	Status             string   `json:"status"`
	AISetupGradeStatus string   `json:"aiSetupGradeStatus,omitempty"`
	AISetupFindings    *string  `json:"aiSetupFindings,omitempty"`
	InvalidationReason *string  `json:"invalidationReason,omitempty"`
	InvalidatedAt      *string  `json:"invalidatedAt,omitempty"`
	CreatedAt          string   `json:"createdAt,omitempty"`
	UpdatedAt          string   `json:"updatedAt,omitempty"`
	PnL                *float64 `json:"pnl,omitempty"`
	Outcome            *string  `json:"outcome,omitempty"`
	PointValue         float64  `json:"-"` // Internal use only, not exposed in API
}

type AIResponse struct {
	Decision   string  `json:"decision"`
	RiskAmount float64 `json:"riskAmount"`
	Feedback   string  `json:"feedback"`
}

type UserAlertChannel struct {
	UserEmail         string `json:"userEmail"`
	Channel           string `json:"channel"`
	Destination       string `json:"destination"`
	Enabled           bool   `json:"enabled"`
	NotifyNewDraft    bool   `json:"notifyNewDraft"`
	NotifyLimitFilled bool   `json:"notifyLimitFilled"`
	NotifyClosed      bool   `json:"notifyClosed"`
	NotifyInvalidated bool   `json:"notifyInvalidated"`
}

type AIFeatureConfig struct {
	Key       string `json:"key"`
	Label     string `json:"label,omitempty"`
	Provider  string `json:"provider"`
	Model     string `json:"model"`
	TimeoutMs int    `json:"timeoutMs,omitempty"`
}

// AIProviderConfig is the internal flat representation (matches DB columns).
type AIProviderConfig struct {
	Features           []AIFeatureConfig   `json:"-"`
	ModelPresets       map[string][]string `json:"-"`
	TimeoutMs          int                 `json:"-"`
	UpdatedAt          string              `json:"-"`
	AvailableProviders []string            `json:"-"`

	// Legacy fields kept for compatibility with existing tests/callers.
	ScrapeRulesProvider string `json:"-"`
	ScrapeRulesModel    string `json:"-"`
	CleanupTextProvider string `json:"-"`
	CleanupTextModel    string `json:"-"`
}
