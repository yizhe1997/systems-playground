package tradingcopilot

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/yizhe1997/systems-playground/projects/gold-futures-copilot/backend/pkg/audit"
	"github.com/yizhe1997/systems-playground/projects/gold-futures-copilot/backend/pkg/observability"
)

type EventPublisher interface {
	PublishJSON(ctx context.Context, topic string, key string, payload any) error
}

type TradeOutcomeRequest struct {
	EntryPrice   float64  `json:"entryPrice"`
	ExitPrice    float64  `json:"exitPrice"`
	PositionSize float64  `json:"positionSize"`
	MAE          *float64 `json:"mae,omitempty"`
	MFE          *float64 `json:"mfe,omitempty"`
	CreatorNotes string   `json:"creatorNotes,omitempty"`
	ClosedAt     string   `json:"closedAt"`
}

type PostTradeEvaluationResponse struct {
	Decision           string           `json:"decision"`
	OverallScore       int              `json:"overallScore"`
	RuleScores         []map[string]any `json:"ruleScores"`
	RiskFlags          []string         `json:"riskFlags"`
	Recommendations    []string         `json:"recommendations"`
	PublicExplanation  string           `json:"publicExplanation"`
	CreatorExplanation string           `json:"creatorExplanation"`
	Lessons            []string         `json:"lessons"`
}

type Service struct {
	repo      *Repository
	rubric    RubricEvaluator
	retriever Retriever
	publisher EventPublisher
}

func NewService(repo *Repository, rubric RubricEvaluator, retriever Retriever, publisher EventPublisher) *Service {
	return &Service{repo: repo, rubric: rubric, retriever: retriever, publisher: publisher}
}

func (s *Service) CreateTradePlan(ctx context.Context, in CreateTradePlanInput) (TradePlan, error) {
	if in.EntryLow > in.EntryHigh {
		return TradePlan{}, fmt.Errorf("entryLow cannot exceed entryHigh")
	}
	origin := strings.ToLower(strings.TrimSpace(in.StrategyOrigin))
	if origin == "" {
		origin = "human"
	}
	if origin != "human" && origin != "ai" {
		return TradePlan{}, fmt.Errorf("strategyOrigin must be one of: human, ai")
	}
	in.StrategyOrigin = origin
	return s.repo.CreateTradePlan(ctx, in)
}

func (s *Service) GradeTradePlan(ctx context.Context, id string) (AIEvaluation, error) {
	started := time.Now()
	defer observability.RecordGradingLatency(started)

	plan, err := s.repo.GetTradePlanByID(ctx, id)
	if err != nil {
		return AIEvaluation{}, err
	}
	metrics := ComputePreTradeMetrics(plan)
	retrieved, err := s.retriever.FindSimilarPlans(ctx, plan, 5)
	if err != nil {
		return AIEvaluation{}, fmt.Errorf("retrieve similar plans: %w", err)
	}

	graded, err := s.rubric.Evaluate(ctx, RubricEvaluationInput{
		Plan:      plan,
		Metrics:   metrics,
		Retrieved: retrieved,
	})
	if err != nil {
		return AIEvaluation{}, fmt.Errorf("rubric evaluate: %w", err)
	}

	eval, err := s.repo.CreateAIEvaluation(ctx, AIEvaluation{
		TradePlanID:        plan.ID,
		Decision:           graded.Decision,
		OverallScore:       graded.OverallScore,
		RuleScores:         graded.RuleScores,
		RiskFlags:          graded.RiskFlags,
		Recommendations:    graded.Recommendations,
		PublicExplanation:  graded.PublicExplanation,
		CreatorExplanation: graded.CreatorExplanation,
	})
	if err != nil {
		return AIEvaluation{}, err
	}

	_, err = s.repo.UpdateTradePlanStatus(ctx, plan.ID, "graded", nil)
	if err != nil {
		return AIEvaluation{}, err
	}

	_ = s.publisher.PublishJSON(ctx, "tradingcopilot.plan.events.v1", plan.ID, map[string]any{
		"eventType":    "trade_plan_graded",
		"tradePlanId":  plan.ID,
		"decision":     eval.Decision,
		"overallScore": eval.OverallScore,
		"occurredAt":   time.Now().UTC(),
	})
	audit.LogAction("creator", "grade_trade_plan", plan.ID, map[string]any{"decision": eval.Decision, "overallScore": eval.OverallScore})

	return eval, nil
}

