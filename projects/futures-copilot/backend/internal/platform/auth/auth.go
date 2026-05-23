package auth

import (
	"crypto/subtle"
	"os"
	"strings"

	core "futures-copilot-mvp/internal/core"

	"github.com/gofiber/fiber/v2"
)

const (
	InternalAPISecretHeader = "X-Internal-Api-Secret"
	InternalUserRoleHeader  = "X-Internal-User-Role"
)

func InternalAPISharedSecret() string {
	return strings.TrimSpace(os.Getenv("INTERNAL_API_SHARED_SECRET"))
}

func EnsureTrustedInternalRequest(c *fiber.Ctx) bool {
	secret := InternalAPISharedSecret()
	if secret == "" {
		_ = core.JSONError(c, fiber.StatusServiceUnavailable, "Internal API secret is not configured")
		return false
	}

	providedSecret := strings.TrimSpace(c.Get(InternalAPISecretHeader))
	if subtle.ConstantTimeCompare([]byte(providedSecret), []byte(secret)) != 1 {
		_ = core.JSONError(c, fiber.StatusUnauthorized, "Unauthorized")
		return false
	}

	return true
}

func EnsureTrustedAdminRequest(c *fiber.Ctx) bool {
	if !EnsureTrustedInternalRequest(c) {
		return false
	}

	role := strings.ToUpper(strings.TrimSpace(c.Get(InternalUserRoleHeader)))
	if role != "ADMIN" {
		_ = core.JSONError(c, fiber.StatusForbidden, "Forbidden")
		return false
	}

	return true
}

func RequireTrustedInternalRequest(next fiber.Handler) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if !EnsureTrustedInternalRequest(c) {
			return nil
		}

		return next(c)
	}
}

func RequireTrustedAdminRequest(next fiber.Handler) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if !EnsureTrustedAdminRequest(c) {
			return nil
		}

		return next(c)
	}
}
