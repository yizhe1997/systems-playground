package rabbitmq

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/gofiber/websocket/v2"
	"github.com/redis/go-redis/v9"
)

var RedisClient *redis.Client

// A map to hold all active WebSocket connections so we can broadcast status updates
var clients = make(map[*websocket.Conn]bool)

// A channel to receive messages that need to be broadcasted to all clients
var broadcast = make(chan BroadcastMessage)

// BroadcastMessage defines the JSON structure sent to the React frontend
type BroadcastMessage struct {
	Type      string         `json:"type"` // e.g., "job_queued", "job_processing", "job_completed"
	JobID     string         `json:"jobId"`
	Data      map[string]any `json:"data"`
	Timestamp int64          `json:"timestamp"`
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

			// 2. Perform the Database Mutation (Update Redis)
			time.Sleep(2 * time.Second) // Simulate complex parsing delay

			// Default payload format fallback
			title := "Unknown Job"
			if t, ok := payload.Data["title"].(string); ok {
				title = t
			}
			newStatus := "published"
			if s, ok := payload.Data["target_status"].(string); ok {
				newStatus = s
			}

			if RedisClient != nil {
				// We actually mutate the database record to prove the queue successfully executed
				ctx := context.Background()
				
				jobRecord, err := RedisClient.Get(ctx, "job:"+payload.ID).Result()
				if err == nil {
					// Job exists, update its status
					var jobData map[string]any
					json.Unmarshal([]byte(jobRecord), &jobData)
					jobData["status"] = newStatus
					jobData["updated_at"] = time.Now().Format(time.RFC3339)
					
					updatedJson, _ := json.Marshal(jobData)
					RedisClient.Set(ctx, "job:"+payload.ID, updatedJson, 0)
					log.Printf("💾 [Consumer] Updated Job %s in Redis to status: %s", payload.ID, newStatus)
				} else {
					// Job doesn't exist yet, insert it
					newJob := map[string]any{
						"id":         payload.ID,
						"title":      title,
						"status":     newStatus,
						"created_at": time.Now().Format(time.RFC3339),
					}
					updatedJson, _ := json.Marshal(newJob)
					RedisClient.Set(ctx, "job:"+payload.ID, updatedJson, 0)
					log.Printf("💾 [Consumer] Inserted new Job %s into Redis", payload.ID)
				}
			}

			// 3. Mark the job as completely finished
			d.Ack(false) // Manually acknowledge that the job succeeded

			log.Printf("✅ [Consumer] Completed Job %s.", payload.ID)

			// 4. Tell the React UI that the job is done
			broadcast <- BroadcastMessage{
				Type:      "job_completed",
				JobID:     payload.ID,
				Data:      payload.Data,
				Timestamp: time.Now().UnixMilli(),
			}
		}

		// If the range ends, it means the channel closed (e.g. RabbitMQ was stopped)
		log.Println("⚠️ [Consumer] RabbitMQ connection lost. Worker entering standby mode.")
		time.Sleep(5 * time.Second)
	}
}
