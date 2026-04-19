package main

import (
	"context"
	"strings"

	"github.com/gofiber/fiber/v2"
)

func syncUser(c *fiber.Ctx) error {
	var req syncUserRequest
	if err := parseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}
	if validationMessage := validateSyncUserRequest(req); validationMessage != "" {
		return jsonError(c, fiber.StatusBadRequest, validationMessage)
	}

	role, isDisabled, err := usersRepo.SyncUserRecord(context.Background(), req)
	if err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to sync user", err)
	}

	return c.JSON(fiber.Map{"status": "synced", "role": role, "isDisabled": isDisabled})
}

func disableUser(c *fiber.Ctx) error {
	if strings.ToUpper(strings.TrimSpace(c.Get(internalUserRoleHeader))) == "ADMIN" {
		return jsonError(c, fiber.StatusForbidden, "Admin accounts cannot be deleted")
	}

	var req disableUserRequest
	if err := parseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}
	if validationMessage := validateDisableUserRequest(req); validationMessage != "" {
		return jsonError(c, fiber.StatusBadRequest, validationMessage)
	}

	if err := usersRepo.DisableUserByEmail(context.Background(), req.Email); err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to disable user", err)
	}

	return c.JSON(fiber.Map{"status": "disabled"})
}
