package auth

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	httpx "github.com/yizhe1997/systems-playground/projects/gold-futures-copilot/backend/pkg/http"
)

func RequireActiveSubscriber() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// TODO: Replace header-based entitlement check with DB-backed subscription validation.
		tier := strings.ToLower(strings.TrimSpace(c.Get("X-Subscriber-Tier")))
		status := strings.ToLower(strings.TrimSpace(c.Get("X-Subscriber-Status")))
		if tier == "paid" && (status == "active" || status == "trial") {
			c.Locals("subscriberTier", tier)
			c.Locals("subscriberUserID", strings.TrimSpace(c.Get("X-Subscriber-User-Id")))
			return c.Next()
		}

		return httpx.WriteError(c, httpx.APIError{
			Code:    "PAYMENT_REQUIRED",
			Message: "active paid subscription required",
			Status:  fiber.StatusPaymentRequired,
		})
	}
}
