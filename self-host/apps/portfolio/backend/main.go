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
		AllowHeaders: "Origin, Content-Type, Accept, X-Admin-Token",
	}))

	// Initialize external systems
	initRedis()

	RegisterCMSRoutes(app)
	RegisterFilebrowserRoutes(app)
	RegisterResumeRoutes(app)

	// --- PUBLIC API ENDPOINTS ---

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	app.Get("/api/config", func(c *fiber.Ctx) error {
		resumeUrl, _ := GetConfig(c.Context(), "resumeUrl", "#")
		linkedinUrl, _ := GetConfig(c.Context(), "linkedinUrl", "#")
		githubUrl, _ := GetConfig(c.Context(), "githubUrl", "#")

		return c.JSON(fiber.Map{
			"resumeUrl":   resumeUrl,
			"linkedinUrl": linkedinUrl,
			"githubUrl":   githubUrl,
		})
	})

	// --- ADMIN UI CONTROL PLANE ENDPOINTS ---

	// Update Configuration Settings
	type ConfigRequest struct {
		ResumeUrl   string `json:"resumeUrl"`
		LinkedinUrl string `json:"linkedinUrl"`
		GithubUrl   string `json:"githubUrl"`
	}

	app.Post("/admin/config", func(c *fiber.Ctx) error {
		token := c.Get("X-Admin-Token")
		expectedToken := os.Getenv("ADMIN_API_KEY")
		if expectedToken == "" || token != expectedToken {
			return c.Status(403).JSON(fiber.Map{"error": "Forbidden: Invalid Internal API Key"})
		}

		var req ConfigRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		ctx := c.Context()
		SetConfig(ctx, "resumeUrl", req.ResumeUrl)
		SetConfig(ctx, "linkedinUrl", req.LinkedinUrl)
		SetConfig(ctx, "githubUrl", req.GithubUrl)

		return c.JSON(fiber.Map{"status": "success", "message": "Configuration updated successfully"})
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
