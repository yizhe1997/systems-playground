package app

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/fiber/v2/middleware/requestid"
)

func New(deps Dependencies) *fiber.App {
	app := fiber.New()

	app.Use(recover.New())
	app.Use(requestid.New())
	app.Use(logger.New(logger.Config{
		Format: "req_id=${locals:requestid} method=${method} path=${path} status=${status} latency=${latency}\n",
	}))

	app.Use(cors.New())

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendString("Futures Copilot Backend OK")
	})

	registerRoutes(app, deps)

	return app
}
