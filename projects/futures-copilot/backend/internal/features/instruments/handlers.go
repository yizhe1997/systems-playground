package instruments

import (
	"context"
	"strings"

	core "futures-copilot-mvp/internal/core"

	"github.com/gofiber/fiber/v2"
)

func GetInstruments(c *fiber.Ctx, repo Repository) error {
	instruments, err := repo.ListInstruments(context.Background())
	if err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to fetch instruments", err)
	}

	return c.JSON(instruments)
}

func SaveInstrument(c *fiber.Ctx, repo Repository) error {
	var instrument core.InstrumentDefinition
	if err := core.ParseRequestBody(c, &instrument, "Invalid instrument payload"); err != nil {
		return err
	}

	instrument.Code = strings.ToUpper(strings.TrimSpace(instrument.Code))

	if validationMessage := core.ValidateInstrumentDefinition(instrument); validationMessage != "" {
		return core.JSONError(c, fiber.StatusBadRequest, validationMessage)
	}

	if err := repo.SaveInstrument(context.Background(), instrument); err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to save instrument", err)
	}

	return c.JSON(fiber.Map{"status": "saved", "code": instrument.Code})
}

func DeleteInstrument(c *fiber.Ctx, repo Repository) error {
	code := strings.ToUpper(strings.TrimSpace(c.Params("code")))
	if code == "" {
		return core.JSONError(c, fiber.StatusBadRequest, "Missing instrument code")
	}

	if err := repo.DeleteInstrument(context.Background(), code); err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to delete instrument", err)
	}

	return c.JSON(fiber.Map{"status": "deleted", "code": code})
}
