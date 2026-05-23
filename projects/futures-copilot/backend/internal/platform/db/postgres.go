package db

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

func InitPostgres(migrations []string) *pgxpool.Pool {
	dbURL := os.Getenv("POSTGRES_URL")
	if dbURL == "" {
		dbURL = "postgres://postgres:postgres@localhost:5435/futures_copilot?sslmode=disable"
	}

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to Postgres: %v\n", err)
	}

	err = pool.Ping(context.Background())
	if err != nil {
		log.Printf("⚠️ Postgres not connected: %v", err)
		return pool
	}

	log.Println("✅ Connected to Postgres (pgvector ready)")
	MigrateSchema(pool, migrations)
	return pool
}

func MigrateSchema(pool *pgxpool.Pool, migrations []string) {
	for i, q := range migrations {
		_, err := pool.Exec(context.Background(), q)
		if err != nil {
			log.Printf("⚠️ Schema migration failed at step %d: %v", i+1, err)
			return
		}
	}
	log.Println("✅ Postgres schema migrated")
}
