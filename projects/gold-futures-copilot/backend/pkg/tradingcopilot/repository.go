package tradingcopilot

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

type TradePlan struct {
	ID                string     `json:"id"`
	Instrument        string     `json:"instrument"`
	StrategyOrigin    string     `json:"strategyOrigin"`
	SessionDate       string     `json:"sessionDate"`
	Bias              string     `json:"bias"`
	EntryLow          float64    `json:"entryLow"`
	EntryHigh         float64    `json:"entryHigh"`
	StopLoss          float64    `json:"stopLoss"`
	TakeProfit1       float64    `json:"takeProfit1"`
	TakeProfit2       *float64   `json:"takeProfit2,omitempty"`
	TakeProfit3       *float64   `json:"takeProfit3,omitempty"`
	ScalingPlan       any        `json:"scalingPlan,omitempty"`
	InvalidationNotes string     `json:"invalidationNotes,omitempty"`
	CreatorNotes      string     `json:"creatorNotes,omitempty"`
	Status            string     `json:"status"`
	PublishedAt       *time.Time `json:"publishedAt,omitempty"`
}

type CreateTradePlanInput struct {
	Instrument        string   `json:"instrument"`
	StrategyOrigin    string   `json:"strategyOrigin,omitempty"`
	SessionDate       string   `json:"sessionDate"`
	Bias              string   `json:"bias"`
	EntryLow          float64  `json:"entryLow"`
	EntryHigh         float64  `json:"entryHigh"`
	StopLoss          float64  `json:"stopLoss"`
	TakeProfit1       float64  `json:"takeProfit1"`
	TakeProfit2       *float64 `json:"takeProfit2,omitempty"`
	TakeProfit3       *float64 `json:"takeProfit3,omitempty"`
	ScalingPlan       any      `json:"scalingPlan,omitempty"`
	InvalidationNotes string   `json:"invalidationNotes,omitempty"`
	CreatorNotes      string   `json:"creatorNotes,omitempty"`
}

type RubricVersion struct {
	ID                string `json:"id"`
	Name              string `json:"name"`
	Version           int    `json:"version"`
	ApprovalThreshold int    `json:"approvalThreshold"`
	IsActive          bool   `json:"isActive"`
}

type RubricRule struct {
	ID              string  `json:"id"`
	RubricVersionID string  `json:"rubricVersionId"`
	RuleKey         string  `json:"ruleKey"`
	Description     string  `json:"description"`
	Weight          float64 `json:"weight"`
	EvaluationType  string  `json:"evaluationType"`
}

type AIEvaluation struct {
	ID                 string           `json:"id"`
	TradePlanID        string           `json:"tradePlanId"`
	Decision           string           `json:"decision"`
	OverallScore       int              `json:"overallScore"`
	RuleScores         []map[string]any `json:"ruleScores"`
	RiskFlags          []string         `json:"riskFlags"`
	Recommendations    []string         `json:"recommendations"`
	PublicExplanation  string           `json:"publicExplanation"`
	CreatorExplanation string           `json:"creatorExplanation"`
	CreatedAt          time.Time        `json:"createdAt"`
}

type ShowroomSummary struct {
	Performance         map[string]any `json:"performance"`
	StrategyOverview    string         `json:"strategyOverview"`
	ActivePreview       map[string]any `json:"activePreview,omitempty"`
	LatestClosedSummary map[string]any `json:"latestClosedSummary,omitempty"`
}

type Subscription struct {
	ID               string     `json:"id"`
	SubscriberUserID string     `json:"subscriberUserId"`
	IsActive         bool       `json:"isActive"`
	StartedAt        time.Time  `json:"startedAt"`
	ExpiresAt        *time.Time `json:"expiresAt,omitempty"`
}

type AlertChannel struct {
	ID               string `json:"id"`
	SubscriberUserID string `json:"subscriberUserId"`
	ChannelType      string `json:"channelType"`
	Destination      string `json:"destination"`
	IsEnabled        bool   `json:"isEnabled"`
}

type AlertEvent struct {
	ID           string         `json:"id"`
	TradePlanID  string         `json:"tradePlanId"`
	EventType    string         `json:"eventType"`
	DispatchMode string         `json:"dispatchMode"`
	Payload      map[string]any `json:"payload"`
}