func (s *Service) PublishTradePlan(ctx context.Context, id string) (TradePlan, error) {
	plan, err := s.repo.GetTradePlanByID(ctx, id)
	if err != nil {
		return TradePlan{}, err
	}

	eval, err := s.repo.GetLatestAIEvaluation(ctx, id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return TradePlan{}, fmt.Errorf("trade plan must be graded before publish")
		}
		return TradePlan{}, err
	}

	rv, err := s.repo.GetActiveRubricVersion(ctx)
	if err != nil {
		return TradePlan{}, err
	}
	if eval.Decision != "approve" || eval.OverallScore < rv.ApprovalThreshold {
		return TradePlan{}, fmt.Errorf("plan does not meet publish threshold")
	}

	now := time.Now().UTC()
	published, err := s.repo.UpdateTradePlanStatus(ctx, plan.ID, "published", &now)
	if err != nil {
		return TradePlan{}, err
	}

	_ = s.publisher.PublishJSON(ctx, "tradingcopilot.plan.events.v1", plan.ID, map[string]any{
		"eventType":     "trade_plan_published",
		"tradePlanId":   plan.ID,
		"audienceScope": "paid",
		"publishedAt":   now,
	})
	audit.LogAction("creator", "publish_trade_plan", plan.ID, map[string]any{"publishedAt": now})

	return published, nil
}

func (s *Service) GetShowroomSummary(ctx context.Context) (ShowroomSummary, error) {
	summary, err := s.repo.GetShowroomSummary(ctx)
	if err != nil {
		return ShowroomSummary{}, err
	}
	return s.applyAnonymousMasking(summary), nil
}

func (s *Service) applyAnonymousMasking(summary ShowroomSummary) ShowroomSummary {
	masked := summary
	if len(masked.ActivePreview) > 0 {
		masked.ActivePreview["actionableLevels"] = "hidden"
		delete(masked.ActivePreview, "entryLow")
		delete(masked.ActivePreview, "entryHigh")
		delete(masked.ActivePreview, "stopLoss")
		delete(masked.ActivePreview, "takeProfit1")
	}
	return masked
}

func (s *Service) GrantSubscription(ctx context.Context, subscriberUserID string, expiresAt *time.Time) (Subscription, error) {
	if strings.TrimSpace(subscriberUserID) == "" {
		return Subscription{}, fmt.Errorf("subscriberUserId is required")
	}
	return s.repo.UpsertSubscription(ctx, subscriberUserID, true, expiresAt)
}

func (s *Service) RevokeSubscription(ctx context.Context, subscriberUserID string) (Subscription, error) {
	if strings.TrimSpace(subscriberUserID) == "" {
		return Subscription{}, fmt.Errorf("subscriberUserId is required")
	}
	return s.repo.UpsertSubscription(ctx, subscriberUserID, false, nil)
}

func (s *Service) RenewSubscription(ctx context.Context, subscriberUserID string, expiresAt time.Time) (Subscription, error) {
	if strings.TrimSpace(subscriberUserID) == "" {
		return Subscription{}, fmt.Errorf("subscriberUserId is required")
	}
	return s.repo.UpsertSubscription(ctx, subscriberUserID, true, &expiresAt)
}

