package alerts

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

const AlertQueueKey = "copilot:alerts:queue"

func EnqueueAlertJob(client *redis.Client, ctx context.Context, jobPayload []byte) error {
	if client == nil {
		return errors.New("redis is not initialized")
	}
	if len(jobPayload) == 0 {
		return errors.New("job payload is required")
	}

	return client.RPush(ctx, AlertQueueKey, string(jobPayload)).Err()
}

func StartWorker(client *redis.Client) {
	if client == nil {
		log.Println("⚠️ Alert worker not started (redis unavailable)")
		return
	}

	go func() {
		for {
			result, err := client.BLPop(context.Background(), 0, AlertQueueKey).Result()
			if err != nil {
				log.Printf("Alert worker BLPOP error: %v", err)
				time.Sleep(1 * time.Second)
				continue
			}
			if len(result) < 2 {
				continue
			}

			jobJSON := strings.TrimSpace(result[1])
			if jobJSON == "" {
				continue
			}

			var job AlertJob
			if err := json.Unmarshal([]byte(jobJSON), &job); err != nil {
				log.Printf("Alert worker failed to unmarshal job: %v", err)
				continue
			}

			if err := ProcessAlertJob(context.Background(), job); err != nil {
				log.Printf("Alert worker failed for %s:%s (trigger=%s): %v", job.UserEmail, job.ChannelType, job.TriggerType, err)
			} else {
				log.Printf("Alert delivered to %s via %s (trigger=%s)", job.UserEmail, job.ChannelType, job.TriggerType)
			}
		}
	}()

	log.Println("✅ Alert worker started")
}

func ProcessAlertJob(ctx context.Context, job AlertJob) error {
	_ = ctx

	var payload map[string]interface{}
	if err := json.Unmarshal([]byte(job.Message), &payload); err != nil {
		return err
	}

	switch job.ChannelType {
	case "telegram":
		return SendTelegramMessage(job.Destination, payload)
	case "discord":
		return SendDiscordWebhook(job.Destination, payload)
	case "webhook":
		return SendGenericWebhookPayload(job.Destination, payload)
	default:
		return nil
	}
}
