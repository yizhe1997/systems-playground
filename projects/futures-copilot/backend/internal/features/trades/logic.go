package trades

import (
	"fmt"
	"strings"

	core "futures-copilot-mvp/internal/core"
)

const DraftRiskWarningThreshold = 800.0

// ComputeRiskMath calculates deterministic risk based on instrument point value.
func ComputeRiskMath(plan core.TradePlan) float64 {
	multiplier := plan.PointValue
	if multiplier <= 0 {
		multiplier = 10.0 // fallback default
	}

	distance := plan.Entry - plan.StopLoss
	if plan.Bias == "Short" {
		distance = plan.StopLoss - plan.Entry
	}

	if distance < 0 {
		distance = 0
	}

	return distance * multiplier * float64(plan.Contracts)
}

func InstrumentMultiplier(instrument string) float64 {
	switch instrument {
	case "GC":
		return 100.0
	case "NQ":
		return 20.0
	case "ES":
		return 50.0
	default:
		return 10.0
	}
}

func BuildDraftAIResponse(riskAmount float64) core.AIResponse {
	response := core.AIResponse{
		Decision:   "approved",
		RiskAmount: riskAmount,
		Feedback:   "Looks good. 15m order block aligns perfectly with London sweep.",
	}

	if riskAmount > DraftRiskWarningThreshold {
		response.Decision = "warning"
		response.Feedback = fmt.Sprintf("Risk ($%.2f) is dangerously close to your daily loss limit. Reduce size.", riskAmount)
	}

	return response
}

func BuildJournalRetrospective(outcome string) string {
	if outcome == "LOSS" {
		return "Loss logged. Upon review, you took this 15 mins before CPI. Rule #4 violated."
	}

	return "Journal logged. Good discipline holding to target despite the early chop."
}

func NullableString(value *string) any {
	if value == nil || *value == "" {
		return nil
	}

	return value
}

func ValidateDraftTrade(plan core.TradePlan) string {
	if plan.AccountID == "" || plan.Instrument == "" || plan.Bias == "" {
		return "Missing required trade fields"
	}

	if plan.Contracts <= 0 {
		return "Contracts must be greater than zero"
	}

	return ""
}

func ValidateTradeStatusUpdate(req core.UpdateTradeStatusRequest) string {
	if req.Status == "" {
		return "Missing status"
	}

	return ""
}

func ValidateJournalTrade(req core.JournalTradeRequest) string {
	if req.TradeID == "" || req.Outcome == "" {
		return "Missing journal fields"
	}

	return ""
}

func ValidateInvalidateTrade(req core.InvalidateTradeRequest) string {
	if strings.TrimSpace(req.Reason) == "" {
		return "Invalidation reason is required"
	}

	return ""
}
