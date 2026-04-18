package main

import (
	"context"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func getTrades(c *fiber.Ctx) error {
	trades, err := listTrades(context.Background())
	if err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to fetch trades", err)
	}

	return c.JSON(trades)
}

func draftTrade(c *fiber.Ctx) error {
	var plan TradePlan
	if err := parseRequestBody(c, &plan, "Invalid trade payload"); err != nil {
		return err
	}
	if validationMessage := validateDraftTrade(plan); validationMessage != "" {
		return jsonError(c, fiber.StatusBadRequest, validationMessage)
	}

	if plan.ID == "" {
		plan.ID = "t-" + uuid.New().String()[:8]
	}
	plan.Status = "draft"

	riskAmount := computeRiskMath(plan)

	// MOCK AI GRADING
	time.Sleep(1 * time.Second)

	aiResponse := buildDraftAIResponse(riskAmount)

	if err := saveDraftTrade(context.Background(), plan, riskAmount); err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to save trade", err)
	}

	return c.JSON(fiber.Map{
		"trade":      plan,
		"aiResponse": aiResponse,
	})
}

func updateTradeStatus(c *fiber.Ctx) error {
	id := c.Params("id")

	var req updateTradeStatusRequest
	if err := parseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}
	if validationMessage := validateTradeStatusUpdate(req); validationMessage != "" {
		return jsonError(c, fiber.StatusBadRequest, validationMessage)
	}

	if err := setTradeStatus(context.Background(), id, req.Status); err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to update status", err)
	}

	return c.JSON(fiber.Map{"id": id, "status": req.Status})
}

func journalTrade(c *fiber.Ctx) error {
	var req journalTradeRequest
	if err := parseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}
	if validationMessage := validateJournalTrade(req); validationMessage != "" {
		return jsonError(c, fiber.StatusBadRequest, validationMessage)
	}

	if err := closeTrade(context.Background(), req.TradeID); err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to update trade status", err)
	}

	if err := saveTradeOutcome(context.Background(), req); err != nil {
		log.Printf("Failed to save outcome: %v", err)
	}

	time.Sleep(1 * time.Second)
	aiRetro := buildJournalRetrospective(req.Outcome)

	return c.JSON(fiber.Map{
		"status":          "closed",
		"aiRetrospective": aiRetro,
	})
}
