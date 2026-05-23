package bootstrap

import (
	backendapp "futures-copilot-mvp/internal/app"
	accountsfeature "futures-copilot-mvp/internal/features/accounts"
	aifeature "futures-copilot-mvp/internal/features/ai"
	alertsfeature "futures-copilot-mvp/internal/features/alerts"
	instrumentsfeature "futures-copilot-mvp/internal/features/instruments"
	rubricsfeature "futures-copilot-mvp/internal/features/rubrics"
	tradesfeature "futures-copilot-mvp/internal/features/trades"
	usersfeature "futures-copilot-mvp/internal/features/users"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Runtime struct {
	DB        *pgxpool.Pool
	RDB       *redis.Client
	TradeRepo tradesfeature.Repository
	AppDeps   backendapp.Dependencies
}

func New(db *pgxpool.Pool, rdb *redis.Client) Runtime {
	accountsRepo := accountsfeature.NewPostgresRepository(func() *pgxpool.Pool { return db })
	rubricsRepo := rubricsfeature.NewPostgresRepository(func() *pgxpool.Pool { return db })
	instrumentsRepo := instrumentsfeature.NewPostgresRepository(func() *pgxpool.Pool { return db })
	tradeRepo := tradesfeature.NewPostgresRepository(func() *pgxpool.Pool { return db })
	usersRepo := usersfeature.NewPostgresRepository(func() *pgxpool.Pool { return db })
	alertsRepo := alertsfeature.NewPostgresRepository(func() *pgxpool.Pool { return db })
	aiProviderConfigRepo := aifeature.NewPostgresProviderConfigRepository(func() *pgxpool.Pool { return db })

	appDeps := backendapp.Dependencies{
		AccountsRepo:         accountsRepo,
		RubricsRepo:          rubricsRepo,
		InstrumentsRepo:      instrumentsRepo,
		TradeRepo:            tradeRepo,
		UsersRepo:            usersRepo,
		AlertsRepo:           alertsRepo,
		AIProviderConfigRepo: aiProviderConfigRepo,
		DB:                   db,
		RDB:                  rdb,
	}

	return Runtime{
		DB:        db,
		RDB:       rdb,
		TradeRepo: tradeRepo,
		AppDeps:   appDeps,
	}
}
