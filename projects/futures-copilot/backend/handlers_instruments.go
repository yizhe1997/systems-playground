package main

import (
	"context"
	"strings"

	"github.com/gofiber/fiber/v2"
)

func getInstruments(c *fiber.Ctx) error {
	instruments, err := instrumentsRepo.ListInstruments(context.Background())
	if err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to fetch instruments", err)
	}

	return c.JSON(instruments)
}

func saveInstrument(c *fiber.Ctx) error {
	var instrument InstrumentDefinition
	if err := parseRequestBody(c, &instrument, "Invalid instrument payload"); err != nil {
		return err
	}

	instrument.Code = strings.ToUpper(strings.TrimSpace(instrument.Code))

	if validationMessage := validateInstrumentDefinition(instrument); validationMessage != "" {
		return jsonError(c, fiber.StatusBadRequest, validationMessage)
	}

	if err := instrumentsRepo.SaveInstrument(context.Background(), instrument); err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to save instrument", err)
	}

	return c.JSON(fiber.Map{"status": "saved", "code": instrument.Code})
}

func deleteInstrument(c *fiber.Ctx) error {
	code := strings.ToUpper(strings.TrimSpace(c.Params("code")))
	if code == "" {
		return jsonError(c, fiber.StatusBadRequest, "Missing instrument code")
	}

	if err := instrumentsRepo.DeleteInstrument(context.Background(), code); err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to delete instrument", err)
	}

	return c.JSON(fiber.Map{"status": "deleted", "code": code})
}
