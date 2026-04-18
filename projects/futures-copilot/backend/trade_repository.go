package main

import (
	"context"
	"log"
)

func listTrades(ctx context.Context) ([]TradePlan, error) {
	rows, err := db.Query(ctx, selectTradesQuery)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	trades := make([]TradePlan, 0)
	for rows.Next() {
		var trade TradePlan
		var riskAmount float64

		if err := rows.Scan(&trade.ID, &trade.AccountID, &trade.RubricID, &trade.Instrument, &trade.Bias, &trade.Entry, &trade.StopLoss, &trade.TakeProfit, &trade.Contracts, &riskAmount, &trade.Status, &trade.Notes, &trade.PnL, &trade.Outcome); err != nil {
			log.Printf("Scan error in getTrades: %v", err)
			continue
		}

		trades = append(trades, trade)
	}

	return trades, nil
}

func saveDraftTrade(ctx context.Context, plan TradePlan, riskAmount float64) error {
	_, err := db.Exec(ctx, upsertTradePlanQuery, plan.ID, plan.AccountID, nullableString(plan.RubricID), plan.Instrument, plan.Bias, plan.Entry, plan.StopLoss, plan.TakeProfit, plan.Contracts, riskAmount, plan.Status, plan.Notes)
	return err
}

func setTradeStatus(ctx context.Context, id string, status string) error {
	_, err := db.Exec(ctx, updateTradeStatusQuery, status, id)
	return err
}

func closeTrade(ctx context.Context, id string) error {
	_, err := db.Exec(ctx, closeTradeQuery, id)
	return err
}

func saveTradeOutcome(ctx context.Context, req journalTradeRequest) error {
	_, err := db.Exec(ctx, insertTradeOutcomeQuery, req.TradeID, req.PnL, req.Outcome, req.Reflection)
	return err
}
