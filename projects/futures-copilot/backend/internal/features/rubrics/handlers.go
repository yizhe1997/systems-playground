package rubrics

import (
	"context"

	core "futures-copilot-mvp/internal/core"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

func GetRubrics(c *fiber.Ctx, repo Repository) error {
	rubrics, err := repo.ListRubrics(context.Background())
	if err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to fetch rubrics", err)
	}

	return c.JSON(rubrics)
}

func SaveRubric(c *fiber.Ctx, repo Repository) error {
	var rubric core.Rubric
	if err := core.ParseRequestBody(c, &rubric, "Invalid rubric payload"); err != nil {
		return err
	}
	if validationMessage := core.ValidateRubric(rubric); validationMessage != "" {
		return core.JSONError(c, fiber.StatusBadRequest, validationMessage)
	}

	if rubric.ID == "" {
		rubric.ID = uuid.New().String()
	}

	if err := repo.SaveRubricConfig(context.Background(), rubric); err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to save rubric to Postgres", err)
	}

	return c.JSON(fiber.Map{"status": "saved", "id": rubric.ID})
}

func DeleteRubric(c *fiber.Ctx, repo Repository) error {
	id := c.Params("id")
	if id == "" {
		return core.JSONError(c, fiber.StatusBadRequest, "Missing rubric ID")
	}

	if err := repo.DeleteRubricByID(context.Background(), id); err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to delete rubric", err)
	}

	return c.JSON(fiber.Map{"status": "deleted"})
}
