package main

import (
	"crypto/subtle"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
)

const (
	internalAPISecretHeader = "X-Internal-Api-Secret"
	internalUserRoleHeader  = "X-Internal-User-Role"
)

func internalAPISharedSecret() string {
	return strings.TrimSpace(os.Getenv("INTERNAL_API_SHARED_SECRET"))
}

func ensureTrustedInternalRequest(c *fiber.Ctx) bool {
	secret := internalAPISharedSecret()
	if secret == "" {
		_ = jsonError(c, fiber.StatusServiceUnavailable, "Internal API secret is not configured")
		return false
	}

	providedSecret := strings.TrimSpace(c.Get(internalAPISecretHeader))
	if subtle.ConstantTimeCompare([]byte(providedSecret), []byte(secret)) != 1 {
		_ = jsonError(c, fiber.StatusUnauthorized, "Unauthorized")
		return false
	}

	return true
}

func ensureTrustedAdminRequest(c *fiber.Ctx) bool {
	if !ensureTrustedInternalRequest(c) {
		return false
	}

	role := strings.ToUpper(strings.TrimSpace(c.Get(internalUserRoleHeader)))
	if role != "ADMIN" {
		_ = jsonError(c, fiber.StatusForbidden, "Forbidden")
		return false
	}

	return true
}

func requireTrustedInternalRequest(next fiber.Handler) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if !ensureTrustedInternalRequest(c) {
			return nil
		}

		return next(c)
	}
}

func requireTrustedAdminRequest(next fiber.Handler) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if !ensureTrustedAdminRequest(c) {
			return nil
		}

		return next(c)
	}
}
