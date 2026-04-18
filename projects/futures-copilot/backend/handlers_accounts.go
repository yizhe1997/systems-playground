package main

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func getAccounts(c *fiber.Ctx) error {
	accounts, err := accountsRepo.ListAccounts(context.Background())
	if err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to fetch accounts", err)
	}

	return c.JSON(accounts)
}

func saveAccount(c *fiber.Ctx) error {
	var account AccountConfig
	if err := parseRequestBody(c, &account, "Invalid payload"); err != nil {
		return err
	}
	if validationMessage := validateAccountConfig(account); validationMessage != "" {
		return jsonError(c, fiber.StatusBadRequest, validationMessage)
	}

	if account.ID == "" {
		account.ID = "a-" + uuid.New().String()[:8]
	}

	if err := accountsRepo.SaveAccountConfig(context.Background(), account); err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to save account", err)
	}

	return c.JSON(fiber.Map{"status": "saved", "id": account.ID})
}

func deleteAccount(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return jsonError(c, fiber.StatusBadRequest, "Missing account ID")
	}

	ctx := context.Background()
	if err := accountsRepo.DeleteAccountByID(ctx, id); err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to delete account", err)
	}

	return c.JSON(fiber.Map{"status": "deleted", "id": id})
}
