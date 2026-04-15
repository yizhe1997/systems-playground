package main

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// SetupCopilotRoutes registers all API endpoints
func SetupCopilotRoutes(app *fiber.App) {
	api := app.Group("/api/copilot")

	// 1. GET /api/copilot/accounts
	api.Get("/accounts", getAccounts)
	
	// 1.1 POST /api/copilot/accounts
	api.Post("/accounts", saveAccount)

	// 1.2 DELETE /api/copilot/accounts/:id
	api.Delete("/accounts/:id", deleteAccount)

	// 2. GET /api/copilot/rubric
	api.Get("/rubrics", getRubrics)
	
	// 3. POST /api/copilot/rubrics
	api.Post("/rubrics", saveRubric)

	// 4. GET /api/copilot/trades
	api.Get("/trades", getTrades)

	// 5. POST /api/copilot/draft
	api.Post("/draft", draftTrade)
	
	// 6. PUT /api/copilot/trades/:id/status
	api.Put("/trades/:id/status", updateTradeStatus)
	
	// 7. POST /api/copilot/journal
	api.Post("/journal", journalTrade)

	// 8. POST /api/copilot/ai/scrape-rules
	api.Post("/ai/scrape-rules", scrapeRules)

	// 9. POST /api/copilot/ai/improve-rules
	api.Post("/ai/improve-rules", improveRules)
	// 10. POST /api/copilot/users/sync
	api.Post("/users/sync", syncUser)

	// 11. PUT /api/copilot/users/disable
	api.Put("/users/disable", disableUser)
}

func syncUser(c *fiber.Ctx) error {
	var req struct {
		ProviderID string `json:"providerId"`
		Email      string `json:"email"`
		Name       string `json:"name"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid payload"})
	}

	var role string
	var isDisabled bool

	// Upsert user
	err := db.QueryRow(context.Background(), `
		INSERT INTO users (provider_id, email, name, last_logged_in)
		VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
		ON CONFLICT (email) DO UPDATE SET 
			name = EXCLUDED.name,
			provider_id = EXCLUDED.provider_id,
			last_logged_in = CURRENT_TIMESTAMP
		RETURNING role, is_disabled
	`, req.ProviderID, req.Email, req.Name).Scan(&role, &isDisabled)

	if err != nil {
		log.Printf("Failed to sync user: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to sync user"})
	}

	return c.JSON(fiber.Map{"status": "synced", "role": role, "isDisabled": isDisabled})
}

func disableUser(c *fiber.Ctx) error {
	var req struct {
		Email string `json:"email"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid payload"})
	}

	_, err := db.Exec(context.Background(), "UPDATE users SET is_disabled = true WHERE email = $1", req.Email)
	if err != nil {
		log.Printf("Failed to disable user: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to disable user"})
	}

	return c.JSON(fiber.Map{"status": "disabled"})
}

func scrapeRules(c *fiber.Ctx) error {
	var req struct {
		URLs []string `json:"urls"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid payload"})
	}

	// MOCK AI SCRAPE
	time.Sleep(2 * time.Second)
	
	mockScraped := `// EXTRACTED VIA AI FROM BROKER DOCS //
Trailing EOD Max Drawdown: $2500.
Daily Loss Limit: $1500.
Consistency Rule: No single day over 50% of total profit.
Scaling Plan: 2 contracts per $1500 profit.
News Rule: No trading 1m before or after high impact tier 1 news.`

	return c.JSON(fiber.Map{"context": mockScraped})
}

func improveRules(c *fiber.Ctx) error {
	var req struct {
		Text string `json:"text"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid payload"})
	}

	// MOCK AI IMPROVEMENT
	time.Sleep(1500 * time.Millisecond)

	mockImproved := `[ AI CLEANED CONTEXT ]
` + req.Text + `

- Extracted Core constraint: Do not hold over weekends.
- Enforced Behavioral rule: Pause trading if Daily Loss Limit is hit.`

	return c.JSON(fiber.Map{"context": mockImproved})
}

func getAccounts(c *fiber.Ctx) error {
	rows, err := db.Query(context.Background(), "SELECT id, type, current_balance, current_daily_stop_level, current_max_loss_level, rules_context FROM accounts")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch accounts"})
	}
	defer rows.Close()

	var accounts []AccountConfig
	for rows.Next() {
		var a AccountConfig
		err := rows.Scan(&a.ID, &a.Type, &a.CurrentBalance, &a.CurrentDailyStopLevel, &a.CurrentMaxLossLevel, &a.RulesContext)
		if err == nil {
			accounts = append(accounts, a)
		}
	}

	// No fallback, return exactly what is in the DB
	if accounts == nil {
		accounts = []AccountConfig{}
	}
	return c.JSON(accounts)
}

