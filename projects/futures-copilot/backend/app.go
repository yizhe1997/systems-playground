package main

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func newApp() *fiber.App {
	app := fiber.New()
	app.Use(logger.New())
	app.Use(cors.New())

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendString("Futures Copilot Backend OK")
	})

	SetupCopilotRoutes(app)

	return app
}
