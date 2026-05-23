package core

import (
	"log"

	"github.com/gofiber/fiber/v2"
)

func ParseRequestBody(c *fiber.Ctx, dst any, invalidMessage string) error {
	if err := c.BodyParser(dst); err != nil {
		return JSONError(c, fiber.StatusBadRequest, invalidMessage)
	}

	return nil
}

func JSONError(c *fiber.Ctx, status int, message string) error {
	return c.Status(status).JSON(fiber.Map{"error": message})
}

func LogAndJSONError(c *fiber.Ctx, status int, message string, err error) error {
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

	return JSONError(c, status, message)
}
