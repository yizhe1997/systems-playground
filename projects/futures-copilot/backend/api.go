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
}

func getAccounts(c *fiber.Ctx) error {
	rows, err := db.Query(context.Background(), "SELECT id, type, balance, daily_loss_limit, default_risk, current_daily_pnl FROM accounts")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch accounts"})
	}
	defer rows.Close()

	var accounts []AccountConfig
	for rows.Next() {
		var a AccountConfig
		err := rows.Scan(&a.ID, &a.Type, &a.Balance, &a.DailyLossLimit, &a.DefaultRisk, &a.CurrentDailyPnL)
		if err == nil {
			accounts = append(accounts, a)
		}
	}

	// Fallback mock if empty
	if len(accounts) == 0 {
		accounts = []AccountConfig{
			{
				ID: "a-001",
				Type: "TOPSTEP EVAL 50K",
				Balance: 51200,
				DailyLossLimit: 1000,
				DefaultRisk: "1%",
				CurrentDailyPnL: 200,
			},
		}
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
		INSERT INTO accounts (id, type, balance, daily_loss_limit, default_risk, current_daily_pnl)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO UPDATE SET 
			type = EXCLUDED.type,
			balance = EXCLUDED.balance,
			daily_loss_limit = EXCLUDED.daily_loss_limit,
			default_risk = EXCLUDED.default_risk,
			current_daily_pnl = EXCLUDED.current_daily_pnl
	`, a.ID, a.Type, a.Balance, a.DailyLossLimit, a.DefaultRisk, a.CurrentDailyPnL)

	if err != nil {
		log.Printf("Failed to save account: %v", err)
		return c.Status(500).JSON(fiber.Map{"error": "Failed to save account"})
	}

	return c.JSON(fiber.Map{"status": "saved", "id": a.ID})
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
	rows, err := db.Query(context.Background(), "SELECT id, account_id, rubric_id, instrument, bias, entry, stop_loss, take_profit, contracts, risk_amount, status, notes FROM trade_plans ORDER BY created_at DESC")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch trades"})
	}
	defer rows.Close()

	var trades []TradePlan
	for rows.Next() {
		var t TradePlan
		var riskAmount float64
		err := rows.Scan(&t.ID, &t.AccountID, &t.RubricID, &t.Instrument, &t.Bias, &t.Entry, &t.StopLoss, &t.TakeProfit, &t.Contracts, &riskAmount, &t.Status, &t.Notes)
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