type AlertDelivery struct {
	ID             string     `json:"id"`
	AlertEventID   string     `json:"alertEventId"`
	AlertChannelID string     `json:"alertChannelId"`
	Status         string     `json:"status"`
	AttemptCount   int        `json:"attemptCount"`
	LastError      *string    `json:"lastError,omitempty"`
	DeliveredAt    *time.Time `json:"deliveredAt,omitempty"`
}

type TradeOutcome struct {
	ID           string    `json:"id"`
	TradePlanID  string    `json:"tradePlanId"`
	EntryPrice   float64   `json:"entryPrice"`
	ExitPrice    float64   `json:"exitPrice"`
	PositionSize float64   `json:"positionSize"`
	MAE          *float64  `json:"mae,omitempty"`
	MFE          *float64  `json:"mfe,omitempty"`
	CreatorNotes string    `json:"creatorNotes,omitempty"`
	ClosedAt     time.Time `json:"closedAt"`
	RealizedPnl  float64   `json:"realizedPnl"`
	RealizedR    float64   `json:"realizedR"`
}

type PortfolioSnapshot struct {
	ID          string    `json:"id"`
	AsOf        time.Time `json:"asOf"`
	Equity      float64   `json:"equity"`
	DailyPnl    float64   `json:"dailyPnl"`
	WeeklyPnl   float64   `json:"weeklyPnl"`
	MonthlyPnl  float64   `json:"monthlyPnl"`
	OpenRisk    float64   `json:"openRisk"`
	WinRate     float64   `json:"winRate"`
	ExpectancyR float64   `json:"expectancyR"`
	MaxDrawdown float64   `json:"maxDrawdown"`
	TradeCount  int       `json:"tradeCount"`
}

type MemoryRecord struct {
	ID         string `json:"id"`
	SourceType string `json:"sourceType"`
	SourceID   string `json:"sourceId"`
	Content    string `json:"content"`
}

func (r *Repository) CreateTradePlan(ctx context.Context, in CreateTradePlanInput) (TradePlan, error) {
	scalingJSON, _ := json.Marshal(in.ScalingPlan)
	plan := TradePlan{}
	q := `
		INSERT INTO trade_plans
			(instrument, strategy_origin, session_date, bias, entry_low, entry_high, stop_loss, take_profit_1, take_profit_2, take_profit_3, scaling_plan, invalidation_notes, creator_notes, status)
		VALUES
			($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12, $13, 'draft')
		RETURNING id, instrument, strategy_origin, session_date::text, bias, entry_low, entry_high, stop_loss, take_profit_1, take_profit_2, take_profit_3, invalidation_notes, creator_notes, status, published_at;
	`
	if err := r.pool.QueryRow(ctx, q,
		in.Instrument, in.StrategyOrigin, in.SessionDate, in.Bias, in.EntryLow, in.EntryHigh, in.StopLoss, in.TakeProfit1, in.TakeProfit2, in.TakeProfit3, string(scalingJSON), in.InvalidationNotes, in.CreatorNotes,
	).Scan(
		&plan.ID, &plan.Instrument, &plan.StrategyOrigin, &plan.SessionDate, &plan.Bias, &plan.EntryLow, &plan.EntryHigh, &plan.StopLoss, &plan.TakeProfit1, &plan.TakeProfit2, &plan.TakeProfit3, &plan.InvalidationNotes, &plan.CreatorNotes, &plan.Status, &plan.PublishedAt,
	); err != nil {
		return TradePlan{}, fmt.Errorf("create trade plan: %w", err)
	}
	return plan, nil
}

func (r *Repository) GetTradePlanByID(ctx context.Context, id string) (TradePlan, error) {
	var plan TradePlan
	q := `
		SELECT id, instrument, strategy_origin, session_date::text, bias, entry_low, entry_high, stop_loss, take_profit_1, take_profit_2, take_profit_3, invalidation_notes, creator_notes, status, published_at
		FROM trade_plans WHERE id = $1
	`
	if err := r.pool.QueryRow(ctx, q, id).Scan(
		&plan.ID, &plan.Instrument, &plan.StrategyOrigin, &plan.SessionDate, &plan.Bias, &plan.EntryLow, &plan.EntryHigh, &plan.StopLoss, &plan.TakeProfit1, &plan.TakeProfit2, &plan.TakeProfit3, &plan.InvalidationNotes, &plan.CreatorNotes, &plan.Status, &plan.PublishedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return TradePlan{}, ErrNotFound
		}
		return TradePlan{}, fmt.Errorf("get trade plan: %w", err)
	}
	return plan, nil
}

