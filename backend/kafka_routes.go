package main

import (
	"log"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type KafkaOrderRequest struct {
	OrderID string `json:"order_id"`
	Amount  int    `json:"amount"`
}

func getKafkaDemoSessionID(c *fiber.Ctx) string {
	sessionID := strings.TrimSpace(c.Get("X-Demo-Session"))
	if sessionID == "" {
		sessionID = strings.TrimSpace(c.Query("session"))
	}
	if sessionID == "" {
		sessionID = "default"
	}
	return sessionID
}

func RegisterKafkaRoutes(app *fiber.App) {
	api := app.Group("/api/demo/kafka")

	api.Post("/order", func(c *fiber.Ctx) error {
		sessionID := getKafkaDemoSessionID(c)

		var req KafkaOrderRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		err := ProduceOrderEvent(sessionID, req.OrderID, req.Amount)
		if err != nil {
			log.Printf("Failed to produce Kafka message: %v", err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to publish event"})
		}

		return c.SendStatus(202)
	})

	api.Post("/crash/:service", func(c *fiber.Ctx) error {
		sessionID := getKafkaDemoSessionID(c)
		service := c.Params("service")
		ToggleConsumerCrash(sessionID, service, true)
		return c.SendStatus(200)
	})

	api.Post("/restart/:service", func(c *fiber.Ctx) error {
		sessionID := getKafkaDemoSessionID(c)
		service := c.Params("service")
		ToggleConsumerCrash(sessionID, service, false)
		return c.SendStatus(200)
	})

	api.Get("/state", func(c *fiber.Ctx) error {
		sessionID := getKafkaDemoSessionID(c)
		state := GetKafkaConsumerState(sessionID)
		return c.JSON(state)
	})
}
