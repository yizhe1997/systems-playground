package trades

import (
	"context"
	"log"
	"strconv"
	"strings"
	"time"

	core "futures-copilot-mvp/internal/core"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type Dependencies struct {
	ListInstruments        func(ctx context.Context) ([]core.InstrumentDefinition, error)
	EnqueueAISetupGradeJob func(ctx context.Context, tradeID string) error
	TriggerAlerts          func(ctx context.Context, eventType string, symbol string, tradeID string, direction string, entry float64, stopLoss float64, takeProfit float64, riskAmount float64) error
	Sleep                  func(time.Duration)
}

func defaultSleep(d time.Duration) {
	time.Sleep(d)
}

func withDefaults(deps Dependencies) Dependencies {
	if deps.Sleep == nil {
		deps.Sleep = defaultSleep
	}
	return deps
}

func GetTrades(c *fiber.Ctx, repo Repository) error {
	pageQuery := c.Query("page")
	pageSizeQuery := c.Query("pageSize")

	if pageQuery != "" || pageSizeQuery != "" {
		page := 1
		pageSize := 6

		if pageQuery != "" {
			parsedPage, err := strconv.Atoi(pageQuery)
			if err != nil || parsedPage <= 0 {
				return core.JSONError(c, fiber.StatusBadRequest, "Invalid page")
			}
			page = parsedPage
		}

		if pageSizeQuery != "" {
			parsedPageSize, err := strconv.Atoi(pageSizeQuery)
			if err != nil || parsedPageSize <= 0 {
				return core.JSONError(c, fiber.StatusBadRequest, "Invalid pageSize")
			}
			pageSize = parsedPageSize
		}

		createdFrom := c.Query("createdFrom")
		if createdFrom != "" {
			if _, err := time.Parse("2006-01-02", createdFrom); err != nil {
				return core.JSONError(c, fiber.StatusBadRequest, "Invalid createdFrom")
			}
		}

		createdTo := c.Query("createdTo")
		if createdTo != "" {
			if _, err := time.Parse("2006-01-02", createdTo); err != nil {
				return core.JSONError(c, fiber.StatusBadRequest, "Invalid createdTo")
			}
		}

		if createdFrom != "" && createdTo != "" {
			fromDate, _ := time.Parse("2006-01-02", createdFrom)
			toDate, _ := time.Parse("2006-01-02", createdTo)
			if fromDate.After(toDate) {
				return core.JSONError(c, fiber.StatusBadRequest, "createdFrom must be on or before createdTo")
			}
		}

		result, err := repo.ListTradesPaginated(context.Background(), page, pageSize, Filters{
			AccountID:   c.Query("accountId"),
			Status:      c.Query("status"),
			CreatedFrom: createdFrom,
			CreatedTo:   createdTo,
		})
		if err != nil {
			return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to fetch paginated trades", err)
		}

		return c.JSON(fiber.Map{
			"items":      result.Items,
			"total":      result.Total,
			"page":       result.Page,
			"pageSize":   result.PageSize,
			"totalPages": result.TotalPages,
		})
	}

	trades, err := repo.ListTrades(context.Background())
	if err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to fetch trades", err)
	}

	return c.JSON(trades)
}

func DraftTrade(c *fiber.Ctx, repo Repository, deps Dependencies) error {
	deps = withDefaults(deps)

	var req core.DraftTradeRequest
	if err := core.ParseRequestBody(c, &req, "Invalid trade payload"); err != nil {
		return err
	}

	plan := core.TradePlan{
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

	if validationMessage := ValidateDraftTrade(plan); validationMessage != "" {
		return core.JSONError(c, fiber.StatusBadRequest, validationMessage)
	}

	if plan.ID == "" {
		plan.ID = uuid.New().String()
	}
	plan.Status = "draft"

	if deps.ListInstruments != nil {
		instruments, _ := deps.ListInstruments(context.Background())
		for _, inst := range instruments {
			if inst.Code == plan.Instrument {
				plan.PointValue = inst.PointValue
				break
			}
		}
	}
	if plan.PointValue <= 0 {
		plan.PointValue = 10.0 // fallback default
	}

	riskAmount := ComputeRiskMath(plan)
	plan.RiskAmount = riskAmount
	gradeStatus := "not_requested"
	if req.RunAISetupGrade {
		gradeStatus = "queued"
	}

	if err := repo.SaveDraftTrade(context.Background(), plan, riskAmount, gradeStatus, nil); err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to save trade", err)
	}

	if req.RunAISetupGrade && deps.EnqueueAISetupGradeJob != nil {
		if err := deps.EnqueueAISetupGradeJob(context.Background(), plan.ID); err != nil {
			log.Printf("Failed to enqueue AI setup grading for %s: %v", plan.ID, err)
			_ = repo.SetTradeAISetupGradeResult(context.Background(), plan.ID, "failed", "Failed to queue AI setup grade. Please retry.")
		}
	}

	aiResponse := BuildDraftAIResponse(riskAmount)
	if req.RunAISetupGrade {
		aiResponse.Decision = "queued"
		aiResponse.Feedback = "Draft saved. AI setup grade has been queued and will be available shortly."
	}

	plan.AISetupGradeStatus = gradeStatus

	if deps.TriggerAlerts != nil {
		_ = deps.TriggerAlerts(context.Background(), "draft", plan.Instrument, plan.ID, strings.ToLower(plan.Bias), plan.Entry, plan.StopLoss, plan.TakeProfit, plan.RiskAmount)
	}

	return c.JSON(fiber.Map{
		"trade":      plan,
		"aiResponse": aiResponse,
	})
}