func (r *Repository) UpdateTradePlanStatus(ctx context.Context, id, status string, publishedAt *time.Time) (TradePlan, error) {
	var plan TradePlan
	q := `
		UPDATE trade_plans
		SET status=$2, published_at=COALESCE($3, published_at), updated_at=now()
		WHERE id=$1
		RETURNING id, instrument, strategy_origin, session_date::text, bias, entry_low, entry_high, stop_loss, take_profit_1, take_profit_2, take_profit_3, invalidation_notes, creator_notes, status, published_at;
	`
	if err := r.pool.QueryRow(ctx, q, id, status, publishedAt).Scan(
		&plan.ID, &plan.Instrument, &plan.StrategyOrigin, &plan.SessionDate, &plan.Bias, &plan.EntryLow, &plan.EntryHigh, &plan.StopLoss, &plan.TakeProfit1, &plan.TakeProfit2, &plan.TakeProfit3, &plan.InvalidationNotes, &plan.CreatorNotes, &plan.Status, &plan.PublishedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return TradePlan{}, ErrNotFound
		}
		return TradePlan{}, fmt.Errorf("update trade plan status: %w", err)
	}
	return plan, nil
}

func (r *Repository) CreateAIEvaluation(ctx context.Context, in AIEvaluation) (AIEvaluation, error) {
	ruleScores, _ := json.Marshal(in.RuleScores)
	riskFlags, _ := json.Marshal(in.RiskFlags)
	recommendations, _ := json.Marshal(in.Recommendations)

	var eval AIEvaluation
	q := `
		INSERT INTO ai_evaluations
			(trade_plan_id, decision, overall_score, rule_scores, risk_flags, recommendations, public_explanation, creator_explanation)
		VALUES
			($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8)
		RETURNING id, trade_plan_id, decision, overall_score, rule_scores, risk_flags, recommendations, public_explanation, creator_explanation, created_at;
	`
	if err := r.pool.QueryRow(ctx, q,
		in.TradePlanID, in.Decision, in.OverallScore, string(ruleScores), string(riskFlags), string(recommendations), in.PublicExplanation, in.CreatorExplanation,
	).Scan(
		&eval.ID, &eval.TradePlanID, &eval.Decision, &eval.OverallScore, &ruleScores, &riskFlags, &recommendations, &eval.PublicExplanation, &eval.CreatorExplanation, &eval.CreatedAt,
	); err != nil {
		return AIEvaluation{}, fmt.Errorf("create ai evaluation: %w", err)
	}
	_ = json.Unmarshal(ruleScores, &eval.RuleScores)
	_ = json.Unmarshal(riskFlags, &eval.RiskFlags)
	_ = json.Unmarshal(recommendations, &eval.Recommendations)

	return eval, nil
}

func (r *Repository) GetLatestAIEvaluation(ctx context.Context, tradePlanID string) (AIEvaluation, error) {
	var eval AIEvaluation
	var ruleScores, riskFlags, recommendations []byte
	q := `
		SELECT id, trade_plan_id, decision, overall_score, rule_scores, risk_flags, recommendations, public_explanation, creator_explanation, created_at
		FROM ai_evaluations
		WHERE trade_plan_id=$1
		ORDER BY created_at DESC
		LIMIT 1;
	`
	if err := r.pool.QueryRow(ctx, q, tradePlanID).Scan(
		&eval.ID, &eval.TradePlanID, &eval.Decision, &eval.OverallScore, &ruleScores, &riskFlags, &recommendations, &eval.PublicExplanation, &eval.CreatorExplanation, &eval.CreatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return AIEvaluation{}, ErrNotFound
		}
		return AIEvaluation{}, fmt.Errorf("latest ai evaluation: %w", err)
	}
	_ = json.Unmarshal(ruleScores, &eval.RuleScores)
	_ = json.Unmarshal(riskFlags, &eval.RiskFlags)
	_ = json.Unmarshal(recommendations, &eval.Recommendations)

	return eval, nil
}

