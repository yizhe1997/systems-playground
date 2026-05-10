package main

import (
	"context"
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func getTrades(c *fiber.Ctx) error {
	pageQuery := c.Query("page")
	pageSizeQuery := c.Query("pageSize")

	if pageQuery != "" || pageSizeQuery != "" {
		page := 1
		pageSize := 6

		if pageQuery != "" {
			parsedPage, err := strconv.Atoi(pageQuery)
			if err != nil || parsedPage <= 0 {
				return jsonError(c, fiber.StatusBadRequest, "Invalid page")
			}
			page = parsedPage
		}

		if pageSizeQuery != "" {
			parsedPageSize, err := strconv.Atoi(pageSizeQuery)
			if err != nil || parsedPageSize <= 0 {
				return jsonError(c, fiber.StatusBadRequest, "Invalid pageSize")
			}
			pageSize = parsedPageSize
		}

		createdFrom := c.Query("createdFrom")
		if createdFrom != "" {
			if _, err := time.Parse("2006-01-02", createdFrom); err != nil {
				return jsonError(c, fiber.StatusBadRequest, "Invalid createdFrom")
			}
		}

		createdTo := c.Query("createdTo")
		if createdTo != "" {
			if _, err := time.Parse("2006-01-02", createdTo); err != nil {
				return jsonError(c, fiber.StatusBadRequest, "Invalid createdTo")
			}
		}

		if createdFrom != "" && createdTo != "" {
			fromDate, _ := time.Parse("2006-01-02", createdFrom)
			toDate, _ := time.Parse("2006-01-02", createdTo)
			if fromDate.After(toDate) {
				return jsonError(c, fiber.StatusBadRequest, "createdFrom must be on or before createdTo")
			}
		}

		result, err := listTradesPaginated(context.Background(), page, pageSize, TradeFilters{
			AccountID:   c.Query("accountId"),
			Status:      c.Query("status"),
			CreatedFrom: createdFrom,
			CreatedTo:   createdTo,
		})
		if err != nil {
			return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to fetch paginated trades", err)
		}

		return c.JSON(fiber.Map{
			"items":      result.Items,
			"total":      result.Total,
			"page":       result.Page,
			"pageSize":   result.PageSize,
			"totalPages": result.TotalPages,
		})
	}

	trades, err := listTrades(context.Background())
	if err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to fetch trades", err)
	}

	return c.JSON(trades)
}

func draftTrade(c *fiber.Ctx) error {
	var req draftTradeRequest
	if err := parseRequestBody(c, &req, "Invalid trade payload"); err != nil {
		return err
	}

	plan := TradePlan{
		ID:         req.ID,
		AccountID:  req.AccountID,
		RubricID:   req.RubricID,
		Instrument: req.Instrument,
		Bias:       req.Bias,
		Entry:      req.Entry,
		StopLoss:   req.StopLoss,
		TakeProfit: req.TakeProfit,
		Contracts:  req.Contracts,
		Notes:      req.Notes,
	}

	if validationMessage := validateDraftTrade(plan); validationMessage != "" {
		return jsonError(c, fiber.StatusBadRequest, validationMessage)
	}

	if plan.ID == "" {
		plan.ID = uuid.New().String()
	}
	plan.Status = "draft"

	// Fetch instrument point value for risk calculation
	instruments, _ := instrumentsRepo.ListInstruments(context.Background())
	for _, inst := range instruments {
		if inst.Code == plan.Instrument {
			plan.PointValue = inst.PointValue
			break
		}
	}
	if plan.PointValue <= 0 {
		plan.PointValue = 10.0 // fallback default
	}

	riskAmount := computeRiskMath(plan)
	plan.RiskAmount = riskAmount
	gradeStatus := "not_requested"
	if req.RunAISetupGrade {
		gradeStatus = "queued"
	}

	if err := saveDraftTrade(context.Background(), plan, riskAmount, gradeStatus, nil); err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to save trade", err)
	}

	if req.RunAISetupGrade {
		if err := enqueueAISetupGradeJob(context.Background(), plan.ID); err != nil {
			log.Printf("Failed to enqueue AI setup grading for %s: %v", plan.ID, err)
			_ = setTradeAISetupGradeResult(context.Background(), plan.ID, "failed", "Failed to queue AI setup grade. Please retry.")
		}
	}

	aiResponse := buildDraftAIResponse(riskAmount)
	if req.RunAISetupGrade {
		aiResponse.Decision = "queued"
		aiResponse.Feedback = "Draft saved. AI setup grade has been queued and will be available shortly."
	}

	plan.AISetupGradeStatus = gradeStatus

	// Trigger alerts for subscribers interested in new draft setups
	_ = triggerAlerts(context.Background(), "draft", plan.Instrument, plan.ID, strings.ToLower(plan.Bias), plan.Entry, plan.StopLoss, plan.TakeProfit, plan.RiskAmount)

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

	// Trigger alerts for subscribers interested in this status change
	if req.Status == "filled" {
		// Get trade details to include instrument/symbol in alert
		if trade, err := getTradeByID(context.Background(), id); err == nil {
			_ = triggerAlerts(context.Background(), "filled", trade.Instrument, trade.ID, strings.ToLower(trade.Bias), trade.Entry, trade.StopLoss, trade.TakeProfit, trade.RiskAmount)
		}
	}

	return c.JSON(fiber.Map{"id": id, "status": req.Status})
}

func regradeTradeSetup(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return jsonError(c, fiber.StatusBadRequest, "Trade ID is required")
	}

	if err := setTradeAISetupGradeStatus(context.Background(), id, "queued"); err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to update grade status", err)
	}

	if err := enqueueAISetupGradeJob(context.Background(), id); err != nil {
		log.Printf("Failed to enqueue regrade for %s: %v", id, err)
		_ = setTradeAISetupGradeResult(context.Background(), id, "failed", "Failed to queue AI setup grade. Please retry.")
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to enqueue grade job", err)
	}

	return c.JSON(fiber.Map{"id": id, "aiSetupGradeStatus": "queued"})
}

func invalidateTrade(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return jsonError(c, fiber.StatusBadRequest, "Trade ID is required")
	}

	var req invalidateTradeRequest
	if err := parseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}
	if validationMessage := validateInvalidateTrade(req); validationMessage != "" {
		return jsonError(c, fiber.StatusBadRequest, validationMessage)
	}

	updated, err := invalidateTradePlan(context.Background(), id, req.Reason)
	if err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to invalidate trade", err)
	}
	if !updated {
		return jsonError(c, fiber.StatusBadRequest, "Only draft, working, or filled trades can be invalidated")
	}

	// Trigger alerts for subscribers interested in trade closure
	if trade, err := getTradeByID(context.Background(), id); err == nil {
		_ = triggerAlerts(context.Background(), "invalidated", trade.Instrument, trade.ID, strings.ToLower(trade.Bias), trade.Entry, trade.StopLoss, trade.TakeProfit, trade.RiskAmount)
	}

	return c.JSON(fiber.Map{"id": id, "status": "invalidated"})
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

	// Trigger alerts for subscribers interested in trade closure
	if trade, err := getTradeByID(context.Background(), req.TradeID); err == nil {
		_ = triggerAlerts(context.Background(), "closed", trade.Instrument, trade.ID, strings.ToLower(trade.Bias), trade.Entry, trade.StopLoss, trade.TakeProfit, trade.RiskAmount)
	}

	time.Sleep(1 * time.Second)
	aiRetro := buildJournalRetrospective(req.Outcome)

	return c.JSON(fiber.Map{
		"status":          "closed",
		"aiRetrospective": aiRetro,
	})
}
