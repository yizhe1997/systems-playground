package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
)

type KafkaOrderRequest struct {
	OrderID string `json:"order_id"`
	Amount  int    `json:"amount"`
}

func RegisterKafkaRoutes(app *fiber.App) {
	api := app.Group("/api/demo/kafka")

	api.Post("/order", func(c *fiber.Ctx) error {
		var req KafkaOrderRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		err := ProduceOrderEvent(req.OrderID, req.Amount)
		if err != nil {
			log.Printf("Failed to produce Kafka message: %v", err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to publish event"})
		}

		return c.SendStatus(202)
	})

	api.Post("/crash/:service", func(c *fiber.Ctx) error {
		service := c.Params("service")
		ToggleConsumerCrash(service, true)
		return c.SendStatus(200)
	})

	api.Post("/restart/:service", func(c *fiber.Ctx) error {
		service := c.Params("service")
		ToggleConsumerCrash(service, false)
		return c.SendStatus(200)
	})

	api.Get("/state", func(c *fiber.Ctx) error {
		state := GetKafkaConsumerState()
		return c.JSON(state)
	})
}
