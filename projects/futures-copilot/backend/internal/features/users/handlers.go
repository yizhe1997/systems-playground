package users

import (
	"context"
	"strings"

	core "futures-copilot-mvp/internal/core"
	auth "futures-copilot-mvp/internal/platform/auth"

	"github.com/gofiber/fiber/v2"
)

func SyncUser(c *fiber.Ctx, repo Repository) error {
	var req core.SyncUserRequest
	if err := core.ParseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}
	if validationMessage := core.ValidateSyncUserRequest(req); validationMessage != "" {
		return core.JSONError(c, fiber.StatusBadRequest, validationMessage)
	}

	role, isDisabled, createdAt, err := repo.SyncUserRecord(context.Background(), req)
	if err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to sync user", err)
	}

	return c.JSON(fiber.Map{"status": "synced", "role": role, "isDisabled": isDisabled, "createdAt": createdAt})
}

func DisableUser(c *fiber.Ctx, repo Repository) error {
	if strings.ToUpper(strings.TrimSpace(c.Get(auth.InternalUserRoleHeader))) == "ADMIN" {
		return core.JSONError(c, fiber.StatusForbidden, "Admin accounts cannot be deleted")
	}

	var req core.DisableUserRequest
	if err := core.ParseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}
	if validationMessage := core.ValidateDisableUserRequest(req); validationMessage != "" {
		return core.JSONError(c, fiber.StatusBadRequest, validationMessage)
	}

	if err := repo.DisableUserByEmail(context.Background(), req.Email); err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to disable user", err)
	}

	return c.JSON(fiber.Map{"status": "disabled"})
}
