package auth

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	httpx "github.com/yizhe1997/systems-playground/projects/gold-futures-copilot/backend/pkg/http"
)

func RequireCreatorOrAdmin() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// TODO: Replace header-based role extraction with NextAuth session verification via BFF token exchange.
		role := strings.ToLower(strings.TrimSpace(c.Get("X-User-Role")))
		if role == "creator" || role == "admin" {
			c.Locals("actorRole", role)
			return c.Next()
		}

		return httpx.WriteError(c, httpx.APIError{
			Code:    "FORBIDDEN",
			Message: "creator or admin role required",
			Status:  fiber.StatusForbidden,
		})
	}
}
