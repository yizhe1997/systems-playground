package tradingcopilot

import (
	"errors"

	"github.com/gofiber/fiber/v2"

	"github.com/yizhe1997/systems-playground/projects/gold-futures-copilot/backend/pkg/auth"
	httpx "github.com/yizhe1997/systems-playground/projects/gold-futures-copilot/backend/pkg/http"
	"github.com/yizhe1997/systems-playground/projects/gold-futures-copilot/backend/pkg/observability"
)

type Handler struct {
	svc    *Service
	alerts *AlertService
}

func NewHandler(svc *Service, alerts *AlertService) *Handler {
	return &Handler{svc: svc, alerts: alerts}
}

func (h *Handler) RegisterRoutes(app *fiber.App) {
	creator := app.Group("/creator", auth.RequireCreatorOrAdmin())
	creator.Post("/trade-plans", h.createTradePlan)
	creator.Post("/trade-plans/:id/grade", h.gradeTradePlan)
	creator.Post("/trade-plans/:id/publish", h.publishTradePlan)
	creator.Post("/trade-plans/:id/status", h.updateTradeStatus)
	creator.Post("/trade-plans/:id/outcome", h.submitTradeOutcome)
	creator.Post("/trade-plans/:id/retrospective", h.submitTradeOutcome)

	showroom := app.Group("/showroom")
	showroom.Get("/summary", h.getShowroomSummary)

	subscriber := app.Group("/subscriber", auth.RequireActiveSubscriber())
	subscriber.Post("/alert-channels", h.upsertAlertChannel)
}

func (h *Handler) createTradePlan(c *fiber.Ctx) error {
	var req CreateTradePlanInput
	if err := c.BodyParser(&req); err != nil {
		return httpx.WriteError(c, httpx.BadRequest("invalid request body"))
	}
	plan, err := h.svc.CreateTradePlan(c.Context(), req)
	if err != nil {
		return httpx.WriteError(c, httpx.APIError{Code: "VALIDATION_FAILED", Message: err.Error(), Status: fiber.StatusBadRequest})
	}
	return c.Status(fiber.StatusCreated).JSON(plan)
}

func (h *Handler) gradeTradePlan(c *fiber.Ctx) error {
	id := c.Params("id")
	eval, err := h.svc.GradeTradePlan(c.Context(), id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return httpx.WriteError(c, httpx.APIError{Code: "NOT_FOUND", Message: "trade plan not found", Status: fiber.StatusNotFound})
		}
		return httpx.WriteError(c, httpx.APIError{Code: "GRADE_FAILED", Message: err.Error(), Status: fiber.StatusBadRequest})
	}
	return c.JSON(eval)
}

func (h *Handler) publishTradePlan(c *fiber.Ctx) error {
	id := c.Params("id")
	plan, err := h.svc.PublishTradePlan(c.Context(), id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return httpx.WriteError(c, httpx.APIError{Code: "NOT_FOUND", Message: "trade plan not found", Status: fiber.StatusNotFound})
		}
		return httpx.WriteError(c, httpx.APIError{Code: "PUBLISH_BLOCKED", Message: err.Error(), Status: fiber.StatusBadRequest})
	}
	return c.JSON(plan)
}

func (h *Handler) getShowroomSummary(c *fiber.Ctx) error {
	summary, err := h.svc.GetShowroomSummary(c.Context())
	if err != nil {
		observability.RecordShowroomResult(false)
		return httpx.WriteError(c, httpx.APIError{Code: "SHOWROOM_FAILED", Message: err.Error(), Status: fiber.StatusInternalServerError})
	}
	observability.RecordShowroomResult(true)
	return c.JSON(summary)
}

func (h *Handler) updateTradeStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		StatusEvent    string `json:"statusEvent"`
		DispatchPolicy string `json:"dispatchPolicy"`
	}
	if err := c.BodyParser(&req); err != nil {
		return httpx.WriteError(c, httpx.APIError{Code: "BAD_REQUEST", Message: "invalid request body", Status: fiber.StatusBadRequest})
	}

	result, err := h.alerts.HandleTradeStatusUpdate(c.Context(), id, req.StatusEvent, req.DispatchPolicy)
	if err != nil {
		return httpx.WriteError(c, httpx.APIError{Code: "STATUS_UPDATE_FAILED", Message: err.Error(), Status: fiber.StatusBadRequest})
	}
	return c.JSON(result)
}

func (h *Handler) upsertAlertChannel(c *fiber.Ctx) error {
	var req AlertChannelRequest
	if err := c.BodyParser(&req); err != nil {
		return httpx.WriteError(c, httpx.APIError{Code: "BAD_REQUEST", Message: "invalid request body", Status: fiber.StatusBadRequest})
	}

	if req.SubscriberUserID == "" {
		if fromLocals, ok := c.Locals("subscriberUserID").(string); ok {
			req.SubscriberUserID = fromLocals
		}
	}

	channel, err := h.alerts.ConfigureChannel(c.Context(), req)
	if err != nil {
		return httpx.WriteError(c, httpx.APIError{Code: "CHANNEL_UPSERT_FAILED", Message: err.Error(), Status: fiber.StatusBadRequest})
	}

	return c.JSON(channel)
}

func (h *Handler) submitTradeOutcome(c *fiber.Ctx) error {
	id := c.Params("id")
	var req TradeOutcomeRequest
	if err := c.BodyParser(&req); err != nil {
		return httpx.WriteError(c, httpx.APIError{Code: "BAD_REQUEST", Message: "invalid request body", Status: fiber.StatusBadRequest})
	}

	res, err := h.svc.SubmitTradeOutcome(c.Context(), id, req)
	if err != nil {
		return httpx.WriteError(c, httpx.APIError{Code: "OUTCOME_FAILED", Message: err.Error(), Status: fiber.StatusBadRequest})
	}
	return c.JSON(res)
}
