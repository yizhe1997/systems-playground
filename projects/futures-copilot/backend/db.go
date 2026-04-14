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
	schema := `
	CREATE EXTENSION IF NOT EXISTS vector;
	
	CREATE TABLE IF NOT EXISTS memory_records (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		source_type TEXT NOT NULL, -- 'trade_plan', 'trade_outcome', 'lesson'
		source_id TEXT NOT NULL,
		content TEXT NOT NULL,
		metadata JSONB,
		embedding vector(1536), -- OpenAI text-embedding-3-small dimension
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS accounts (
		id TEXT PRIMARY KEY,
		type TEXT NOT NULL,
		balance NUMERIC NOT NULL,
		daily_loss_limit NUMERIC NOT NULL,
		default_risk TEXT NOT NULL,
		current_daily_pnl NUMERIC NOT NULL
	);

	CREATE TABLE IF NOT EXISTS rubrics (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		name TEXT NOT NULL,
		rules TEXT NOT NULL,
		pinescript TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	CREATE TABLE IF NOT EXISTS trade_plans (
		id TEXT PRIMARY KEY,
		account_id TEXT REFERENCES accounts(id),
		rubric_id UUID REFERENCES rubrics(id),
		instrument TEXT NOT NULL,
		bias TEXT NOT NULL,
		entry NUMERIC NOT NULL,
		stop_loss NUMERIC NOT NULL,
		take_profit NUMERIC NOT NULL,
		contracts INTEGER NOT NULL,
		risk_amount NUMERIC NOT NULL,
		status TEXT NOT NULL,
		notes TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);

	-- History tracking for temporal edits
	CREATE TABLE IF NOT EXISTS trade_plan_edits (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		trade_plan_id TEXT REFERENCES trade_plans(id),
		previous_entry NUMERIC,
		previous_stop_loss NUMERIC,
		previous_take_profit NUMERIC,
		edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);
	`
	
	_, err := db.Exec(context.Background(), schema)
	if err != nil {
		log.Printf("⚠️ Schema migration failed: %v", err)
	} else {
		log.Println("✅ Postgres schema migrated")
	}

	// Insert mock accounts if none exist so foreign keys work
	db.Exec(context.Background(), `
		INSERT INTO accounts (id, type, balance, daily_loss_limit, default_risk, current_daily_pnl)
		VALUES 
		('a-001', 'TOPSTEP EVAL 50K (ACTIVE)', 51200, 1000, '1%', 200),
		('a-002', 'TOPSTEP FUNDED 150K (BLOWN)', 148500, 3000, '1%', -3100)
		ON CONFLICT DO NOTHING;
	`)
}
