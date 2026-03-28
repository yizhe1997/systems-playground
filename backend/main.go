package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/websocket/v2"
	"github.com/yizhe1997/systems-playground/backend/pkg/rabbitmq"
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

	// --- WEBSOCKET MIDDLEWARE (Upgrade HTTP to WS) ---
	app.Use("/ws", func(c *fiber.Ctx) error {
		if websocket.IsWebSocketUpgrade(c) {
			c.Locals("allowed", true)
			return c.Next()
		}
		return fiber.ErrUpgradeRequired
	})

	// Initialize external systems
	initRedis()
	rabbitmq.InitRabbitMQ()

	// Start the RabbitMQ Consumer, WebSocket Broadcaster, and Scale-to-Zero Reaper
	go rabbitmq.ConsumeJobs()
	go rabbitmq.StartBroadcaster()
	StartReaper()

	// --- PUBLIC API ENDPOINTS ---

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	app.Get("/api/config", func(c *fiber.Ctx) error {
		resumeUrl, _ := GetConfig(c.Context(), "resumeUrl", "#")
		linkedinUrl, _ := GetConfig(c.Context(), "linkedinUrl", "#")

		return c.JSON(fiber.Map{
			"resumeUrl":   resumeUrl,
			"linkedinUrl": linkedinUrl,
		})
	})

	// Webhook Simulator Endpoint
	app.Post("/api/demo/webhook", func(c *fiber.Ctx) error {
		var payload rabbitmq.WebhookPayload
		if err := c.BodyParser(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid JSON"})
		}

		// 1. Push directly into RabbitMQ
		err := rabbitmq.PublishJob(payload)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to queue job"})
		}

		// 2. Return 202 Accepted immediately. Do NOT wait for processing.
		return c.Status(202).JSON(fiber.Map{
			"status": "queued",
			"jobId":  payload.ID,
		})
	})

	// WebSocket live-feed endpoint
	app.Get("/ws/demo", websocket.New(func(c *websocket.Conn) {
		rabbitmq.HandleWebSocketConnections(c)
	}))

	// Heartbeat endpoint to keep Scale-to-Zero containers alive
	app.Post("/api/demo/widgets/:id/heartbeat", func(c *fiber.Ctx) error {
		id := c.Params("id")
		RecordHeartbeat(c.Context(), id)
		return c.SendStatus(200)
	})

	// Wake endpoint allowing anonymous users to boot a sleeping widget
	app.Post("/api/demo/widgets/:id/wake", func(c *fiber.Ctx) error {
		id := c.Params("id")
		status, err := wakeWidget(id)
		if err != nil {
			log.Printf("Error waking widget %s: %v", id, err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to wake container"})
		}
		return c.JSON(fiber.Map{"id": id, "status": status})
	})

	// --- ADMIN UI CONTROL PLANE ENDPOINTS ---

	// 1. List all Widgets (Redis/RabbitMQ containers)
	app.Get("/admin/widgets", func(c *fiber.Ctx) error {
		widgets, err := listWidgets()
		if err != nil {
			log.Printf("Error listing widgets: %v", err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to list widgets from Docker daemon"})
		}
		if widgets == nil {
			widgets = []Widget{}
		}
		return c.JSON(widgets)
	})

	// 2. Toggle a Widget (Start/Stop) - Protected via X-Admin-Token middleware
	app.Post("/admin/widgets/:id/toggle", func(c *fiber.Ctx) error {
		token := c.Get("X-Admin-Token")
		expectedToken := os.Getenv("ADMIN_API_KEY")

		if expectedToken == "" || token != expectedToken {
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

	// 3. Update Configuration Settings
	type ConfigRequest struct {
		ResumeUrl   string `json:"resumeUrl"`
		LinkedinUrl string `json:"linkedinUrl"`
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