func (r *Repository) GetActiveRubricVersion(ctx context.Context) (RubricVersion, error) {
	var rv RubricVersion
	q := `SELECT id, name, version, approval_threshold, is_active FROM rubric_versions WHERE is_active=true ORDER BY version DESC LIMIT 1`
	if err := r.pool.QueryRow(ctx, q).Scan(&rv.ID, &rv.Name, &rv.Version, &rv.ApprovalThreshold, &rv.IsActive); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return RubricVersion{
				ID:                uuid.NewString(),
				Name:              "default",
				Version:           1,
				ApprovalThreshold: 70,
				IsActive:          true,
			}, nil
		}
		return RubricVersion{}, fmt.Errorf("active rubric version: %w", err)
	}
	return rv, nil
}

var ErrNotFound = errors.New("not found")

func (r *Repository) GetShowroomSummary(ctx context.Context) (ShowroomSummary, error) {
	performance := map[string]any{
		"totalTrades": 0,
		"wins":        0,
		"losses":      0,
		"winRate":     0,
	}

	var totalTrades, wins int
	statsQuery := `
		SELECT
			COUNT(1) AS total,
			COUNT(1) FILTER (WHERE (exit_price - entry_price) * position_size > 0) AS wins
		FROM trade_outcomes;
	`
	if err := r.pool.QueryRow(ctx, statsQuery).Scan(&totalTrades, &wins); err == nil {
		losses := totalTrades - wins
		winRate := 0.0
		if totalTrades > 0 {
			winRate = (float64(wins) / float64(totalTrades)) * 100
		}
		performance = map[string]any{
			"totalTrades": totalTrades,
			"wins":        wins,
			"losses":      losses,
			"winRate":     round4(winRate),
		}
	}

	activePreview := map[string]any{}
	activeQuery := `
		SELECT id, bias, status, strategy_origin, session_date::text
		FROM trade_plans
		WHERE status='published'
		ORDER BY published_at DESC NULLS LAST, created_at DESC
		LIMIT 1;
	`
	var id, bias, status, strategyOrigin, sessionDate string
	if err := r.pool.QueryRow(ctx, activeQuery).Scan(&id, &bias, &status, &strategyOrigin, &sessionDate); err == nil {
		activePreview = map[string]any{
			"id":             id,
			"bias":           bias,
			"status":         status,
			"strategyOrigin": strategyOrigin,
			"sessionDate":    sessionDate,
		}
	}

	latestClosed := map[string]any{}
	closedQuery := `
		SELECT tp.id, tp.bias, tp.session_date::text, tp.strategy_origin, to2.entry_price, to2.exit_price
		FROM trade_plans tp
		JOIN trade_outcomes to2 ON to2.trade_plan_id = tp.id
		ORDER BY to2.closed_at DESC
		LIMIT 1;
	`
	var entryPrice, exitPrice float64
	if err := r.pool.QueryRow(ctx, closedQuery).Scan(&id, &bias, &sessionDate, &strategyOrigin, &entryPrice, &exitPrice); err == nil {
		latestClosed = map[string]any{
			"id":             id,
			"bias":           bias,
			"sessionDate":    sessionDate,
			"strategyOrigin": strategyOrigin,
			"outcome": map[string]any{
				"entryPrice": entryPrice,
				"exitPrice":  exitPrice,
			},
		}
	}

	return ShowroomSummary{
		Performance:         performance,
		StrategyOverview:    "Discretionary GC plan generation with deterministic risk checks and AI-assisted review.",
		ActivePreview:       activePreview,
		LatestClosedSummary: latestClosed,
	}, nil
}

func (r *Repository) UpsertSubscription(ctx context.Context, userID string, isActive bool, expiresAt *time.Time) (Subscription, error) {
	q := `
		INSERT INTO subscriptions (subscriber_user_id, is_active, started_at, expires_at)
		VALUES ($1, $2, now(), $3)
		ON CONFLICT (subscriber_user_id)
		DO UPDATE SET
			is_active=EXCLUDED.is_active,
			expires_at=EXCLUDED.expires_at,
			updated_at=now()
		RETURNING id, subscriber_user_id, is_active, started_at, expires_at;
	`

	var s Subscription
	if err := r.pool.QueryRow(ctx, q, userID, isActive, expiresAt).Scan(&s.ID, &s.SubscriberUserID, &s.IsActive, &s.StartedAt, &s.ExpiresAt); err != nil {
		return Subscription{}, fmt.Errorf("upsert subscription: %w", err)
	}
	return s, nil
}

