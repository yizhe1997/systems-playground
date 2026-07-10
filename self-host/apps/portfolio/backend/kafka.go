package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/segmentio/kafka-go"
	"github.com/yizhe1997/systems-playground/backend/pkg/rabbitmq"
)

type EventMessage struct {
	SessionID string `json:"session_id"`
	OrderID   string `json:"order_id"`
	Timestamp int64  `json:"timestamp"`
	Amount    int    `json:"amount"`
}

const (
	kafkaTopic                 = "orders"
	defaultKafkaBroker         = "redpanda:9092"
	kafkaDialTimeout           = 3 * time.Second
	kafkaWriteTimeout          = 5 * time.Second
	kafkaReadTimeout           = 5 * time.Second
	kafkaProducerRetryDelay    = 2 * time.Second
	kafkaProducerRetryWindow   = 20 * time.Second
	kafkaBrokerPollInterval    = 500 * time.Millisecond
	kafkaConsumerReconnectWait = 2 * time.Second
	kafkaConsumerReadWindow    = 5 * time.Second
)

var (
	kafkaWriter *kafka.Writer
	kafkaMutex  sync.Mutex
	kafkaOnce   sync.Once

	// Track the states of our 3 mock consumers (Inventory, Email, Analytics) per demo session.
	consumerStates = struct {
		sync.RWMutex
		Sessions map[string]*kafkaSessionState
	}{
		Sessions: make(map[string]*kafkaSessionState),
	}

	kafkaSessionConsumers = struct {
		sync.Mutex
		started map[string]bool
	}{
		started: make(map[string]bool),
	}
)

type kafkaSessionState struct {
	Inventory map[string]string
	Email     map[string]string
	Analytics map[string]string

	InventoryCrashed bool
	EmailCrashed     bool
	AnalyticsCrashed bool
}

func InitKafkaProducer() {
	kafkaOnce.Do(func() {
		log.Printf("Kafka producer ready. Session-scoped Kafka consumers will start lazily on first event.")
	})
}

func startConsumerGroup(service, broker, topic, groupID string, handler func(EventMessage) bool) {
	for {
		waitCtx, waitCancel := context.WithTimeout(context.Background(), kafkaProducerRetryWindow)
		err := waitForKafkaBroker(waitCtx, broker)
		waitCancel()
		if err != nil {
			log.Printf("Consumer %s waiting for broker %s: %v", groupID, broker, err)
			time.Sleep(kafkaConsumerReconnectWait)
			continue
		}

		r := kafka.NewReader(kafka.ReaderConfig{
			Brokers:     []string{broker},
			GroupID:     groupID,
			Topic:       topic,
			MinBytes:    1,
			MaxBytes:    10e6, // 10MB
			MaxWait:     1 * time.Second,
			StartOffset: kafka.FirstOffset,
		})
		log.Printf("Consumer %s connected to %s", groupID, broker)

		for {
			readCtx, cancel := context.WithTimeout(context.Background(), kafkaConsumerReadWindow)
			m, err := r.FetchMessage(readCtx)
			cancel()
			if err != nil {
				if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
					continue
				}

				log.Printf("Consumer %s error: %v", groupID, err)
				if closeErr := r.Close(); closeErr != nil {
					log.Printf("Consumer %s close error: %v", groupID, closeErr)
				}
				time.Sleep(kafkaConsumerReconnectWait)
				break // break inner loop to recreate reader
			}

			var event EventMessage
			if err := json.Unmarshal(m.Value, &event); err != nil {
				log.Printf("Consumer %s received invalid payload: %v", groupID, err)
				commitCtx, commitCancel := context.WithTimeout(context.Background(), kafkaReadTimeout)
				commitErr := r.CommitMessages(commitCtx, m)
				commitCancel()
				if commitErr != nil {
					log.Printf("Consumer %s commit error after invalid payload: %v", groupID, commitErr)
					if closeErr := r.Close(); closeErr != nil {
						log.Printf("Consumer %s close error: %v", groupID, closeErr)
					}
					time.Sleep(kafkaConsumerReconnectWait)
					break
				}
				continue
			}

			shouldCommit := handler(event)
			if !shouldCommit {
				closeConsumerReader(r, groupID, "message handling interrupted before commit")
				time.Sleep(250 * time.Millisecond)
				break
			}

			commitCtx, commitCancel := context.WithTimeout(context.Background(), kafkaReadTimeout)
			if err := r.CommitMessages(commitCtx, m); err != nil {
				commitCancel()
				log.Printf("Consumer %s commit error: %v", groupID, err)
				if closeErr := r.Close(); closeErr != nil {
					log.Printf("Consumer %s close error: %v", groupID, closeErr)
				}
				time.Sleep(kafkaConsumerReconnectWait)
				break
			}
			commitCancel()
		}
	}
}

