package trades

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math"
	"strings"
	"time"

	core "futures-copilot-mvp/internal/core"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Filters struct {
	AccountID   string
	Status      string
	CreatedFrom string
	CreatedTo   string
}

type PaginatedResult struct {
	Items      []core.TradePlan
	Total      int
	Page       int
	PageSize   int
	TotalPages int
}

type Repository interface {
	ListTrades(ctx context.Context) ([]core.TradePlan, error)
	ListTradesPaginated(ctx context.Context, page int, pageSize int, filters Filters) (PaginatedResult, error)
	GetTradeByID(ctx context.Context, id string) (core.TradePlan, error)
	SaveDraftTrade(ctx context.Context, plan core.TradePlan, riskAmount float64, aiSetupGradeStatus string, aiSetupFindings *string) error
	SetTradeStatus(ctx context.Context, id string, status string) error
	CloseTrade(ctx context.Context, id string) error
	InvalidateTradePlan(ctx context.Context, id string, reason string) (bool, error)
	SetTradeAISetupGradeStatus(ctx context.Context, id string, status string) error
	SetTradeAISetupGradeResult(ctx context.Context, id string, status string, findings string) error
	SaveTradeOutcome(ctx context.Context, req core.JournalTradeRequest) error
}

type postgresRepository struct {
	dbGetter func() *pgxpool.Pool
}

func NewPostgresRepository(dbGetter func() *pgxpool.Pool) Repository {
	return postgresRepository{dbGetter: dbGetter}
}