func (r *Repository) UpsertAlertChannel(ctx context.Context, userID, channelType, destination string) (AlertChannel, error) {
	q := `
		INSERT INTO alert_channels (subscriber_user_id, channel_type, destination, is_enabled)
		VALUES ($1, $2, $3, true)
		ON CONFLICT (subscriber_user_id, channel_type, destination)
		DO UPDATE SET is_enabled=true, updated_at=now()
		RETURNING id, subscriber_user_id, channel_type, destination, is_enabled;
	`

	var c AlertChannel
	if err := r.pool.QueryRow(ctx, q, userID, channelType, destination).Scan(&c.ID, &c.SubscriberUserID, &c.ChannelType, &c.Destination, &c.IsEnabled); err != nil {
		return AlertChannel{}, fmt.Errorf("upsert alert channel: %w", err)
	}
	return c, nil
}

func (r *Repository) ListActiveAlertChannels(ctx context.Context) ([]AlertChannel, error) {
	q := `
		SELECT ac.id, ac.subscriber_user_id, ac.channel_type, ac.destination, ac.is_enabled
		FROM alert_channels ac
		JOIN subscriptions s ON s.subscriber_user_id = ac.subscriber_user_id
		WHERE ac.is_enabled=true
		  AND s.is_active=true
		  AND (s.expires_at IS NULL OR s.expires_at > now());
	`
	rows, err := r.pool.Query(ctx, q)
	if err != nil {
		return nil, fmt.Errorf("list active alert channels: %w", err)
	}
	defer rows.Close()

	channels := make([]AlertChannel, 0)
	for rows.Next() {
		var c AlertChannel
		if err := rows.Scan(&c.ID, &c.SubscriberUserID, &c.ChannelType, &c.Destination, &c.IsEnabled); err != nil {
			return nil, fmt.Errorf("scan active alert channel: %w", err)
		}
		channels = append(channels, c)
	}
	return channels, nil
}

func (r *Repository) CreateAlertEvent(ctx context.Context, tradePlanID, eventType, dispatchMode string, payload map[string]any) (AlertEvent, error) {
	payloadJSON, _ := json.Marshal(payload)
	q := `
		INSERT INTO alert_events (trade_plan_id, event_type, dispatch_mode, audience_scope, payload)
		VALUES ($1, $2, $3, 'paid', $4::jsonb)
		RETURNING id, trade_plan_id, event_type, dispatch_mode, payload;
	`

	var ae AlertEvent
	var scannedPayload []byte
	if err := r.pool.QueryRow(ctx, q, tradePlanID, eventType, dispatchMode, string(payloadJSON)).Scan(&ae.ID, &ae.TradePlanID, &ae.EventType, &ae.DispatchMode, &scannedPayload); err != nil {
		return AlertEvent{}, fmt.Errorf("create alert event: %w", err)
	}
	_ = json.Unmarshal(scannedPayload, &ae.Payload)
	return ae, nil
}

func (r *Repository) CreateAlertDelivery(ctx context.Context, alertEventID, alertChannelID, status string, attemptCount int, lastError *string, deliveredAt *time.Time) (AlertDelivery, error) {
	q := `
		INSERT INTO alert_deliveries (alert_event_id, alert_channel_id, status, attempt_count, last_error, delivered_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, alert_event_id, alert_channel_id, status, attempt_count, last_error, delivered_at;
	`

	var d AlertDelivery
	if err := r.pool.QueryRow(ctx, q, alertEventID, alertChannelID, status, attemptCount, lastError, deliveredAt).Scan(
		&d.ID, &d.AlertEventID, &d.AlertChannelID, &d.Status, &d.AttemptCount, &d.LastError, &d.DeliveredAt,
	); err != nil {
		return AlertDelivery{}, fmt.Errorf("create alert delivery: %w", err)
	}
	return d, nil
}

