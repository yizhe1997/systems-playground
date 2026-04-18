package main

// Structs mapping to the Next.js forms.
type AccountConfig struct {
	ID                    string  `json:"id"`
	Type                  string  `json:"type"`
	CurrentBalance        float64 `json:"currentBalance"`
	CurrentDailyStopLevel float64 `json:"currentDailyStopLevel"`
	CurrentMaxLossLevel   float64 `json:"currentMaxLossLevel"`
	RulesContext          string  `json:"rulesContext"`
}

type Rubric struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Rules      string `json:"rules"`
	PineScript string `json:"pinescript"`
}

type TradePlan struct {
	ID         string   `json:"id"`
	AccountID  string   `json:"accountId"`
	RubricID   *string  `json:"rubricId"`
	Instrument string   `json:"instrument"`
	Bias       string   `json:"bias"`
	Entry      float64  `json:"entry"`
	StopLoss   float64  `json:"stopLoss"`
	TakeProfit float64  `json:"takeProfit"`
	Contracts  int      `json:"contracts"`
	Notes      *string  `json:"notes"`
	Status     string   `json:"status"`
	UpdatedAt  string   `json:"updatedAt,omitempty"`
	PnL        *float64 `json:"pnl,omitempty"`
	Outcome    *string  `json:"outcome,omitempty"`
}

type AIResponse struct {
	Decision   string  `json:"decision"`
	RiskAmount float64 `json:"riskAmount"`
	Feedback   string  `json:"feedback"`
}
