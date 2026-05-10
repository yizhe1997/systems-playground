package main

import (
	"context"
	"encoding/json"
	"log"
	"strings"
	"time"
)

// AlertJob represents a single alert delivery task
type AlertJob struct {
	UserEmail   string `json:"userEmail"`
	ChannelType string `json:"channelType"` // "telegram", "discord", "webhook"
	Destination string `json:"destination"`
	Message     string `json:"message"`
	TriggerType string `json:"triggerType"` // "test", "draft", "filled", "closed", "invalidated"
	CreatedAt   int64  `json:"createdAt"`
}

func startAlertWorker() {
	if rdb == nil {
		log.Println("⚠️ Alert worker not started (redis unavailable)")
		return
	}

	go func() {
		for {
			result, err := rdb.BLPop(context.Background(), 0, alertQueueKey).Result()
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

			if err := processAlertJob(context.Background(), job); err != nil {
				log.Printf("Alert worker failed for %s:%s (trigger=%s): %v", job.UserEmail, job.ChannelType, job.TriggerType, err)
				// Don't retry; log and continue (optional: implement dead-letter queue later)
			} else {
				log.Printf("Alert delivered to %s via %s (trigger=%s)", job.UserEmail, job.ChannelType, job.TriggerType)
			}
		}
	}()

	log.Println("✅ Alert worker started")
}

func processAlertJob(ctx context.Context, job AlertJob) error {
	// Parse the JSON payload string back into a map
	var payload map[string]interface{}
	if err := json.Unmarshal([]byte(job.Message), &payload); err != nil {
		return err
	}

	switch job.ChannelType {
	case "telegram":
		return sendTelegramMessage(job.Destination, payload)
	case "discord":
		return sendDiscordWebhook(job.Destination, payload)
	case "webhook":
		return sendGenericWebhookPayload(job.Destination, payload)
	default:
		return nil
	}
}
