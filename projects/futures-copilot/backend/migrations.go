package main

var schemaMigrations = []string{
	`CREATE EXTENSION IF NOT EXISTS vector;`,
	`
	CREATE TABLE IF NOT EXISTS users (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		provider_id TEXT UNIQUE NOT NULL,
		email TEXT UNIQUE NOT NULL,
		name TEXT,
		role TEXT DEFAULT 'ANON',
		is_disabled BOOLEAN DEFAULT FALSE,
		last_logged_in TIMESTAMP,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`,
	`
	CREATE TABLE IF NOT EXISTS subscriptions (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		user_id UUID REFERENCES users(id),
		stripe_customer_id TEXT,
		stripe_subscription_id TEXT,
		status TEXT,
		current_period_end TIMESTAMP,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`,
	`
	CREATE TABLE IF NOT EXISTS memory_records (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		source_type TEXT NOT NULL, -- 'trade_plan', 'trade_outcome', 'lesson'
		source_id TEXT NOT NULL,
		content TEXT NOT NULL,
		metadata JSONB,
		embedding vector(1536), -- OpenAI text-embedding-3-small dimension
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`,
	`
	CREATE TABLE IF NOT EXISTS accounts (
		id TEXT PRIMARY KEY,
		type TEXT NOT NULL,
		current_balance NUMERIC NOT NULL,
		current_daily_stop_level NUMERIC NOT NULL,
		current_max_loss_level NUMERIC NOT NULL,
		rules_context TEXT NOT NULL
	);`,
	`
	CREATE TABLE IF NOT EXISTS rubrics (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		name TEXT NOT NULL,
		rules TEXT NOT NULL,
		pinescript TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`,
	`
	CREATE TABLE IF NOT EXISTS trade_plans (
		id TEXT PRIMARY KEY,
		account_id TEXT REFERENCES accounts(id) ON DELETE CASCADE,
		rubric_id UUID REFERENCES rubrics(id) ON DELETE SET NULL,
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
	);`,
	`
	-- History tracking for temporal edits
	CREATE TABLE IF NOT EXISTS trade_plan_edits (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		trade_plan_id TEXT REFERENCES trade_plans(id) ON DELETE CASCADE,
		previous_entry NUMERIC,
		previous_stop_loss NUMERIC,
		previous_take_profit NUMERIC,
		edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`,
	`
	CREATE TABLE IF NOT EXISTS trade_outcomes (
		trade_id TEXT PRIMARY KEY REFERENCES trade_plans(id) ON DELETE CASCADE,
		pnl NUMERIC NOT NULL,
		outcome TEXT NOT NULL,
		reflection TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`,
}
