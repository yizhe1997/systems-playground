package events

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/segmentio/kafka-go"

	"github.com/yizhe1997/systems-playground/projects/gold-futures-copilot/backend/pkg/config"
)

type Broker struct {
	Brokers []string
	writer  *kafka.Writer
}

func NewBroker(cfg config.Config) *Broker {
	writer := &kafka.Writer{
		Addr:         kafka.TCP(cfg.RedpandaBrokers...),
		RequiredAcks: kafka.RequireOne,
		Balancer:     &kafka.LeastBytes{},
		Async:        false,
	}
	return &Broker{
		Brokers: cfg.RedpandaBrokers,
		writer:  writer,
	}
}

func (b *Broker) PublishJSON(ctx context.Context, topic string, key string, payload any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal event payload: %w", err)
	}

	msg := kafka.Message{
		Topic: topic,
		Key:   []byte(key),
		Value: body,
		Time:  time.Now().UTC(),
	}
	if err := b.writer.WriteMessages(ctx, msg); err != nil {
		return fmt.Errorf("publish to topic %q: %w", topic, err)
	}
	return nil
}

func (b *Broker) NewReader(topic, groupID string) *kafka.Reader {
	return kafka.NewReader(kafka.ReaderConfig{
		Brokers: b.Brokers,
		Topic:   topic,
		GroupID: groupID,
	})
}

func (b *Broker) Close() {
	if b.writer != nil {
		_ = b.writer.Close()
	}
}
