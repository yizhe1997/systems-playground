package main

const (
	selectAccountsQuery = "SELECT id, type, current_balance, current_daily_stop_level, current_max_loss_level, rules_context, COALESCE(created_at, CURRENT_TIMESTAMP) FROM accounts WHERE deleted_at IS NULL ORDER BY created_at ASC"

	selectAIProviderConfigQuery = `
		SELECT timeout_ms, updated_at
		FROM ai_provider_config
		WHERE id = TRUE
	`

	upsertAIProviderConfigQuery = `
		INSERT INTO ai_provider_config (id, timeout_ms, updated_at)
		VALUES (TRUE, $1, CURRENT_TIMESTAMP)
		ON CONFLICT (id) DO UPDATE SET
			timeout_ms = EXCLUDED.timeout_ms,
			updated_at = CURRENT_TIMESTAMP
	`

	selectAIFeatureConfigsQuery = `
		SELECT feature_key, label, provider, model, timeout_ms
		FROM ai_feature_configs
		ORDER BY feature_key ASC
	`

	upsertAIFeatureConfigQuery = `
		INSERT INTO ai_feature_configs (feature_key, label, provider, model, timeout_ms, updated_at)
		VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
		ON CONFLICT (feature_key) DO UPDATE SET
			label = EXCLUDED.label,
			provider = EXCLUDED.provider,
			model = EXCLUDED.model,
			timeout_ms = EXCLUDED.timeout_ms,
			updated_at = CURRENT_TIMESTAMP
	`

	deleteAIFeatureConfigsNotInQuery = `
		DELETE FROM ai_feature_configs
		WHERE feature_key <> ALL($1::text[])
	`

	selectAIModelPresetsQuery = `
		SELECT provider, model
		FROM ai_model_presets
		ORDER BY provider ASC, sort_order ASC, model ASC
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
	softDeleteAccountQuery             = "UPDATE accounts SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL"

	selectRubricsQuery = "SELECT id, name, rules FROM rubrics WHERE deleted_at IS NULL ORDER BY created_at DESC"

	upsertRubricQuery = `
		INSERT INTO rubrics (id, name, rules)
		VALUES ($1, $2, $3)
		ON CONFLICT (id) DO UPDATE SET 
			name = EXCLUDED.name,
			rules = EXCLUDED.rules,
			deleted_at = NULL
	`

	softDeleteRubricQuery = "UPDATE rubrics SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL"

	selectInstrumentsQuery = `
		SELECT code, COALESCE(created_at, CURRENT_TIMESTAMP)
		FROM instruments
		WHERE deleted_at IS NULL
		ORDER BY code ASC
	`

	upsertInstrumentQuery = `
		INSERT INTO instruments (code)
		VALUES ($1)
		ON CONFLICT (code) DO UPDATE SET
			deleted_at = NULL
	`

	softDeleteInstrumentQuery = "UPDATE instruments SET deleted_at = CURRENT_TIMESTAMP WHERE code = $1 AND deleted_at IS NULL"

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
		SELECT t.id, t.account_id, t.rubric_id, t.instrument, t.bias, t.entry, t.stop_loss, t.take_profit, t.contracts, t.risk_amount, t.status, t.notes, t.ai_setup_grade_status, t.ai_setup_findings, t.invalidation_reason, t.invalidated_at, t.created_at, o.pnl, o.outcome 
		FROM trade_plans t 
		LEFT JOIN trade_outcomes o ON o.trade_id = t.id 
		ORDER BY t.created_at DESC
	`

	upsertTradePlanQuery = `
		INSERT INTO trade_plans (id, account_id, rubric_id, instrument, bias, entry, stop_loss, take_profit, contracts, risk_amount, status, notes, ai_setup_grade_status, ai_setup_findings)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		ON CONFLICT (id) DO UPDATE SET 
			instrument = EXCLUDED.instrument,
			bias = EXCLUDED.bias,
			entry = EXCLUDED.entry,
			stop_loss = EXCLUDED.stop_loss,
			take_profit = EXCLUDED.take_profit,
			contracts = EXCLUDED.contracts,
			risk_amount = EXCLUDED.risk_amount,
			notes = EXCLUDED.notes,
			ai_setup_grade_status = EXCLUDED.ai_setup_grade_status,
			ai_setup_findings = EXCLUDED.ai_setup_findings,
			updated_at = CURRENT_TIMESTAMP
	`

	updateTradeStatusQuery = "UPDATE trade_plans SET status = $1 WHERE id = $2"
	closeTradeQuery        = "UPDATE trade_plans SET status = 'closed' WHERE id = $1"
	invalidateTradeQuery   = "UPDATE trade_plans SET status = 'invalidated', invalidation_reason = $1, invalidated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND status IN ('draft', 'working', 'filled')"

	updateTradeAISetupGradeStatusQuery = "UPDATE trade_plans SET ai_setup_grade_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2"
	updateTradeAISetupGradeResultQuery = "UPDATE trade_plans SET ai_setup_grade_status = $1, ai_setup_findings = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3"
	selectTradeByIDQuery               = "SELECT id, account_id, rubric_id, instrument, bias, entry, stop_loss, take_profit, contracts, status, notes, ai_setup_grade_status, ai_setup_findings, invalidation_reason, invalidated_at, created_at FROM trade_plans WHERE id = $1"

	insertTradeOutcomeQuery = `
		INSERT INTO trade_outcomes (trade_id, pnl, outcome, reflection) VALUES ($1, $2, $3, $4)
	`

	selectTradeStatsQuery = `
		SELECT 
			COUNT(*) as total_trades,
			COUNT(CASE WHEN o.pnl > 0 THEN 1 END) as winning_trades,
			COUNT(CASE WHEN o.pnl < 0 THEN 1 END) as losing_trades,
			COALESCE(SUM(CASE WHEN o.pnl > 0 THEN o.pnl ELSE 0 END), 0) as total_wins,
			COALESCE(ABS(SUM(CASE WHEN o.pnl < 0 THEN o.pnl ELSE 0 END)), 0) as total_losses
		FROM trade_plans t
		LEFT JOIN trade_outcomes o ON o.trade_id = t.id
		WHERE (t.status = 'closed' OR t.status = 'filled') AND t.instrument = $1
	`

	selectAllTradeStatsQuery = `
		SELECT 
			COUNT(*) as total_trades,
			COUNT(CASE WHEN o.pnl > 0 THEN 1 END) as winning_trades,
			COUNT(CASE WHEN o.pnl < 0 THEN 1 END) as losing_trades,
			COALESCE(SUM(CASE WHEN o.pnl > 0 THEN o.pnl ELSE 0 END), 0) as total_wins,
			COALESCE(ABS(SUM(CASE WHEN o.pnl < 0 THEN o.pnl ELSE 0 END)), 0) as total_losses
		FROM trade_plans t
		LEFT JOIN trade_outcomes o ON o.trade_id = t.id
		WHERE t.status = 'closed' OR t.status = 'filled'
	`

	selectInstrumentsFromTradesQuery = `
		SELECT DISTINCT instrument
		FROM trade_plans
		WHERE (status = 'closed' OR status = 'filled')
		ORDER BY instrument ASC
	`
)