// ProduceOrderEvent publishes a new event into the Kafka topic
func ProduceOrderEvent(sessionID, orderID string, amount int) error {
	sessionID = normalizeSessionID(sessionID)
	ensureKafkaSessionConsumers(sessionID)

	event := EventMessage{
		SessionID: sessionID,
		OrderID:   orderID,
		Timestamp: time.Now().UnixMilli(),
		Amount:    amount,
	}
	bytes, _ := json.Marshal(event)

	deadline := time.Now().Add(kafkaProducerRetryWindow)
	var lastErr error

	for attempt := 1; time.Now().Before(deadline); attempt++ {
		attemptCtx, cancel := context.WithTimeout(context.Background(), kafkaWriteTimeout)
		writer, err := ensureKafkaWriter(attemptCtx)
		if err == nil {
			err = writer.WriteMessages(attemptCtx,
				kafka.Message{
					Key:   []byte(orderID),
					Value: bytes,
				},
			)
		}
		cancel()

		if err == nil {
			broadcastKafkaState(sessionID) // broadcast the new log entry for this session
			return nil
		}

		lastErr = err
		log.Printf("🚨 Kafka produce attempt %d failed: %v", attempt, err)
		resetKafkaWriter(fmt.Sprintf("produce attempt %d failed", attempt))

		if time.Now().Add(kafkaProducerRetryDelay).After(deadline) {
			break
		}

		time.Sleep(kafkaProducerRetryDelay)
	}

	if lastErr == nil {
		lastErr = fmt.Errorf("broker %s is unavailable", getKafkaBroker())
	}

	return fmt.Errorf("failed to publish event to Redpanda after reconnect attempts: %w", lastErr)
}

func GetKafkaConsumerState(sessionID string) map[string]interface{} {
	sessionID = normalizeSessionID(sessionID)

	consumerStates.RLock()
	sessionState := getKafkaSessionSnapshotLocked(sessionID)
	defer consumerStates.RUnlock()

	return map[string]interface{}{
		"inventory": map[string]interface{}{
			"crashed": sessionState.InventoryCrashed,
			"state":   sessionState.Inventory,
		},
		"email": map[string]interface{}{
			"crashed": sessionState.EmailCrashed,
			"state":   sessionState.Email,
		},
		"analytics": map[string]interface{}{
			"crashed": sessionState.AnalyticsCrashed,
			"state":   sessionState.Analytics,
		},
	}
}

func ToggleConsumerCrash(sessionID, service string, crash bool) {
	sessionID = normalizeSessionID(sessionID)

	consumerStates.Lock()
	sessionState := ensureKafkaSessionStateLocked(sessionID)

	switch service {
	case "inventory":
		sessionState.InventoryCrashed = crash
	case "email":
		sessionState.EmailCrashed = crash
	case "analytics":
		sessionState.AnalyticsCrashed = crash
	}
	consumerStates.Unlock()

	broadcastKafkaState(sessionID)
}

