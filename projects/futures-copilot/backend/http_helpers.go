package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
)

func parseRequestBody(c *fiber.Ctx, dst any, invalidMessage string) error {
	if err := c.BodyParser(dst); err != nil {
		return jsonError(c, fiber.StatusBadRequest, invalidMessage)
	}

	return nil
}

func jsonError(c *fiber.Ctx, status int, message string) error {
	return c.Status(status).JSON(fiber.Map{"error": message})
}

func logAndJSONError(c *fiber.Ctx, status int, message string, err error) error {
	if err != nil {
		log.Printf(
			"level=error req_id=%s method=%s path=%s status=%d message=%q error=%q",
			c.Locals("requestid"),
			c.Method(),
			c.OriginalURL(),
			status,
			message,
			err.Error(),
		)
	}

	return jsonError(c, status, message)
}
