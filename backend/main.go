package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
)

func main() {
	app := fiber.New(fiber.Config{
		AppName: "Systems Playground API",
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*", // We'll lock this down later in production
		AllowHeaders: "Origin, Content-Type, Accept",
	}))

	// Health Check Route
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":  "ok",
			"message": "Golang backend is up and running!",
		})
	})

	// --- ADMIN UI CONTROL PLANE ENDPOINTS ---

	// 1. List all Widgets (Redis/RabbitMQ containers)
	app.Get("/admin/widgets", func(c *fiber.Ctx) error {
		widgets, err := listWidgets()
		if err != nil {
			log.Printf("Error listing widgets: %v", err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to list widgets from Docker daemon"})
		}
		
		// If no widgets found yet, return empty array to prevent null
		if widgets == nil {
			widgets = []Widget{}
		}
		
		return c.JSON(widgets)
	})

	// 2. Toggle a Widget (Start/Stop) - Protected via X-Admin-Token middleware
	app.Post("/admin/widgets/:id/toggle", func(c *fiber.Ctx) error {
		// Secure Middleware: Check if the request came from our trusted Next.js Node server
		token := c.Get("X-Admin-Token")
		expectedToken := os.Getenv("ADMIN_API_KEY")

		if expectedToken == "" {
			log.Println("[SECURITY WARNING] No ADMIN_API_KEY environment variable set on Go backend!")
			return c.Status(500).JSON(fiber.Map{"error": "Server misconfiguration"})
		}

		if token != expectedToken {
			log.Printf("[SECURITY WARNING] Unauthorized toggle attempt! Invalid X-Admin-Token: %s", token)
			return c.Status(403).JSON(fiber.Map{"error": "Forbidden: Invalid Internal API Key"})
		}

		id := c.Params("id")
		newStatus, err := toggleWidget(id)
		if err != nil {
			log.Printf("Error toggling widget %s: %v", id, err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to toggle widget container"})
		}
		
		return c.JSON(fiber.Map{
			"id":     id,
			"status": newStatus,
		})
	})

	// Get port from env or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}