func (r postgresRepository) ListTrades(ctx context.Context) ([]core.TradePlan, error) {
	pool := r.dbGetter()
	if pool == nil {
		return nil, errors.New("postgres is not initialized")
	}

	rows, err := pool.Query(ctx, selectTradesQuery)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	trades := make([]core.TradePlan, 0)
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

func (r postgresRepository) ListTradesPaginated(ctx context.Context, page int, pageSize int, filters Filters) (PaginatedResult, error) {
	pool := r.dbGetter()
	if pool == nil {
		return PaginatedResult{}, errors.New("postgres is not initialized")
	}

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
	if err := pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return PaginatedResult{}, err
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

	rows, err := pool.Query(ctx, selectQuery, queryArgs...)
	if err != nil {
		return PaginatedResult{}, err
	}
	defer rows.Close()

	items := make([]core.TradePlan, 0)
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

	return PaginatedResult{
		Items:      items,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}

func scanTradePlanRow(scanner interface {
	Scan(dest ...any) error
}) (core.TradePlan, error) {
	var trade core.TradePlan
	var riskAmount float64
	var invalidatedAt *time.Time
	var createdAt time.Time

	if err := scanner.Scan(&trade.ID, &trade.AccountID, &trade.RubricID, &trade.Instrument, &trade.Bias, &trade.Entry, &trade.StopLoss, &trade.TakeProfit, &trade.Contracts, &riskAmount, &trade.Status, &trade.Notes, &trade.AISetupGradeStatus, &trade.AISetupFindings, &trade.InvalidationReason, &invalidatedAt, &createdAt, &trade.PnL, &trade.Outcome); err != nil {
		return core.TradePlan{}, err
	}

	trade.RiskAmount = riskAmount
	trade.CreatedAt = createdAt.Format(time.RFC3339)
	if invalidatedAt != nil {
		formatted := invalidatedAt.Format(time.RFC3339)
		trade.InvalidatedAt = &formatted
	}
	return trade, nil
}

func (r postgresRepository) GetTradeByID(ctx context.Context, id string) (core.TradePlan, error) {
	pool := r.dbGetter()
	if pool == nil {
		return core.TradePlan{}, errors.New("postgres is not initialized")
	}

	var trade core.TradePlan
	var riskAmount float64
	var invalidatedAt *time.Time
	var createdAt time.Time
	if err := pool.QueryRow(ctx, selectTradeByIDQuery, id).Scan(
		&trade.ID,
		&trade.AccountID,
		&trade.RubricID,
		&trade.Instrument,
		&trade.Bias,
		&trade.Entry,
		&trade.StopLoss,
		&trade.TakeProfit,
		&trade.Contracts,
		&riskAmount,
		&trade.Status,
		&trade.Notes,
		&trade.AISetupGradeStatus,
		&trade.AISetupFindings,
		&trade.InvalidationReason,
		&invalidatedAt,
		&createdAt,
	); err != nil {
		return core.TradePlan{}, err
	}

	trade.RiskAmount = riskAmount
	trade.CreatedAt = createdAt.Format(time.RFC3339)
	if invalidatedAt != nil {
		formatted := invalidatedAt.Format(time.RFC3339)
		trade.InvalidatedAt = &formatted
	}
	return trade, nil
}

func (r postgresRepository) SaveDraftTrade(ctx context.Context, plan core.TradePlan, riskAmount float64, aiSetupGradeStatus string, aiSetupFindings *string) error {
	pool := r.dbGetter()
	if pool == nil {
		return errors.New("postgres is not initialized")
	}

	_, err := pool.Exec(ctx, upsertTradePlanQuery, plan.ID, plan.AccountID, NullableString(plan.RubricID), plan.Instrument, plan.Bias, plan.Entry, plan.StopLoss, plan.TakeProfit, plan.Contracts, riskAmount, plan.Status, plan.Notes, aiSetupGradeStatus, aiSetupFindings)
	return err
}

func (r postgresRepository) SetTradeStatus(ctx context.Context, id string, status string) error {
	pool := r.dbGetter()
	if pool == nil {
		return errors.New("postgres is not initialized")
	}

	_, err := pool.Exec(ctx, updateTradeStatusQuery, status, id)
	return err
}

func (r postgresRepository) CloseTrade(ctx context.Context, id string) error {
	pool := r.dbGetter()
	if pool == nil {
		return errors.New("postgres is not initialized")
	}

	_, err := pool.Exec(ctx, closeTradeQuery, id)
	return err
}

func (r postgresRepository) InvalidateTradePlan(ctx context.Context, id string, reason string) (bool, error) {
	pool := r.dbGetter()
	if pool == nil {
		return false, errors.New("postgres is not initialized")
	}

	result, err := pool.Exec(ctx, invalidateTradeQuery, reason, id)
	if err != nil {
		return false, err
	}

	return result.RowsAffected() > 0, nil
}

func (r postgresRepository) SetTradeAISetupGradeStatus(ctx context.Context, id string, status string) error {
	pool := r.dbGetter()
	if pool == nil {
		return errors.New("postgres is not initialized")
	}

	_, err := pool.Exec(ctx, updateTradeAISetupGradeStatusQuery, status, id)
	return err
}

func (r postgresRepository) SetTradeAISetupGradeResult(ctx context.Context, id string, status string, findings string) error {
	pool := r.dbGetter()
	if pool == nil {
		return errors.New("postgres is not initialized")
	}

	_, err := pool.Exec(ctx, updateTradeAISetupGradeResultQuery, status, findings, id)
	return err
}

func (r postgresRepository) SaveTradeOutcome(ctx context.Context, req core.JournalTradeRequest) error {
	pool := r.dbGetter()
	if pool == nil {
		return errors.New("postgres is not initialized")
	}

	_, err := pool.Exec(ctx, insertTradeOutcomeQuery, req.TradeID, req.PnL, req.Outcome, req.Reflection)
	return err
}

const (
	selectTradesQuery = `
		SELECT t.id, t.account_id, t.rubric_id, t.instrument, t.bias, t.entry, t.stop_loss, t.take_profit, t.contracts, t.risk_amount, t.status, t.notes, t.ai_setup_grade_status, t.ai_setup_findings, t.invalidation_reason, t.invalidated_at, t.created_at, o.pnl, o.outcome
		FROM trade_plans t
		LEFT JOIN trade_outcomes o ON o.trade_id = t.id
		ORDER BY t.created_at DESC
	`

	upsertTradePlanQuery = `
		INSERT INTO trade_plans (id, account_id, rubric_id, instrument, bias, entry, stop_loss, take_profit, contracts, risk_amount, status, notes, ai_setup_grade_status, ai_setup_findings)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		ON CONFLICT (id) DO UPDATE SET
			instrument = EXCLUDED.instrument,
			bias = EXCLUDED.bias,
			entry = EXCLUDED.entry,
			stop_loss = EXCLUDED.stop_loss,
			take_profit = EXCLUDED.take_profit,
			contracts = EXCLUDED.contracts,
			risk_amount = EXCLUDED.risk_amount,
			notes = EXCLUDED.notes,
			ai_setup_grade_status = EXCLUDED.ai_setup_grade_status,
			ai_setup_findings = EXCLUDED.ai_setup_findings,
			updated_at = CURRENT_TIMESTAMP
	`

	updateTradeStatusQuery = "UPDATE trade_plans SET status = $1 WHERE id = $2"
	closeTradeQuery        = "UPDATE trade_plans SET status = 'closed' WHERE id = $1"
	invalidateTradeQuery   = "UPDATE trade_plans SET status = 'invalidated', invalidation_reason = $1, invalidated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND status IN ('draft', 'working', 'filled')"

	updateTradeAISetupGradeStatusQuery = "UPDATE trade_plans SET ai_setup_grade_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2"
	updateTradeAISetupGradeResultQuery = "UPDATE trade_plans SET ai_setup_grade_status = $1, ai_setup_findings = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3"
	selectTradeByIDQuery               = "SELECT id, account_id, rubric_id, instrument, bias, entry, stop_loss, take_profit, contracts, risk_amount, status, notes, ai_setup_grade_status, ai_setup_findings, invalidation_reason, invalidated_at, created_at FROM trade_plans WHERE id = $1"

	insertTradeOutcomeQuery = `
		INSERT INTO trade_outcomes (trade_id, pnl, outcome, reflection) VALUES ($1, $2, $3, $4)
	`
)
