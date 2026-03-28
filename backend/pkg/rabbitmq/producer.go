package rabbitmq

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

var (
	conn    *amqp.Connection
	channel *amqp.Channel
	Queue   amqp.Queue
)

type WebhookPayload struct {
	ID        string `json:"id"`
	Timestamp int64  `json:"timestamp"`
	Data      string `json:"data"`
}

func InitRabbitMQ() {
	rabbitURL := os.Getenv("RABBITMQ_URL")
	if rabbitURL == "" {
		rabbitURL = "amqp://guest:guest@localhost:5672/"
	}

	var err error
	
	// Add retry logic because RabbitMQ might be turned off (Scale-to-Zero)
	for i := 0; i < 5; i++ {
		conn, err = amqp.Dial(rabbitURL)
		if err == nil {
			break
		}
		log.Printf("⚠️ Waiting for RabbitMQ... (attempt %d/5)", i+1)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Printf("⚠️ RabbitMQ is currently offline (Scale-to-Zero). API is running, but queuing is disabled.")
		return
	}

	channel, err = conn.Channel()
	if err != nil {
		log.Printf("❌ Failed to open a channel: %v", err)
		return
	}

	// Declare a durable queue (survives RabbitMQ restarts)
	Queue, err = channel.QueueDeclare(
		"webhook_jobs", // name
		true,           // durable
		false,          // delete when unused
		false,          // exclusive
		false,          // no-wait
		nil,            // arguments
	)
	if err != nil {
		log.Printf("❌ Failed to declare a queue: %v", err)
		return
	}

	log.Printf("✅ Connected to RabbitMQ. Queue '%s' initialized.", Queue.Name)
}

func ConnectIfNeeded() bool {
	if channel != nil && !channel.IsClosed() {
		return true
	}
	// Try reconnecting
	InitRabbitMQ()
	return channel != nil && !channel.IsClosed()
}

func PublishJob(payload WebhookPayload) error {
	if !ConnectIfNeeded() {
		return amqp.ErrClosed
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	err = channel.PublishWithContext(ctx,
		"",         // exchange
		Queue.Name, // routing key
		false,      // mandatory
		false,      // immediate
		amqp.Publishing{
			DeliveryMode: amqp.Persistent, // Save messages to disk
			ContentType:  "application/json",
			Body:         body,
		})

	if err != nil {
		log.Printf("❌ Failed to publish a message: %v", err)
		return err
	}

	log.Printf("📥 [Producer] Job %s pushed to queue.", payload.ID)
	return nil
}
