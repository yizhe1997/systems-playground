package main

import (
	backendapp "futures-copilot-mvp/internal/app"
	bootstrap "futures-copilot-mvp/internal/bootstrap"
	alertsfeature "futures-copilot-mvp/internal/features/alerts"
	tradesfeature "futures-copilot-mvp/internal/features/trades"
	dbplatform "futures-copilot-mvp/internal/platform/db"
	redisclient "futures-copilot-mvp/internal/platform/redis"
	sqlschema "futures-copilot-mvp/internal/platform/sqlschema"
	"log"
	"os"
)

func main() {
	rdb := redisclient.InitRedis()
	db := dbplatform.InitPostgres(sqlschema.SchemaMigrations) // Fire up pgvector
	runtime := bootstrap.New(db, rdb)

	tradesfeature.StartAISetupGradeWorker(runtime.RDB, runtime.TradeRepo)
	alertsfeature.StartWorker(runtime.RDB)

	app := backendapp.New(runtime.AppDeps)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8088"
	}

	log.Printf("Starting MVP backend on :%s", port)
	log.Fatal(app.Listen(":" + port))
}