func saveAccount(c *fiber.Ctx) error {
	var a AccountConfig
	if err := c.BodyParser(&a); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid payload"})
	}

	if a.ID == "" {
		a.ID = "a-" + uuid.New().String()[:8]
	}

	_, err := db.Exec(context.Background(), `
		INSERT INTO accounts (id, type, current_balance, current_daily_stop_level, current_max_loss_level, rules_context)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO UPDATE SET 
			type = EXCLUDED.type,
			current_balance = EXCLUDED.current_balance,
			current_daily_stop_level = EXCLUDED.current_daily_stop_level,
			current_max_loss_level = EXCLUDED.current_max_loss_level,
			rules_context = EXCLUDED.rules_context
	`, a.ID, a.Type, a.CurrentBalance, a.CurrentDailyStopLevel, a.CurrentMaxLossLevel, a.RulesContext)

	if err != nil {
		log.Printf("Failed to save account: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save account"})
	}

	return c.JSON(fiber.Map{"status": "saved", "id": a.ID})
}

func deleteAccount(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return c.Status(400).JSON(fiber.Map{"error": "Missing account ID"})
	}

	ctx := context.Background()

	// 1. Delete associated trade outcomes (referencing trade_plans)
	db.Exec(ctx, "DELETE FROM trade_outcomes WHERE trade_id IN (SELECT id FROM trade_plans WHERE account_id = $1)", id)
	
	// 2. Delete associated trade plan edits (referencing trade_plans)
	db.Exec(ctx, "DELETE FROM trade_plan_edits WHERE trade_plan_id IN (SELECT id FROM trade_plans WHERE account_id = $1)", id)

	// 3. Delete associated trade plans
	db.Exec(ctx, "DELETE FROM trade_plans WHERE account_id = $1", id)

	// 4. Delete the account
	_, err := db.Exec(ctx, "DELETE FROM accounts WHERE id = $1", id)
	if err != nil {
		log.Printf("Failed to delete account: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to delete account"})
	}

	return c.JSON(fiber.Map{"status": "deleted", "id": id})
}

func getRubrics(c *fiber.Ctx) error {
	rows, err := db.Query(context.Background(), "SELECT id, name, rules, pinescript FROM rubrics ORDER BY created_at DESC")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch rubrics"})
	}
	defer rows.Close()

	var rubrics []Rubric
	for rows.Next() {
		var r Rubric
		err := rows.Scan(&r.ID, &r.Name, &r.Rules, &r.PineScript)
		if err == nil {
			rubrics = append(rubrics, r)
		}
	}

	if len(rubrics) == 0 {
		// Mock fallback
		return c.JSON([]Rubric{{
			ID: "r-default",
			Name: "Default Gold Strategy",
			Rules: "1. Only trade 15m Supply/Demand zones.\n2. Must have 1:2 R:R minimum.\n3. Do not risk more than 1.5% of daily loss limit.\n4. Avoid taking new setups during 10:00 AM news.",
			PineScript: "",
		}})
	}

	return c.JSON(rubrics)
}

func saveRubric(c *fiber.Ctx) error {
	var req Rubric
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid rubric payload"})
	}
	
	if req.ID == "" {
		req.ID = uuid.New().String()
	}

	_, err := db.Exec(context.Background(), `
		INSERT INTO rubrics (id, name, rules, pinescript)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (id) DO UPDATE SET 
			name = EXCLUDED.name,
			rules = EXCLUDED.rules,
			pinescript = EXCLUDED.pinescript
	`, req.ID, req.Name, req.Rules, req.PineScript)

	if err != nil {
		log.Printf("Failed to save rubric: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save rubric to Postgres"})
	}
	
	return c.JSON(fiber.Map{"status": "saved", "id": req.ID})
}

