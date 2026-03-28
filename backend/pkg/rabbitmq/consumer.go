package rabbitmq

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gofiber/websocket/v2"
)

// A map to hold all active WebSocket connections so we can broadcast status updates
var clients = make(map[*websocket.Conn]bool)

// A channel to receive messages that need to be broadcasted to all clients
var broadcast = make(chan BroadcastMessage)

// BroadcastMessage defines the JSON structure sent to the React frontend
type BroadcastMessage struct {
	Type      string `json:"type"`      // e.g., "job_queued", "job_processing", "job_completed"
	JobID     string `json:"jobId"`
	Data      string `json:"data"`
	Timestamp int64  `json:"timestamp"`
}

// HandleWebSocketConnections manages the live connection lifecycle
func HandleWebSocketConnections(c *websocket.Conn) {
	defer func() {
		c.Close()
		delete(clients, c)
	}()

	// Register the new client
	clients[c] = true
	log.Printf("🔌 [WebSocket] New client connected. Total clients: %d", len(clients))

	// Keep the connection alive
	for {
		_, _, err := c.ReadMessage()
		if err != nil {
			log.Printf("🔌 [WebSocket] Client disconnected: %v", err)
			break
		}
	}
}

// StartBroadcaster runs in a background goroutine and pushes messages to all connected React clients
func StartBroadcaster() {
	for {
		// Grab the next message from the broadcast channel
		msg := <-broadcast

		for client := range clients {
			err := client.WriteJSON(msg)
			if err != nil {
				log.Printf("🔌 [WebSocket] Error broadcasting to client: %v", err)
				client.Close()
				delete(clients, client)
			}
		}
	}
}

// ConsumeJobs runs in a background goroutine and listens to RabbitMQ
func ConsumeJobs() {
	for {
		if !ConnectIfNeeded() {
			// If RabbitMQ is offline (Scale-to-Zero), sleep and check again later
			time.Sleep(10 * time.Second)
			continue
		}

		msgs, err := channel.Consume(
			Queue.Name, // queue
			"",         // consumer label
			false,      // auto-ack (set to false to simulate real enterprise workflows)
			false,      // exclusive
			false,      // no-local
			false,      // no-wait
			nil,        // args
		)
		if err != nil {
			log.Printf("❌ Failed to register a consumer. Retrying in 10s... %v", err)
			time.Sleep(10 * time.Second)
			continue
		}

		log.Printf("📡 [Consumer] Background worker is listening for jobs...")

		for d := range msgs {
			var payload WebhookPayload
			if err := json.Unmarshal(d.Body, &payload); err != nil {
				log.Printf("❌ Error decoding message: %v", err)
				d.Nack(false, false) // Drop bad messages
				continue
			}

			// 1. Tell the React UI that the worker picked up the job
			broadcast <- BroadcastMessage{
				Type:      "job_processing",
				JobID:     payload.ID,
				Data:      payload.Data,
				Timestamp: time.Now().UnixMilli(),
			}

			log.Printf("⚙️ [Consumer] Processing Job %s...", payload.ID)

			// 2. Simulate heavy background work
			time.Sleep(3 * time.Second)

			// 3. Mark the job as completely finished
			d.Ack(false) // Manually acknowledge that the job succeeded

			log.Printf("✅ [Consumer] Completed Job %s.", payload.ID)

			// 4. Tell the React UI that the job is done
			broadcast <- BroadcastMessage{
				Type:      "job_completed",
				JobID:     payload.ID,
				Data:      "Finished ATS sync for: " + payload.Data,
				Timestamp: time.Now().UnixMilli(),
			}
		}

		// If the range ends, it means the channel closed (e.g. RabbitMQ was stopped)
		log.Println("⚠️ [Consumer] RabbitMQ connection lost. Worker entering standby mode.")
		time.Sleep(5 * time.Second)
	}
}