func (s *Service) SubmitTradeOutcome(ctx context.Context, tradePlanID string, req TradeOutcomeRequest) (PostTradeEvaluationResponse, error) {
	closedAt, err := time.Parse(time.RFC3339, req.ClosedAt)
	if err != nil {
		return PostTradeEvaluationResponse{}, fmt.Errorf("closedAt must be RFC3339")
	}
	if req.PositionSize == 0 {
		return PostTradeEvaluationResponse{}, fmt.Errorf("positionSize cannot be zero")
	}

	outcome, err := s.repo.CreateTradeOutcome(ctx, TradeOutcome{
		TradePlanID:  tradePlanID,
		EntryPrice:   req.EntryPrice,
		ExitPrice:    req.ExitPrice,
		PositionSize: req.PositionSize,
		MAE:          req.MAE,
		MFE:          req.MFE,
		CreatorNotes: req.CreatorNotes,
		ClosedAt:     closedAt,
	})
	if err != nil {
		return PostTradeEvaluationResponse{}, err
	}

	_, err = s.repo.UpdateTradePlanStatus(ctx, tradePlanID, "closed", nil)
	if err != nil {
		return PostTradeEvaluationResponse{}, err
	}

	totalPnl, totalR, tradeCount, wins, err := s.repo.AggregateOutcomeStats(ctx)
	if err != nil {
		return PostTradeEvaluationResponse{}, err
	}
	metrics := ComputePortfolioSnapshot(totalPnl, totalR, tradeCount, wins)
	_, err = s.repo.CreatePortfolioSnapshot(ctx, metrics)
	if err != nil {
		return PostTradeEvaluationResponse{}, err
	}

	memoryContent := fmt.Sprintf("Trade %s outcome pnl=%0.2f r=%0.2f notes=%s", tradePlanID, outcome.RealizedPnl, outcome.RealizedR, req.CreatorNotes)
	for _, chunk := range ChunkMemoryContent(memoryContent, 240) {
		_, _ = s.repo.UpsertMemoryRecord(ctx, "lesson", outcome.ID, chunk.Content)
	}
	memory, err := s.repo.UpsertMemoryRecord(ctx, "trade_outcome", outcome.ID, memoryContent)
	if err != nil {
		return PostTradeEvaluationResponse{}, err
	}

	_ = s.publisher.PublishJSON(ctx, "tradingcopilot.journal.events.v1", tradePlanID, map[string]any{
		"eventType":   "trade_outcome_recorded",
		"tradePlanId": tradePlanID,
		"outcomeId":   outcome.ID,
		"realizedPnl": outcome.RealizedPnl,
		"realizedR":   outcome.RealizedR,
		"occurredAt":  time.Now().UTC(),
	})
	_ = s.publisher.PublishJSON(ctx, "tradingcopilot.journal.events.v1", tradePlanID, map[string]any{
		"eventType":      "memory_record_upserted",
		"memoryRecordId": memory.ID,
		"sourceType":     memory.SourceType,
		"sourceId":       memory.SourceID,
		"occurredAt":     time.Now().UTC(),
	})

	lessons := []string{
		"Review execution against initial invalidation criteria.",
		"Track recurring context patterns for next setup planning.",
	}

	decision := "revise"
	if outcome.RealizedPnl > 0 {
		decision = "approve"
	}

	return PostTradeEvaluationResponse{
		Decision:           decision,
		OverallScore:       80,
		RuleScores:         []map[string]any{{"rule": "outcome_quality", "score": 80}},
		RiskFlags:          []string{},
		Recommendations:    []string{"Maintain risk discipline and continue journaling every closed trade."},
		PublicExplanation:  "Outcome recorded and portfolio stats updated.",
		CreatorExplanation: "Detailed retrospective stored with deterministic metrics and memory context.",
		Lessons:            lessons,
	}, nil
}

func (s *Service) GetJournalTimelinessReport(ctx context.Context) (map[string]any, error) {
	within24h, total, err := s.repo.GetJournalTimelinessReport(ctx)
	if err != nil {
		return nil, err
	}
	pct := 0.0
	if total > 0 {
		pct = (float64(within24h) / float64(total)) * 100
	}
	return map[string]any{
		"within24h": within24h,
		"total":     total,
		"percent":   round4(pct),
	}, nil
}
