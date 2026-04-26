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
		trade, err := scanTradePlanRow(rows)
		if err != nil {
			log.Printf("Scan error in getTrades: %v", err)
			continue
		}
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
		SELECT t.id, t.account_id, t.rubric_id, t.instrument, t.bias, t.entry, t.stop_loss, t.take_profit, t.contracts, t.risk_amount, t.status, t.notes, t.ai_setup_grade_status, t.ai_setup_findings, t.invalidation_reason, t.invalidated_at, t.created_at, o.pnl, o.outcome 
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
		trade, err := scanTradePlanRow(rows)
		if err != nil {
			log.Printf("Scan error in getTrades paginated: %v", err)
			continue
		}
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

func scanTradePlanRow(scanner interface {
	Scan(dest ...any) error
}) (TradePlan, error) {
	var trade TradePlan
	var riskAmount float64
	var invalidatedAt *time.Time
	var createdAt time.Time

	if err := scanner.Scan(&trade.ID, &trade.AccountID, &trade.RubricID, &trade.Instrument, &trade.Bias, &trade.Entry, &trade.StopLoss, &trade.TakeProfit, &trade.Contracts, &riskAmount, &trade.Status, &trade.Notes, &trade.AISetupGradeStatus, &trade.AISetupFindings, &trade.InvalidationReason, &invalidatedAt, &createdAt, &trade.PnL, &trade.Outcome); err != nil {
		return TradePlan{}, err
	}

	trade.CreatedAt = createdAt.Format(time.RFC3339)
	if invalidatedAt != nil {
		formatted := invalidatedAt.Format(time.RFC3339)
		trade.InvalidatedAt = &formatted
	}
	return trade, nil
}

func getTradeByID(ctx context.Context, id string) (TradePlan, error) {
	var trade TradePlan
	var invalidatedAt *time.Time
	var createdAt time.Time
	if err := db.QueryRow(ctx, selectTradeByIDQuery, id).Scan(
		&trade.ID,
		&trade.AccountID,
		&trade.RubricID,
		&trade.Instrument,
		&trade.Bias,
		&trade.Entry,
		&trade.StopLoss,
		&trade.TakeProfit,
		&trade.Contracts,
		&trade.Status,
		&trade.Notes,
		&trade.AISetupGradeStatus,
		&trade.AISetupFindings,
		&trade.InvalidationReason,
		&invalidatedAt,
		&createdAt,
	); err != nil {
		return TradePlan{}, err
	}

	trade.CreatedAt = createdAt.Format(time.RFC3339)
	if invalidatedAt != nil {
		formatted := invalidatedAt.Format(time.RFC3339)
		trade.InvalidatedAt = &formatted
	}
	return trade, nil
}

func saveDraftTrade(ctx context.Context, plan TradePlan, riskAmount float64, aiSetupGradeStatus string, aiSetupFindings *string) error {
	_, err := db.Exec(ctx, upsertTradePlanQuery, plan.ID, plan.AccountID, nullableString(plan.RubricID), plan.Instrument, plan.Bias, plan.Entry, plan.StopLoss, plan.TakeProfit, plan.Contracts, riskAmount, plan.Status, plan.Notes, aiSetupGradeStatus, aiSetupFindings)
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

func invalidateTradePlan(ctx context.Context, id string, reason string) (bool, error) {
	result, err := db.Exec(ctx, invalidateTradeQuery, reason, id)
	if err != nil {
		return false, err
	}

	return result.RowsAffected() > 0, nil
}

func setTradeAISetupGradeStatus(ctx context.Context, id string, status string) error {
	_, err := db.Exec(ctx, updateTradeAISetupGradeStatusQuery, status, id)
	return err
}

func setTradeAISetupGradeResult(ctx context.Context, id string, status string, findings string) error {
	_, err := db.Exec(ctx, updateTradeAISetupGradeResultQuery, status, findings, id)
	return err
}

func saveTradeOutcome(ctx context.Context, req journalTradeRequest) error {
	_, err := db.Exec(ctx, insertTradeOutcomeQuery, req.TradeID, req.PnL, req.Outcome, req.Reflection)
	return err
}