func getTrades(c *fiber.Ctx) error {
	query := `
		SELECT t.id, t.account_id, t.rubric_id, t.instrument, t.bias, t.entry, t.stop_loss, t.take_profit, t.contracts, t.risk_amount, t.status, t.notes, o.pnl, o.outcome 
		FROM trade_plans t 
		LEFT JOIN trade_outcomes o ON o.trade_id = t.id 
		ORDER BY t.created_at DESC
	`
	rows, err := db.Query(context.Background(), query)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch trades"})
	}
	defer rows.Close()

	var trades []TradePlan
	for rows.Next() {
		var t TradePlan
		var riskAmount float64
		err := rows.Scan(&t.ID, &t.AccountID, &t.RubricID, &t.Instrument, &t.Bias, &t.Entry, &t.StopLoss, &t.TakeProfit, &t.Contracts, &riskAmount, &t.Status, &t.Notes, &t.PnL, &t.Outcome)
		if err == nil {
			trades = append(trades, t)
		}
	}

	return c.JSON(trades)
}

func draftTrade(c *fiber.Ctx) error {
	var plan TradePlan
	if err := c.BodyParser(&plan); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid trade payload"})
	}

	// Assign ID if new
	if plan.ID == "" {
		plan.ID = "t-" + uuid.New().String()[:8]
	}
	plan.Status = "draft"

	// 1. Deterministic Math
	riskAmount := computeRiskMath(plan)
	
	// 2. MOCK AI GRADING
	// In the future, this is where we send prompt + math to OpenAI
	time.Sleep(1 * time.Second) // Simulate AI thinking
	
	aiStatus := "approved"
	aiFeedback := "Looks good. 15m order block aligns perfectly with London sweep."
	
	// Example of deterministic rejection: Risk is too high (mocking > $800)
	if riskAmount > 800 {
		aiStatus = "warning"
		aiFeedback = fmt.Sprintf("Risk ($%.2f) is dangerously close to your daily loss limit. Reduce size.", riskAmount)
	}

	// 3. Save to Postgres
	_, err := db.Exec(context.Background(), `
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
	`, plan.ID, plan.AccountID, plan.RubricID, plan.Instrument, plan.Bias, plan.Entry, plan.StopLoss, plan.TakeProfit, plan.Contracts, riskAmount, plan.Status, plan.Notes)

	// Temporal log of edits
	if plan.Status != "draft" {
		db.Exec(context.Background(), `
			INSERT INTO trade_plan_edits (trade_plan_id, previous_entry, previous_stop_loss, previous_take_profit)
			VALUES ($1, $2, $3, $4)
		`, plan.ID, plan.Entry, plan.StopLoss, plan.TakeProfit)
	}

	if err != nil {
		log.Printf("Failed to save trade: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save trade"})
	}

	return c.JSON(fiber.Map{
		"trade": plan,
		"aiResponse": AIResponse{
			Decision: aiStatus,
			RiskAmount: riskAmount,
			Feedback: aiFeedback,
		},
	})
}

func updateTradeStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	
	var req struct {
		Status string `json:"status"` // 'working' or 'filled'
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid payload"})
	}

	// Update status in Postgres
	_, err := db.Exec(context.Background(), "UPDATE trade_plans SET status = $1 WHERE id = $2", req.Status, id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update status"})
	}

	return c.JSON(fiber.Map{"id": id, "status": req.Status})
}

func journalTrade(c *fiber.Ctx) error {
	var req struct {
		TradeID string `json:"tradeId"`
		PnL     float64 `json:"pnl"`
		Outcome string `json:"outcome"`
		Reflection string `json:"reflection"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Invalid payload"})
	}

	// Mark closed in Postgres
	_, err := db.Exec(context.Background(), "UPDATE trade_plans SET status = 'closed' WHERE id = $1", req.TradeID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to update trade status"})
	}
	
	// Save Outcome to Postgres
	_, err = db.Exec(context.Background(), `
		CREATE TABLE IF NOT EXISTS trade_outcomes (
			trade_id TEXT PRIMARY KEY,
			pnl NUMERIC NOT NULL,
			outcome TEXT NOT NULL,
			reflection TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
		INSERT INTO trade_outcomes (trade_id, pnl, outcome, reflection) VALUES ($1, $2, $3, $4)
	`, req.TradeID, req.PnL, req.Outcome, req.Reflection)

	if err != nil {
		log.Printf("Failed to save outcome: %v", err)
	}

	// MOCK AI RETROSPECTIVE
	time.Sleep(1 * time.Second)
	aiRetro := "Journal logged. Good discipline holding to target despite the early chop."
	if req.Outcome == "LOSS" {
		aiRetro = "Loss logged. Upon review, you took this 15 mins before CPI. Rule #4 violated."
	}

	return c.JSON(fiber.Map{
		"status": "closed",
		"aiRetrospective": aiRetro,
	})
}
