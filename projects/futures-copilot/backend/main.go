package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
	InitRedis()
	InitPostgres() // Fire up pgvector

	app := fiber.New()
	app.Use(logger.New())
	app.Use(cors.New())

	// Healthcheck
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.SendString("Futures Copilot Backend OK")
	})

	// Setup Copilot Routes
	SetupCopilotRoutes(app)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8088"
	}

	log.Printf("Starting MVP backend on :%s", port)
	log.Fatal(app.Listen(":" + port))
}
