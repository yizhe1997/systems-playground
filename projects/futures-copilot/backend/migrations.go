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
	CREATE TABLE IF NOT EXISTS ai_provider_config (
		id BOOLEAN PRIMARY KEY DEFAULT TRUE,
		scrape_rules_provider TEXT NOT NULL DEFAULT 'openrouter',
		scrape_rules_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-pro',
		cleanup_text_provider TEXT NOT NULL DEFAULT 'openrouter',
		cleanup_text_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
		timeout_ms INTEGER NOT NULL DEFAULT 15000,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		CHECK (id = TRUE)
	);`,
	`
	INSERT INTO ai_provider_config (id)
	VALUES (TRUE)
	ON CONFLICT (id) DO NOTHING;`,
	`
	CREATE TABLE IF NOT EXISTS ai_feature_configs (
		feature_key TEXT PRIMARY KEY,
		label TEXT NOT NULL,
		provider TEXT NOT NULL,
		model TEXT NOT NULL,
		timeout_ms INTEGER NOT NULL DEFAULT 15000,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`,
	`
	INSERT INTO ai_feature_configs (feature_key, label, provider, model, timeout_ms)
	VALUES
		('` + AIFeatureKeyAccountRulesContextScrapeRules + `', '` + AIFeatureLabelAccountRulesContextScrapeRules + `', COALESCE((SELECT scrape_rules_provider FROM ai_provider_config WHERE id = TRUE), 'openrouter'), COALESCE((SELECT scrape_rules_model FROM ai_provider_config WHERE id = TRUE), 'google/gemini-2.5-pro'), COALESCE((SELECT timeout_ms FROM ai_provider_config WHERE id = TRUE), 15000)),
		('` + AIFeatureKeyAccountRulesContextCleanupText + `', '` + AIFeatureLabelAccountRulesContextCleanupText + `', COALESCE((SELECT cleanup_text_provider FROM ai_provider_config WHERE id = TRUE), 'openrouter'), COALESCE((SELECT cleanup_text_model FROM ai_provider_config WHERE id = TRUE), 'google/gemini-2.5-flash'), COALESCE((SELECT timeout_ms FROM ai_provider_config WHERE id = TRUE), 15000)),
		('` + AIFeatureKeyRubricRulesImproveText + `', '` + AIFeatureLabelRubricRulesImproveText + `', COALESCE((SELECT scrape_rules_provider FROM ai_provider_config WHERE id = TRUE), 'openrouter'), COALESCE((SELECT scrape_rules_model FROM ai_provider_config WHERE id = TRUE), 'google/gemini-2.5-pro'), COALESCE((SELECT timeout_ms FROM ai_provider_config WHERE id = TRUE), 15000)),
		('` + AIFeatureKeyDraftContextNotesImproveText + `', '` + AIFeatureLabelDraftContextNotesImproveText + `', COALESCE((SELECT cleanup_text_provider FROM ai_provider_config WHERE id = TRUE), 'openrouter'), COALESCE((SELECT cleanup_text_model FROM ai_provider_config WHERE id = TRUE), 'google/gemini-2.5-flash'), COALESCE((SELECT timeout_ms FROM ai_provider_config WHERE id = TRUE), 15000))
	ON CONFLICT (feature_key) DO NOTHING;`,
	`
	CREATE TABLE IF NOT EXISTS ai_model_presets (
		provider TEXT NOT NULL,
		model TEXT NOT NULL,
		sort_order INTEGER NOT NULL DEFAULT 0,
		PRIMARY KEY (provider, model)
	);`,
	`INSERT INTO ai_model_presets (provider, model, sort_order) VALUES ('openrouter', 'openrouter/free', 1) ON CONFLICT (provider, model) DO NOTHING;`,
	`INSERT INTO ai_model_presets (provider, model, sort_order) VALUES ('openrouter', 'google/gemini-2.5-pro', 2) ON CONFLICT (provider, model) DO NOTHING;`,
	`INSERT INTO ai_model_presets (provider, model, sort_order) VALUES ('openrouter', 'google/gemini-2.5-flash', 3) ON CONFLICT (provider, model) DO NOTHING;`,
	`INSERT INTO ai_model_presets (provider, model, sort_order) VALUES ('google', 'gemini-2.5-pro', 1) ON CONFLICT (provider, model) DO NOTHING;`,
	`INSERT INTO ai_model_presets (provider, model, sort_order) VALUES ('google', 'gemini-2.5-flash', 2) ON CONFLICT (provider, model) DO NOTHING;`,
	`INSERT INTO ai_model_presets (provider, model, sort_order) VALUES ('anthropic', 'claude-3-5-sonnet-latest', 1) ON CONFLICT (provider, model) DO NOTHING;`,
	`INSERT INTO ai_model_presets (provider, model, sort_order) VALUES ('anthropic', 'claude-3-5-haiku-latest', 2) ON CONFLICT (provider, model) DO NOTHING;`,
	`
	CREATE TABLE IF NOT EXISTS accounts (
		id TEXT PRIMARY KEY,
		type TEXT NOT NULL,
		current_balance NUMERIC NOT NULL,
		current_daily_stop_level NUMERIC NOT NULL,
		current_max_loss_level NUMERIC NOT NULL,
		rules_context TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		deleted_at TIMESTAMP
	);`,
	`
	CREATE TABLE IF NOT EXISTS rubrics (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		name TEXT NOT NULL,
		rules TEXT NOT NULL,
		pinescript TEXT,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		deleted_at TIMESTAMP
	);`,
	`
	CREATE TABLE IF NOT EXISTS instruments (
		code TEXT PRIMARY KEY,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		deleted_at TIMESTAMP
	);`,
	`ALTER TABLE IF EXISTS instruments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;`,

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
		ai_setup_grade_status TEXT NOT NULL DEFAULT 'not_requested',
		ai_setup_findings TEXT,
		invalidation_reason TEXT,
		invalidated_at TIMESTAMP,
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
