package main

var schemaMigrations = []string{
	`CREATE EXTENSION IF NOT EXISTS vector;`,
	`
	CREATE TABLE IF NOT EXISTS users (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		provider_id TEXT UNIQUE NOT NULL,
		email TEXT UNIQUE NOT NULL,
		name TEXT,
		role TEXT DEFAULT 'ANON' CHECK (role IN ('ANON', 'ADMIN')),
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
	CREATE TABLE IF NOT EXISTS ai_provider_config (
		config_key TEXT PRIMARY KEY DEFAULT 'default',
		scrape_rules_provider TEXT NOT NULL DEFAULT 'openrouter',
		scrape_rules_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-pro',
		cleanup_text_provider TEXT NOT NULL DEFAULT 'openrouter',
		cleanup_text_model TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash',
		timeout_ms INTEGER NOT NULL DEFAULT 15000,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		CHECK (config_key = 'default')
	);`,
	`
	INSERT INTO ai_provider_config (config_key)
	VALUES ('default')
	ON CONFLICT (config_key) DO NOTHING;`,
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
		('` + AIFeatureKeyAccountRulesContextScrapeRules + `', '` + AIFeatureLabelAccountRulesContextScrapeRules + `', COALESCE((SELECT scrape_rules_provider FROM ai_provider_config WHERE config_key = 'default'), 'openrouter'), COALESCE((SELECT scrape_rules_model FROM ai_provider_config WHERE config_key = 'default'), 'google/gemini-2.5-pro'), COALESCE((SELECT timeout_ms FROM ai_provider_config WHERE config_key = 'default'), 15000)),
		('` + AIFeatureKeyAccountRulesContextCleanupText + `', '` + AIFeatureLabelAccountRulesContextCleanupText + `', COALESCE((SELECT cleanup_text_provider FROM ai_provider_config WHERE config_key = 'default'), 'openrouter'), COALESCE((SELECT cleanup_text_model FROM ai_provider_config WHERE config_key = 'default'), 'google/gemini-2.5-flash'), COALESCE((SELECT timeout_ms FROM ai_provider_config WHERE config_key = 'default'), 15000)),
		('` + AIFeatureKeyRubricRulesImproveText + `', '` + AIFeatureLabelRubricRulesImproveText + `', COALESCE((SELECT scrape_rules_provider FROM ai_provider_config WHERE config_key = 'default'), 'openrouter'), COALESCE((SELECT scrape_rules_model FROM ai_provider_config WHERE config_key = 'default'), 'google/gemini-2.5-pro'), COALESCE((SELECT timeout_ms FROM ai_provider_config WHERE config_key = 'default'), 15000)),
		('` + AIFeatureKeyDraftContextNotesImproveText + `', '` + AIFeatureLabelDraftContextNotesImproveText + `', COALESCE((SELECT cleanup_text_provider FROM ai_provider_config WHERE config_key = 'default'), 'openrouter'), COALESCE((SELECT cleanup_text_model FROM ai_provider_config WHERE config_key = 'default'), 'google/gemini-2.5-flash'), COALESCE((SELECT timeout_ms FROM ai_provider_config WHERE config_key = 'default'), 15000))
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
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
		point_value NUMERIC NOT NULL DEFAULT 10.0,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		deleted_at TIMESTAMP
	);`,

	`
	CREATE TABLE IF NOT EXISTS trade_plans (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
		rubric_id UUID REFERENCES rubrics(id) ON DELETE SET NULL,
		instrument TEXT NOT NULL REFERENCES instruments(code),
		bias TEXT NOT NULL CHECK (bias IN ('Long', 'Short')),
		entry NUMERIC NOT NULL,
		stop_loss NUMERIC NOT NULL,
		take_profit NUMERIC NOT NULL,
		contracts INTEGER NOT NULL,
		risk_amount NUMERIC NOT NULL,
		status TEXT NOT NULL CHECK (status IN ('draft', 'working', 'filled', 'closed', 'invalidated')),
		notes TEXT,
		ai_setup_grade_status TEXT NOT NULL DEFAULT 'not_requested' CHECK (ai_setup_grade_status IN ('not_requested', 'queued', 'grading', 'ready', 'failed')),
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
		trade_plan_id UUID REFERENCES trade_plans(id) ON DELETE CASCADE,
		previous_entry NUMERIC,
		previous_stop_loss NUMERIC,
		previous_take_profit NUMERIC,
		edited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`,
	`
	CREATE TABLE IF NOT EXISTS trade_outcomes (
		trade_id UUID PRIMARY KEY REFERENCES trade_plans(id) ON DELETE CASCADE,
		pnl NUMERIC NOT NULL,
		outcome TEXT NOT NULL CHECK (outcome IN ('WIN', 'LOSS', 'BREAKEVEN')),
		reflection TEXT NOT NULL,
		created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
	);`,
	`
	CREATE TABLE IF NOT EXISTS user_alert_channels (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
		user_email TEXT NOT NULL,
		channel TEXT NOT NULL CHECK (channel IN ('telegram', 'discord', 'webhook')),
		destination TEXT NOT NULL DEFAULT '',
		enabled BOOLEAN NOT NULL DEFAULT TRUE,
		notify_new_draft BOOLEAN NOT NULL DEFAULT TRUE,
		notify_limit_filled BOOLEAN NOT NULL DEFAULT TRUE,
		notify_closed BOOLEAN NOT NULL DEFAULT TRUE,
		notify_invalidated BOOLEAN NOT NULL DEFAULT TRUE,
		updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
		UNIQUE(user_email, channel)
	);`,
}
