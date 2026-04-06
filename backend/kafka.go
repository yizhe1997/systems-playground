package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/segmentio/kafka-go"
	"github.com/yizhe1997/systems-playground/backend/pkg/rabbitmq"
)

type EventMessage struct {
	OrderID   string `json:"order_id"`
	Timestamp int64  `json:"timestamp"`
	Amount    int    `json:"amount"`
}

var (
	kafkaWriter *kafka.Writer
	kafkaMutex  sync.Mutex
	
	// Track the states of our 3 mock consumers (Inventory, Email, Analytics)
	consumerStates = struct {
		sync.RWMutex
		Inventory map[string]string // order_id -> status
		Email     map[string]string
		Analytics map[string]string
		
		// Allows us to "crash" a consumer via the UI
		InventoryCrashed bool
		EmailCrashed     bool
		AnalyticsCrashed bool
	}{
		Inventory: make(map[string]string),
		Email:     make(map[string]string),
		Analytics: make(map[string]string),
	}
)

func InitKafkaProducer() {
	go func() {
		for {
			kafkaMutex.Lock()
			if kafkaWriter == nil {
				broker := os.Getenv("KAFKA_BROKER")
				if broker == "" {
					broker = "redpanda:9092"
				}

				_, err := kafka.Dial("tcp", broker)
				if err == nil {
					// Create topic if it doesn't exist
					conn, _ := kafka.DialLeader(context.Background(), "tcp", broker, "orders", 0)
					if conn != nil {
						conn.Close()
					}

					kafkaWriter = &kafka.Writer{
						Addr:     kafka.TCP(broker),
						Topic:    "orders",
						Balancer: &kafka.LeastBytes{},
					}
					log.Println("✅ Connected to Redpanda (Kafka clone). Producer ready.")

					// Start Consumer Groups
					go startConsumerGroup(broker, "orders", "inventory_group", func(msg EventMessage) {
						consumerStates.Lock()
						defer consumerStates.Unlock()
						if consumerStates.InventoryCrashed {
							return // Simulate dropped message because service is dead
						}
						time.Sleep(300 * time.Millisecond) // simulate work
						consumerStates.Inventory[msg.OrderID] = "Stock Deducted"
						broadcastKafkaState()
					})

					go startConsumerGroup(broker, "orders", "email_group", func(msg EventMessage) {
						consumerStates.Lock()
						defer consumerStates.Unlock()
						if consumerStates.EmailCrashed {
							return
						}
						time.Sleep(500 * time.Millisecond)
						consumerStates.Email[msg.OrderID] = "Receipt Sent"
						broadcastKafkaState()
					})

					go startConsumerGroup(broker, "orders", "analytics_group", func(msg EventMessage) {
						consumerStates.Lock()
						defer consumerStates.Unlock()
						if consumerStates.AnalyticsCrashed {
							return
						}
						time.Sleep(100 * time.Millisecond)
						consumerStates.Analytics[msg.OrderID] = "Dashboard Updated"
						broadcastKafkaState()
					})
				}
			}
			kafkaMutex.Unlock()
			time.Sleep(10 * time.Second)
		}
	}()
}

func startConsumerGroup(broker, topic, groupID string, handler func(EventMessage)) {
	for {
		r := kafka.NewReader(kafka.ReaderConfig{
			Brokers:  []string{broker},
			GroupID:  groupID,
			Topic:    topic,
			MaxBytes: 10e6, // 10MB
		})

		for {
			m, err := r.ReadMessage(context.Background())
			if err != nil {
				log.Printf("Consumer %s error: %v", groupID, err)
				r.Close()
				time.Sleep(5 * time.Second)
				break // break inner loop to recreate reader
			}
			
			var event EventMessage
			json.Unmarshal(m.Value, &event)
			handler(event)
		}
	}
}

// ProduceOrderEvent publishes a new event into the Kafka topic
func ProduceOrderEvent(orderID string, amount int) error {
	if kafkaWriter == nil {
		return fmt.Errorf("kafka writer not initialized (Redpanda is offline)")
	}

	event := EventMessage{
		OrderID:   orderID,
		Timestamp: time.Now().UnixMilli(),
		Amount:    amount,
	}
	bytes, _ := json.Marshal(event)

	err := kafkaWriter.WriteMessages(context.Background(),
		kafka.Message{
			Key:   []byte(orderID),
			Value: bytes,
		},
	)
	
	if err == nil {
		broadcastKafkaState() // broadcast the new log entry
	}
	return err
}

func GetKafkaConsumerState() map[string]interface{} {
	consumerStates.RLock()
	defer consumerStates.RUnlock()
	return map[string]interface{}{
		"inventory": map[string]interface{}{
			"crashed": consumerStates.InventoryCrashed,
			"state":   consumerStates.Inventory,
		},
		"email": map[string]interface{}{
			"crashed": consumerStates.EmailCrashed,
			"state":   consumerStates.Email,
		},
		"analytics": map[string]interface{}{
			"crashed": consumerStates.AnalyticsCrashed,
			"state":   consumerStates.Analytics,
		},
	}
}

func ToggleConsumerCrash(service string, crash bool) {
	consumerStates.Lock()
	defer consumerStates.Unlock()
	
	switch service {
	case "inventory":
		consumerStates.InventoryCrashed = crash
	case "email":
		consumerStates.EmailCrashed = crash
	case "analytics":
		consumerStates.AnalyticsCrashed = crash
	}
	broadcastKafkaState()
}

func broadcastKafkaState() {
	state := GetKafkaConsumerState()
	
	// Convert the map[string]interface{} state to map[string]any explicitly just to be safe
	data := make(map[string]any)
	for k, v := range state {
		data[k] = v
	}

	rabbitmq.BroadcastEvent(rabbitmq.BroadcastMessage{
		Type:      "kafka_state_update",
		Data:      data,
		Timestamp: time.Now().UnixMilli(),
	})
}