func getKafkaBroker() string {
	broker := os.Getenv("KAFKA_BROKER")
	if broker == "" {
		return defaultKafkaBroker
	}
	return broker
}

func ensureKafkaWriter(ctx context.Context) (*kafka.Writer, error) {
	kafkaMutex.Lock()
	defer kafkaMutex.Unlock()

	if kafkaWriter != nil {
		return kafkaWriter, nil
	}

	broker := getKafkaBroker()
	if err := waitForKafkaBroker(ctx, broker); err != nil {
		return nil, err
	}

	kafkaWriter = &kafka.Writer{
		Addr:                   kafka.TCP(broker),
		Topic:                  kafkaTopic,
		Balancer:               &kafka.LeastBytes{},
		WriteTimeout:           kafkaWriteTimeout,
		ReadTimeout:            kafkaReadTimeout,
		AllowAutoTopicCreation: true,
		RequiredAcks:           kafka.RequireAll,
	}

	log.Printf("✅ Connected to Redpanda (Kafka clone). Producer ready at %s.", broker)
	return kafkaWriter, nil
}

func resetKafkaWriter(reason string) {
	kafkaMutex.Lock()
	writer := kafkaWriter
	kafkaWriter = nil
	kafkaMutex.Unlock()

	if writer != nil {
		if err := writer.Close(); err != nil {
			log.Printf("Kafka writer close error during reset (%s): %v", reason, err)
		}
	}

	log.Printf("Kafka writer reset: %s", reason)
}

func waitForKafkaBroker(ctx context.Context, broker string) error {
	dialer := &kafka.Dialer{Timeout: kafkaDialTimeout}
	var lastErr error

	for {
		conn, err := dialer.DialContext(ctx, "tcp", broker)
		if err == nil {
			conn.Close()
			return nil
		}

		lastErr = err

		select {
		case <-ctx.Done():
			lastErr = ctx.Err()
			return fmt.Errorf("broker %s not ready: %w", broker, lastErr)
		case <-time.After(kafkaBrokerPollInterval):
		}
	}
}

func isConsumerCrashed(sessionID, service string) bool {
	sessionID = normalizeSessionID(sessionID)

	consumerStates.RLock()
	sessionState := getKafkaSessionSnapshotLocked(sessionID)
	defer consumerStates.RUnlock()

	switch service {
	case "inventory":
		return sessionState.InventoryCrashed
	case "email":
		return sessionState.EmailCrashed
	case "analytics":
		return sessionState.AnalyticsCrashed
	default:
		return false
	}
}

func hasConsumerStatus(sessionID, service, orderID string) bool {
	sessionID = normalizeSessionID(sessionID)

	consumerStates.RLock()
	sessionState := getKafkaSessionSnapshotLocked(sessionID)
	defer consumerStates.RUnlock()

	switch service {
	case "inventory":
		_, exists := sessionState.Inventory[orderID]
		return exists
	case "email":
		_, exists := sessionState.Email[orderID]
		return exists
	case "analytics":
		_, exists := sessionState.Analytics[orderID]
		return exists
	default:
		return false
	}
}

func processConsumerMessage(service string, msg EventMessage, delay time.Duration, status string) bool {
	if msg.SessionID == "" {
		return true
	}

	if hasConsumerStatus(msg.SessionID, service, msg.OrderID) {
		return true
	}

	time.Sleep(delay)

	if isConsumerCrashed(msg.SessionID, service) {
		return false
	}

	if hasConsumerStatus(msg.SessionID, service, msg.OrderID) {
		return true
	}

	setConsumerStatus(msg.SessionID, service, msg.OrderID, status)
	return true
}

func closeConsumerReader(r *kafka.Reader, groupID, reason string) {
	if err := r.Close(); err != nil {
		log.Printf("Consumer %s close error while %s: %v", groupID, reason, err)
		return
	}

	log.Printf("Consumer %s disconnected: %s", groupID, reason)
}

