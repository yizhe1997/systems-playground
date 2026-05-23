package app

import (
	"context"
	core "futures-copilot-mvp/internal/core"
	accountsfeature "futures-copilot-mvp/internal/features/accounts"
	aifeature "futures-copilot-mvp/internal/features/ai"
	alertsfeature "futures-copilot-mvp/internal/features/alerts"
	instrumentsfeature "futures-copilot-mvp/internal/features/instruments"
	rubricsfeature "futures-copilot-mvp/internal/features/rubrics"
	tradesfeature "futures-copilot-mvp/internal/features/trades"
	usersfeature "futures-copilot-mvp/internal/features/users"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Dependencies struct {
	AccountsRepo         accountsfeature.Repository
	RubricsRepo          rubricsfeature.Repository
	InstrumentsRepo      instrumentsfeature.Repository
	TradeRepo            tradesfeature.Repository
	UsersRepo            usersfeature.Repository
	AlertsRepo           alertsfeature.Repository
	AIProviderConfigRepo aifeature.ProviderConfigRepository
	DB                   *pgxpool.Pool
	RDB                  *redis.Client
}

type AlertDependenciesBuilder func(rdb *redis.Client) alertsfeature.Dependencies
type TradeDependenciesBuilder func(rdb *redis.Client, instrumentsRepo instrumentsfeature.Repository, alertsRepo alertsfeature.Repository, alertDeps alertsfeature.Dependencies) tradesfeature.Dependencies

func BuildAlertDependencies(rdb *redis.Client) alertsfeature.Dependencies {
	deps := alertsfeature.Dependencies{
		EnqueueAlertJob: func(ctx context.Context, jobPayload []byte) error {
			return alertsfeature.EnqueueAlertJob(rdb, ctx, jobPayload)
		},
	}

	if rdb != nil {
		deps.RateLimitSetNX = func(ctx context.Context, key string, value interface{}, expiration time.Duration) (bool, error) {
			return rdb.SetNX(ctx, key, value, expiration).Result()
		}
		deps.RateLimitDel = func(ctx context.Context, key string) error {
			return rdb.Del(ctx, key).Err()
		}
	}

	return deps
}

func BuildTradeDependencies(rdb *redis.Client, instrumentsRepo instrumentsfeature.Repository, alertsRepo alertsfeature.Repository, alertDeps alertsfeature.Dependencies) tradesfeature.Dependencies {
	return tradesfeature.Dependencies{
		ListInstruments: func(ctx context.Context) ([]core.InstrumentDefinition, error) {
			return instrumentsRepo.ListInstruments(ctx)
		},
		EnqueueAISetupGradeJob: func(ctx context.Context, tradeID string) error {
			return tradesfeature.EnqueueAISetupGradeJob(rdb, ctx, tradeID)
		},
		TriggerAlerts: func(ctx context.Context, triggerType string, tradeSymbol string, tradeID string, side string, entry float64, stopLoss float64, takeProfit float64, risk float64) error {
			return alertsfeature.TriggerAlerts(ctx, alertsRepo, alertDeps, triggerType, tradeSymbol, tradeID, side, entry, stopLoss, takeProfit, risk)
		},
	}
}
