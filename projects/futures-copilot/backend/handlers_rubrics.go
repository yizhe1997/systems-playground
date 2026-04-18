package main

import (
	"context"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func getRubrics(c *fiber.Ctx) error {
	rubrics, err := rubricsRepo.ListRubrics(context.Background())
	if err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to fetch rubrics", err)
	}

	return c.JSON(rubrics)
}

func saveRubric(c *fiber.Ctx) error {
	var rubric Rubric
	if err := parseRequestBody(c, &rubric, "Invalid rubric payload"); err != nil {
		return err
	}
	if validationMessage := validateRubric(rubric); validationMessage != "" {
		return jsonError(c, fiber.StatusBadRequest, validationMessage)
	}

	if rubric.ID == "" {
		rubric.ID = uuid.New().String()
	}

	if err := rubricsRepo.SaveRubricConfig(context.Background(), rubric); err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to save rubric to Postgres", err)
	}

	return c.JSON(fiber.Map{"status": "saved", "id": rubric.ID})
}

func deleteRubric(c *fiber.Ctx) error {
	id := c.Params("id")
	if id == "" {
		return jsonError(c, fiber.StatusBadRequest, "Missing rubric ID")
	}

	if err := rubricsRepo.DeleteRubricByID(context.Background(), id); err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to delete rubric", err)
	}

	return c.JSON(fiber.Map{"status": "deleted"})
}