func setConsumerStatus(sessionID, service, orderID, status string) {
	sessionID = normalizeSessionID(sessionID)

	consumerStates.Lock()
	sessionState := ensureKafkaSessionStateLocked(sessionID)
	switch service {
	case "inventory":
		sessionState.Inventory[orderID] = status
	case "email":
		sessionState.Email[orderID] = status
	case "analytics":
		sessionState.Analytics[orderID] = status
	}
	consumerStates.Unlock()

	broadcastKafkaState(sessionID)
}

func broadcastKafkaState(sessionID string) {
	sessionID = normalizeSessionID(sessionID)
	state := GetKafkaConsumerState(sessionID)

	// Convert the map[string]interface{} state to map[string]any explicitly just to be safe
	data := make(map[string]any)
	data["session_id"] = sessionID
	for k, v := range state {
		data[k] = v
	}

	rabbitmq.BroadcastEvent(rabbitmq.BroadcastMessage{
		Type:      "kafka_state_update",
		Data:      data,
		Timestamp: time.Now().UnixMilli(),
	})
}

func ensureKafkaSessionConsumers(sessionID string) {
	sessionID = normalizeSessionID(sessionID)

	kafkaSessionConsumers.Lock()
	if kafkaSessionConsumers.started[sessionID] {
		kafkaSessionConsumers.Unlock()
		return
	}
	kafkaSessionConsumers.started[sessionID] = true
	kafkaSessionConsumers.Unlock()

	broker := getKafkaBroker()
	suffix := sanitizeGroupComponent(sessionID)

	go startConsumerGroup("inventory", broker, kafkaTopic, fmt.Sprintf("inventory_group_%s", suffix), func(msg EventMessage) bool {
		return processConsumerMessage("inventory", msg, 300*time.Millisecond, "Stock Deducted")
	})

	go startConsumerGroup("email", broker, kafkaTopic, fmt.Sprintf("email_group_%s", suffix), func(msg EventMessage) bool {
		return processConsumerMessage("email", msg, 500*time.Millisecond, "Receipt Sent")
	})

	go startConsumerGroup("analytics", broker, kafkaTopic, fmt.Sprintf("analytics_group_%s", suffix), func(msg EventMessage) bool {
		return processConsumerMessage("analytics", msg, 100*time.Millisecond, "Dashboard Updated")
	})

	log.Printf("Started session-scoped Kafka consumers for session %s", sessionID)
}

func normalizeSessionID(sessionID string) string {
	trimmed := strings.TrimSpace(sessionID)
	if trimmed == "" {
		return "default"
	}
	return trimmed
}

func sanitizeGroupComponent(raw string) string {
	raw = normalizeSessionID(raw)
	out := strings.Builder{}
	for _, r := range raw {
		if unicode.IsLetter(r) || unicode.IsDigit(r) || r == '-' || r == '_' {
			out.WriteRune(r)
			continue
		}
		out.WriteRune('-')
	}

	clean := out.String()
	if clean == "" {
		return "default"
	}

	if len(clean) > 48 {
		return clean[:48]
	}

	return clean
}

func ensureKafkaSessionStateLocked(sessionID string) *kafkaSessionState {
	sessionID = normalizeSessionID(sessionID)
	if state, exists := consumerStates.Sessions[sessionID]; exists {
		return state
	}

	state := &kafkaSessionState{
		Inventory: make(map[string]string),
		Email:     make(map[string]string),
		Analytics: make(map[string]string),
	}
	consumerStates.Sessions[sessionID] = state
	return state
}

func getKafkaSessionSnapshotLocked(sessionID string) *kafkaSessionState {
	sessionID = normalizeSessionID(sessionID)
	if state, exists := consumerStates.Sessions[sessionID]; exists {
		return state
	}

	return &kafkaSessionState{
		Inventory: make(map[string]string),
		Email:     make(map[string]string),
		Analytics: make(map[string]string),
	}
}
