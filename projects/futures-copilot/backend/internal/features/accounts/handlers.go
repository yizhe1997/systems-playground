package accounts

import (
	"context"

	core "futures-copilot-mvp/internal/core"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func GetAccounts(c *fiber.Ctx, repo Repository) error {
	accounts, err := repo.ListAccounts(context.Background())
	if err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to fetch accounts", err)
	}

	return c.JSON(accounts)
}

func SaveAccount(c *fiber.Ctx, repo Repository) error {
	var account core.AccountConfig
	if err := core.ParseRequestBody(c, &account, "Invalid payload"); err != nil {
		return err
	}
	if validationMessage := core.ValidateAccountConfig(account); validationMessage != "" {
		return core.JSONError(c, fiber.StatusBadRequest, validationMessage)
	}

	if account.ID == "" {
		account.ID = uuid.New().String()
	}

	if err := repo.SaveAccountConfig(context.Background(), account); err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to save account", err)
	}

	return c.JSON(fiber.Map{"status": "saved", "id": account.ID})
}

func DeleteAccount(c *fiber.Ctx, repo Repository) error {
	id := c.Params("id")
	if id == "" {
		return core.JSONError(c, fiber.StatusBadRequest, "Missing account ID")
	}

	if err := repo.DeleteAccountByID(context.Background(), id); err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to delete account", err)
	}

	return c.JSON(fiber.Map{"status": "deleted", "id": id})
}
