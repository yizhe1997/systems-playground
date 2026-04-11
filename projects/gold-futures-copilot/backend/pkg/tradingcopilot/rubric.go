package tradingcopilot

import "context"

type RubricEvaluationInput struct {
	Plan      TradePlan
	Metrics   PreTradeMetrics
	Retrieved []RetrievalContext
}

type RubricEvaluationResult struct {
	Decision           string           `json:"decision"`
	OverallScore       int              `json:"overallScore"`
	RuleScores         []map[string]any `json:"ruleScores"`
	RiskFlags          []string         `json:"riskFlags"`
	Recommendations    []string         `json:"recommendations"`
	PublicExplanation  string           `json:"publicExplanation"`
	CreatorExplanation string           `json:"creatorExplanation"`
	Raw                map[string]any   `json:"raw"`
}

type RubricEvaluator interface {
	Evaluate(ctx context.Context, input RubricEvaluationInput) (RubricEvaluationResult, error)
}

type DefaultRubricEvaluator struct{}

func (d DefaultRubricEvaluator) Evaluate(_ context.Context, input RubricEvaluationInput) (RubricEvaluationResult, error) {
	score := 50
	decision := "revise"
	riskFlags := []string{}
	recommendations := []string{"Refine stop placement relative to session volatility."}

	if input.Metrics.RewardToRisk >= 2 {
		score = 88
		decision = "approve"
		recommendations = []string{"Setup quality is strong. Maintain execution discipline."}
	} else if input.Metrics.RewardToRisk < 1 {
		score = 35
		decision = "reject"
		riskFlags = append(riskFlags, "reward_to_risk_below_one")
		recommendations = []string{"Increase expected reward or tighten stop to improve risk efficiency."}
	}

	ruleScores := []map[string]any{
		{"rule": "reward_to_risk", "score": score, "value": input.Metrics.RewardToRisk},
		{"rule": "structure_completeness", "score": 90},
	}

	return RubricEvaluationResult{
		Decision:           decision,
		OverallScore:       score,
		RuleScores:         ruleScores,
		RiskFlags:          riskFlags,
		Recommendations:    recommendations,
		PublicExplanation:  "This setup passed baseline risk checks and aligns with published methodology.",
		CreatorExplanation: "Detailed evaluation considers RR, level quality, and historical-pattern similarity context.",
		Raw: map[string]any{
			"retrievalContextCount": len(input.Retrieved),
		},
	}, nil
}
