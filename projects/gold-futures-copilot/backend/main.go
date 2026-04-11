package main

import (
	"context"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/yizhe1997/systems-playground/projects/gold-futures-copilot/backend/pkg/config"
	"github.com/yizhe1997/systems-playground/projects/gold-futures-copilot/backend/pkg/events"
	"github.com/yizhe1997/systems-playground/projects/gold-futures-copilot/backend/pkg/http"
	"github.com/yizhe1997/systems-playground/projects/gold-futures-copilot/backend/pkg/platform/cache"
	"github.com/yizhe1997/systems-playground/projects/gold-futures-copilot/backend/pkg/platform/db"
	"github.com/yizhe1997/systems-playground/projects/gold-futures-copilot/backend/pkg/tradingcopilot"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config load failed: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	pg, err := db.ConnectAndMigrate(ctx, cfg)
	if err != nil {
		log.Fatalf("postgres init failed: %v", err)
	}
	defer pg.Close()

	rdb, err := cache.NewRedisClient(ctx, cfg)
	if err != nil {
		log.Fatalf("redis init failed: %v", err)
	}
	defer rdb.Close()

	broker := events.NewBroker(cfg)
	defer broker.Close()

	app := buildApp(cfg, pg, rdb, broker)
	log.Printf("gold futures copilot backend listening on %s", cfg.HTTPAddr)
	if err := app.Listen(cfg.HTTPAddr); err != nil {
		log.Fatalf("http server failed: %v", err)
	}
}

func buildApp(cfg config.Config, pg *pgxpool.Pool, rdb *redis.Client, broker *events.Broker) *fiber.App {
	app := fiber.New(fiber.Config{
		ErrorHandler: http.FiberErrorHandler,
	})

	app.Use(http.RequestContextMiddleware())
	app.Use(http.RequestLoggingMiddleware())
	app.Use(http.RecoveryMiddleware())

	app.Get("/healthz", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "ok",
			"deps": fiber.Map{
				"postgres": pg != nil,
				"redis":    rdb != nil,
				"redpanda": len(broker.Brokers) > 0,
			},
		})
	})

	repo := tradingcopilot.NewRepository(pg)
	svc := tradingcopilot.NewService(repo, tradingcopilot.DefaultRubricEvaluator{}, tradingcopilot.NoopRetriever{}, broker)
	alerts := tradingcopilot.NewAlertService(repo, broker)
	handler := tradingcopilot.NewHandler(svc, alerts)
	handler.RegisterRoutes(app)

	return app
}