func (r *Repository) CreateTradeOutcome(ctx context.Context, outcome TradeOutcome) (TradeOutcome, error) {
	q := `
		INSERT INTO trade_outcomes (trade_plan_id, entry_price, exit_price, position_size, mae, mfe, creator_notes, closed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, trade_plan_id, entry_price, exit_price, position_size, mae, mfe, creator_notes, closed_at;
	`
	var created TradeOutcome
	if err := r.pool.QueryRow(ctx, q,
		outcome.TradePlanID, outcome.EntryPrice, outcome.ExitPrice, outcome.PositionSize, outcome.MAE, outcome.MFE, outcome.CreatorNotes, outcome.ClosedAt,
	).Scan(
		&created.ID, &created.TradePlanID, &created.EntryPrice, &created.ExitPrice, &created.PositionSize, &created.MAE, &created.MFE, &created.CreatorNotes, &created.ClosedAt,
	); err != nil {
		return TradeOutcome{}, fmt.Errorf("create trade outcome: %w", err)
	}
	created.RealizedPnl = round4((created.ExitPrice - created.EntryPrice) * created.PositionSize)
	riskDenominator := created.PositionSize
	if riskDenominator == 0 {
		riskDenominator = 1
	}
	created.RealizedR = round4(created.RealizedPnl / riskDenominator)
	return created, nil
}

func (r *Repository) AggregateOutcomeStats(ctx context.Context) (totalPnl float64, totalR float64, tradeCount int, wins int, err error) {
	q := `
		SELECT
			COALESCE(SUM((exit_price - entry_price) * position_size), 0) AS total_pnl,
			COALESCE(SUM((exit_price - entry_price)), 0) AS total_r,
			COUNT(1) AS trade_count,
			COUNT(1) FILTER (WHERE (exit_price - entry_price) * position_size > 0) AS wins
		FROM trade_outcomes;
	`
	if err := r.pool.QueryRow(ctx, q).Scan(&totalPnl, &totalR, &tradeCount, &wins); err != nil {
		return 0, 0, 0, 0, fmt.Errorf("aggregate outcomes: %w", err)
	}
	return totalPnl, totalR, tradeCount, wins, nil
}

func (r *Repository) CreatePortfolioSnapshot(ctx context.Context, m PortfolioSnapshotMetrics) (PortfolioSnapshot, error) {
	q := `
		INSERT INTO portfolio_snapshots (equity, daily_pnl, weekly_pnl, monthly_pnl, open_risk, win_rate, expectancy_r, max_drawdown, trade_count)
		VALUES ($1, $2, $3, $4, 0, $5, $6, 0, $7)
		RETURNING id, as_of, equity, daily_pnl, weekly_pnl, monthly_pnl, open_risk, win_rate, expectancy_r, max_drawdown, trade_count;
	`
	var ps PortfolioSnapshot
	if err := r.pool.QueryRow(ctx, q, m.Equity, m.DailyPnl, m.WeeklyPnl, m.MonthlyPnl, m.WinRate, m.ExpectancyR, m.TradeCount).Scan(
		&ps.ID, &ps.AsOf, &ps.Equity, &ps.DailyPnl, &ps.WeeklyPnl, &ps.MonthlyPnl, &ps.OpenRisk, &ps.WinRate, &ps.ExpectancyR, &ps.MaxDrawdown, &ps.TradeCount,
	); err != nil {
		return PortfolioSnapshot{}, fmt.Errorf("create portfolio snapshot: %w", err)
	}
	return ps, nil
}

func (r *Repository) UpsertMemoryRecord(ctx context.Context, sourceType, sourceID, content string) (MemoryRecord, error) {
	q := `
		INSERT INTO memory_records (source_type, source_id, content)
		VALUES ($1, $2, $3)
		RETURNING id, source_type, source_id::text, content;
	`
	var mr MemoryRecord
	if err := r.pool.QueryRow(ctx, q, sourceType, sourceID, content).Scan(&mr.ID, &mr.SourceType, &mr.SourceID, &mr.Content); err != nil {
		return MemoryRecord{}, fmt.Errorf("upsert memory record: %w", err)
	}
	return mr, nil
}

func (r *Repository) GetJournalTimelinessReport(ctx context.Context) (within24h int, total int, err error) {
	q := `
		SELECT
			COUNT(1) FILTER (WHERE to2.created_at <= to2.closed_at + interval '24 hours') AS within_24h,
			COUNT(1) AS total
		FROM trade_outcomes to2;
	`
	if err := r.pool.QueryRow(ctx, q).Scan(&within24h, &total); err != nil {
		return 0, 0, fmt.Errorf("journal timeliness report: %w", err)
	}
	return within24h, total, nil
}
