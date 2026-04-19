package main

const (
	selectAccountsQuery = "SELECT id, type, current_balance, current_daily_stop_level, current_max_loss_level, rules_context FROM accounts"

	selectAIProviderConfigQuery = `
		SELECT scrape_rules_provider, scrape_rules_model, cleanup_text_provider, cleanup_text_model, timeout_ms, updated_at
		FROM ai_provider_config
		WHERE id = TRUE
	`

	upsertAIProviderConfigQuery = `
		INSERT INTO ai_provider_config (id, scrape_rules_provider, scrape_rules_model, cleanup_text_provider, cleanup_text_model, timeout_ms, updated_at)
		VALUES (TRUE, $1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
		ON CONFLICT (id) DO UPDATE SET
			scrape_rules_provider = EXCLUDED.scrape_rules_provider,
			scrape_rules_model = EXCLUDED.scrape_rules_model,
			cleanup_text_provider = EXCLUDED.cleanup_text_provider,
			cleanup_text_model = EXCLUDED.cleanup_text_model,
			timeout_ms = EXCLUDED.timeout_ms,
			updated_at = CURRENT_TIMESTAMP
	`

	upsertAccountQuery = `
		INSERT INTO accounts (id, type, current_balance, current_daily_stop_level, current_max_loss_level, rules_context)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO UPDATE SET 
			type = EXCLUDED.type,
			current_balance = EXCLUDED.current_balance,
			current_daily_stop_level = EXCLUDED.current_daily_stop_level,
			current_max_loss_level = EXCLUDED.current_max_loss_level,
			rules_context = EXCLUDED.rules_context
	`

	deleteTradeOutcomesByAccountQuery  = "DELETE FROM trade_outcomes WHERE trade_id IN (SELECT id FROM trade_plans WHERE account_id = $1)"
	deleteTradePlanEditsByAccountQuery = "DELETE FROM trade_plan_edits WHERE trade_plan_id IN (SELECT id FROM trade_plans WHERE account_id = $1)"
	deleteTradePlansByAccountQuery     = "DELETE FROM trade_plans WHERE account_id = $1"
	deleteAccountQuery                 = "DELETE FROM accounts WHERE id = $1"

	selectRubricsQuery = "SELECT id, name, rules FROM rubrics ORDER BY created_at DESC"

	upsertRubricQuery = `
		INSERT INTO rubrics (id, name, rules)
		VALUES ($1, $2, $3)
		ON CONFLICT (id) DO UPDATE SET 
			name = EXCLUDED.name,
			rules = EXCLUDED.rules
	`

	deleteRubricQuery = "DELETE FROM rubrics WHERE id = $1"

	syncUserQuery = `
		INSERT INTO users (provider_id, email, name, last_logged_in)
		VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
		ON CONFLICT (email) DO UPDATE SET 
			name = EXCLUDED.name,
			provider_id = EXCLUDED.provider_id,
			last_logged_in = CURRENT_TIMESTAMP
		RETURNING role, is_disabled
	`

	disableUserQuery = "UPDATE users SET is_disabled = true WHERE email = $1"

	selectTradesQuery = `
		SELECT t.id, t.account_id, t.rubric_id, t.instrument, t.bias, t.entry, t.stop_loss, t.take_profit, t.contracts, t.risk_amount, t.status, t.notes, t.created_at, o.pnl, o.outcome 
		FROM trade_plans t 
		LEFT JOIN trade_outcomes o ON o.trade_id = t.id 
		ORDER BY t.created_at DESC
	`

	upsertTradePlanQuery = `
		INSERT INTO trade_plans (id, account_id, rubric_id, instrument, bias, entry, stop_loss, take_profit, contracts, risk_amount, status, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		ON CONFLICT (id) DO UPDATE SET 
			instrument = EXCLUDED.instrument,
			bias = EXCLUDED.bias,
			entry = EXCLUDED.entry,
			stop_loss = EXCLUDED.stop_loss,
			take_profit = EXCLUDED.take_profit,
			contracts = EXCLUDED.contracts,
			risk_amount = EXCLUDED.risk_amount,
			notes = EXCLUDED.notes,
			updated_at = CURRENT_TIMESTAMP
	`

	updateTradeStatusQuery = "UPDATE trade_plans SET status = $1 WHERE id = $2"
	closeTradeQuery        = "UPDATE trade_plans SET status = 'closed' WHERE id = $1"

	insertTradeOutcomeQuery = `
		INSERT INTO trade_outcomes (trade_id, pnl, outcome, reflection) VALUES ($1, $2, $3, $4)
	`
)
