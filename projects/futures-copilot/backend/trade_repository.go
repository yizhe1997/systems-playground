package main

import (
	"context"
	"fmt"
	"log"
	"math"
	"strings"
	"time"
)

type TradeFilters struct {
	AccountID   string
	Status      string
	CreatedFrom string
	CreatedTo   string
}

type PaginatedTradesResult struct {
	Items      []TradePlan
	Total      int
	Page       int
	PageSize   int
	TotalPages int
}

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
		var createdAt time.Time

		if err := rows.Scan(&trade.ID, &trade.AccountID, &trade.RubricID, &trade.Instrument, &trade.Bias, &trade.Entry, &trade.StopLoss, &trade.TakeProfit, &trade.Contracts, &riskAmount, &trade.Status, &trade.Notes, &createdAt, &trade.PnL, &trade.Outcome); err != nil {
			log.Printf("Scan error in getTrades: %v", err)
			continue
		}

		trade.CreatedAt = createdAt.Format(time.RFC3339)

		trades = append(trades, trade)
	}

	return trades, nil
}

func listTradesPaginated(ctx context.Context, page int, pageSize int, filters TradeFilters) (PaginatedTradesResult, error) {
	whereParts := make([]string, 0)
	args := make([]any, 0)
	argIndex := 1

	if filters.AccountID != "" {
		whereParts = append(whereParts, fmt.Sprintf("t.account_id = $%d", argIndex))
		args = append(args, filters.AccountID)
		argIndex++
	}

	if filters.Status != "" && filters.Status != "all" {
		whereParts = append(whereParts, fmt.Sprintf("t.status = $%d", argIndex))
		args = append(args, filters.Status)
		argIndex++
	}

	if filters.CreatedFrom != "" {
		whereParts = append(whereParts, fmt.Sprintf("DATE(t.created_at) >= $%d", argIndex))
		args = append(args, filters.CreatedFrom)
		argIndex++
	}

	if filters.CreatedTo != "" {
		whereParts = append(whereParts, fmt.Sprintf("DATE(t.created_at) <= $%d", argIndex))
		args = append(args, filters.CreatedTo)
		argIndex++
	}

	whereClause := ""
	if len(whereParts) > 0 {
		whereClause = " WHERE " + strings.Join(whereParts, " AND ")
	}

	countQuery := "SELECT COUNT(*) FROM trade_plans t" + whereClause
	var total int
	if err := db.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return PaginatedTradesResult{}, err
	}

	limitPlaceholder := argIndex
	offsetPlaceholder := argIndex + 1
	selectQuery := `
		SELECT t.id, t.account_id, t.rubric_id, t.instrument, t.bias, t.entry, t.stop_loss, t.take_profit, t.contracts, t.risk_amount, t.status, t.notes, t.created_at, o.pnl, o.outcome 
		FROM trade_plans t 
		LEFT JOIN trade_outcomes o ON o.trade_id = t.id
	` + whereClause + fmt.Sprintf(" ORDER BY t.created_at DESC LIMIT $%d OFFSET $%d", limitPlaceholder, offsetPlaceholder)

	offset := (page - 1) * pageSize
	queryArgs := append(args, pageSize, offset)

	rows, err := db.Query(ctx, selectQuery, queryArgs...)
	if err != nil {
		return PaginatedTradesResult{}, err
	}
	defer rows.Close()

	items := make([]TradePlan, 0)
	for rows.Next() {
		var trade TradePlan
		var riskAmount float64
		var createdAt time.Time

		if err := rows.Scan(&trade.ID, &trade.AccountID, &trade.RubricID, &trade.Instrument, &trade.Bias, &trade.Entry, &trade.StopLoss, &trade.TakeProfit, &trade.Contracts, &riskAmount, &trade.Status, &trade.Notes, &createdAt, &trade.PnL, &trade.Outcome); err != nil {
			log.Printf("Scan error in getTrades paginated: %v", err)
			continue
		}

		trade.CreatedAt = createdAt.Format(time.RFC3339)

		items = append(items, trade)
	}

	totalPages := int(math.Ceil(float64(total) / float64(pageSize)))
	if totalPages == 0 {
		totalPages = 1
	}

	return PaginatedTradesResult{
		Items:      items,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
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
