package tradingcopilot

import "math"

type PreTradeMetrics struct {
	RiskPerUnit   float64 `json:"riskPerUnit"`
	RewardPerUnit float64 `json:"rewardPerUnit"`
	RewardToRisk  float64 `json:"rewardToRisk"`
	EntryMidpoint float64 `json:"entryMidpoint"`
}

type PortfolioSnapshotMetrics struct {
	Equity      float64 `json:"equity"`
	DailyPnl    float64 `json:"dailyPnl"`
	WeeklyPnl   float64 `json:"weeklyPnl"`
	MonthlyPnl  float64 `json:"monthlyPnl"`
	WinRate     float64 `json:"winRate"`
	ExpectancyR float64 `json:"expectancyR"`
	TradeCount  int     `json:"tradeCount"`
}

func ComputePreTradeMetrics(plan TradePlan) PreTradeMetrics {
	entryMid := (plan.EntryLow + plan.EntryHigh) / 2
	risk := math.Abs(entryMid - plan.StopLoss)
	reward := math.Abs(plan.TakeProfit1 - entryMid)

	rr := 0.0
	if risk > 0 {
		rr = reward / risk
	}

	return PreTradeMetrics{
		RiskPerUnit:   round4(risk),
		RewardPerUnit: round4(reward),
		RewardToRisk:  round4(rr),
		EntryMidpoint: round4(entryMid),
	}
}

func round4(v float64) float64 {
	return math.Round(v*10000) / 10000
}

func ComputePortfolioSnapshot(totalPnl float64, totalR float64, tradeCount int, wins int) PortfolioSnapshotMetrics {
	winRate := 0.0
	expectancyR := 0.0
	if tradeCount > 0 {
		winRate = (float64(wins) / float64(tradeCount)) * 100
		expectancyR = totalR / float64(tradeCount)
	}

	return PortfolioSnapshotMetrics{
		Equity:      round4(totalPnl),
		DailyPnl:    round4(totalPnl),
		WeeklyPnl:   round4(totalPnl),
		MonthlyPnl:  round4(totalPnl),
		WinRate:     round4(winRate),
		ExpectancyR: round4(expectancyR),
		TradeCount:  tradeCount,
	}
}