func UpdateTradeStatus(c *fiber.Ctx, repo Repository, deps Dependencies) error {
	id := c.Params("id")

	var req core.UpdateTradeStatusRequest
	if err := core.ParseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}
	if validationMessage := ValidateTradeStatusUpdate(req); validationMessage != "" {
		return core.JSONError(c, fiber.StatusBadRequest, validationMessage)
	}

	if err := repo.SetTradeStatus(context.Background(), id, req.Status); err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to update status", err)
	}

	if req.Status == "filled" && deps.TriggerAlerts != nil {
		if trade, err := repo.GetTradeByID(context.Background(), id); err == nil {
			_ = deps.TriggerAlerts(context.Background(), "filled", trade.Instrument, trade.ID, strings.ToLower(trade.Bias), trade.Entry, trade.StopLoss, trade.TakeProfit, trade.RiskAmount)
		}
	}

	return c.JSON(fiber.Map{"id": id, "status": req.Status})
}

func RegradeTradeSetup(c *fiber.Ctx, repo Repository, deps Dependencies) error {
	id := c.Params("id")
	if id == "" {
		return core.JSONError(c, fiber.StatusBadRequest, "Trade ID is required")
	}

	if err := repo.SetTradeAISetupGradeStatus(context.Background(), id, "queued"); err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to update grade status", err)
	}

	if deps.EnqueueAISetupGradeJob != nil {
		if err := deps.EnqueueAISetupGradeJob(context.Background(), id); err != nil {
			log.Printf("Failed to enqueue regrade for %s: %v", id, err)
			_ = repo.SetTradeAISetupGradeResult(context.Background(), id, "failed", "Failed to queue AI setup grade. Please retry.")
			return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to enqueue grade job", err)
		}
	}

	return c.JSON(fiber.Map{"id": id, "aiSetupGradeStatus": "queued"})
}

func InvalidateTrade(c *fiber.Ctx, repo Repository, deps Dependencies) error {
	id := c.Params("id")
	if id == "" {
		return core.JSONError(c, fiber.StatusBadRequest, "Trade ID is required")
	}

	var req core.InvalidateTradeRequest
	if err := core.ParseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}
	if validationMessage := ValidateInvalidateTrade(req); validationMessage != "" {
		return core.JSONError(c, fiber.StatusBadRequest, validationMessage)
	}

	updated, err := repo.InvalidateTradePlan(context.Background(), id, req.Reason)
	if err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to invalidate trade", err)
	}
	if !updated {
		return core.JSONError(c, fiber.StatusBadRequest, "Only draft, working, or filled trades can be invalidated")
	}

	if deps.TriggerAlerts != nil {
		if trade, err := repo.GetTradeByID(context.Background(), id); err == nil {
			_ = deps.TriggerAlerts(context.Background(), "invalidated", trade.Instrument, trade.ID, strings.ToLower(trade.Bias), trade.Entry, trade.StopLoss, trade.TakeProfit, trade.RiskAmount)
		}
	}

	return c.JSON(fiber.Map{"id": id, "status": "invalidated"})
}

func JournalTrade(c *fiber.Ctx, repo Repository, deps Dependencies) error {
	deps = withDefaults(deps)

	var req core.JournalTradeRequest
	if err := core.ParseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}
	if validationMessage := ValidateJournalTrade(req); validationMessage != "" {
		return core.JSONError(c, fiber.StatusBadRequest, validationMessage)
	}

	if err := repo.CloseTrade(context.Background(), req.TradeID); err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to update trade status", err)
	}

	if err := repo.SaveTradeOutcome(context.Background(), req); err != nil {
		log.Printf("Failed to save outcome: %v", err)
	}

	if deps.TriggerAlerts != nil {
		if trade, err := repo.GetTradeByID(context.Background(), req.TradeID); err == nil {
			_ = deps.TriggerAlerts(context.Background(), "closed", trade.Instrument, trade.ID, strings.ToLower(trade.Bias), trade.Entry, trade.StopLoss, trade.TakeProfit, trade.RiskAmount)
		}
	}

	deps.Sleep(1 * time.Second)
	aiRetro := BuildJournalRetrospective(req.Outcome)

	return c.JSON(fiber.Map{
		"status":          "closed",
		"aiRetrospective": aiRetro,
	})
}
