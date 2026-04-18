package main

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

var db *pgxpool.Pool

func InitPostgres() {
	dbUrl := os.Getenv("POSTGRES_URL")
	if dbUrl == "" {
		dbUrl = "postgres://postgres:postgres@localhost:5435/futures_copilot?sslmode=disable"
	}

	var err error
	db, err = pgxpool.New(context.Background(), dbUrl)
	if err != nil {
		log.Fatalf("Unable to connect to Postgres: %v\n", err)
	}

	err = db.Ping(context.Background())
	if err != nil {
		log.Printf("⚠️ Postgres not connected: %v", err)
	} else {
		log.Println("✅ Connected to Postgres (pgvector ready)")

		// Auto-migrate schema on boot
		migrateSchema()
	}
}

func migrateSchema() {
	for i, q := range schemaMigrations {
		_, err := db.Exec(context.Background(), q)
		if err != nil {
			log.Printf("⚠️ Schema migration failed at step %d: %v", i+1, err)
			return
		}
	}
	log.Println("✅ Postgres schema migrated")
}
