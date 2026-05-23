package alerts

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	core "futures-copilot-mvp/internal/core"

	"github.com/gofiber/fiber/v2"
)

const AlertTestRateLimitTTL = 60 * time.Second

type Dependencies struct {
	RateLimitSetNX  func(ctx context.Context, key string, value interface{}, expiration time.Duration) (bool, error)
	RateLimitDel    func(ctx context.Context, key string) error
	EnqueueAlertJob func(ctx context.Context, jobPayload []byte) error
}

type AlertJob struct {
	UserEmail   string `json:"userEmail"`
	ChannelType string `json:"channelType"`
	Destination string `json:"destination"`
	Message     string `json:"message"`
	TriggerType string `json:"triggerType"`
	CreatedAt   int64  `json:"createdAt"`
}

func AlertTestRateLimitKey(email, channel string) string {
	return fmt.Sprintf("copilot:alert-test:%s:%s", email, channel)
}

func GetAlertChannels(c *fiber.Ctx, repo Repository) error {
	userEmail := strings.TrimSpace(c.Query("userEmail"))
	if userEmail == "" {
		return core.JSONError(c, fiber.StatusBadRequest, "userEmail is required")
	}

	channels, err := repo.ListAlertChannels(context.Background(), userEmail)
	if err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to load alert channels", err)
	}

	return c.JSON(fiber.Map{"channels": channels})
}

func SaveAlertChannel(c *fiber.Ctx, repo Repository) error {
	var req core.SaveAlertChannelRequest
	if err := core.ParseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}

	req.UserEmail = strings.TrimSpace(req.UserEmail)
	req.Channel = strings.TrimSpace(strings.ToLower(req.Channel))
	req.Destination = strings.TrimSpace(req.Destination)

	if req.UserEmail == "" {
		return core.JSONError(c, fiber.StatusBadRequest, "userEmail is required")
	}
	if req.Channel != "telegram" && req.Channel != "discord" && req.Channel != "webhook" {
		return core.JSONError(c, fiber.StatusBadRequest, "channel must be telegram, discord, or webhook")
	}

	if err := repo.UpsertAlertChannel(context.Background(), req.UserEmail, req); err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to save alert channel", err)
	}

	return c.JSON(fiber.Map{"status": "saved"})
}

func TestAlertChannel(c *fiber.Ctx, repo Repository, deps Dependencies) error {
	var req core.TestAlertChannelRequest
	if err := core.ParseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}

	req.UserEmail = strings.TrimSpace(req.UserEmail)
	req.Channel = strings.TrimSpace(strings.ToLower(req.Channel))
	req.Destination = strings.TrimSpace(req.Destination)

	if req.UserEmail == "" {
		return core.JSONError(c, fiber.StatusBadRequest, "userEmail is required")
	}
	if req.Channel != "telegram" && req.Channel != "discord" && req.Channel != "webhook" {
		return core.JSONError(c, fiber.StatusBadRequest, "channel must be telegram, discord, or webhook")
	}
	if req.Destination == "" {
		return core.JSONError(c, fiber.StatusBadRequest, "destination is required")
	}

	if deps.RateLimitSetNX != nil {
		key := AlertTestRateLimitKey(req.UserEmail, req.Channel)
		set, err := deps.RateLimitSetNX(context.Background(), key, 1, AlertTestRateLimitTTL)
		if err == nil && !set {
			return core.JSONError(c, fiber.StatusTooManyRequests, "Please wait 60 seconds before sending another test")
		}
	}

	payload := BuildAlertPayload(
		"test", "test", "ES", "buy", 5234.50, 5220.00, 5250.00, 150.00,
		"https://app.futures-copilot.com/playground/trades/1",
	)

	var sendErr error
	switch req.Channel {
	case "telegram":
		sendErr = SendTelegramMessage(req.Destination, payload)
	case "discord":
		sendErr = SendDiscordWebhook(req.Destination, payload)
	case "webhook":
		sendErr = SendGenericWebhookPayload(req.Destination, payload)
	}

	if sendErr != nil {
		if deps.RateLimitDel != nil {
			_ = deps.RateLimitDel(context.Background(), AlertTestRateLimitKey(req.UserEmail, req.Channel))
		}
		return core.LogAndJSONError(c, fiber.StatusBadGateway, "Failed to deliver test message: "+sendErr.Error(), sendErr)
	}

	return c.JSON(fiber.Map{"status": "sent"})
}

func TriggerAlerts(ctx context.Context, repo Repository, deps Dependencies, triggerType, tradeSymbol, tradeID, side string, entry, stopLoss, takeProfit, risk float64) error {
	var notifyColumn string

	switch triggerType {
	case "draft":
		notifyColumn = "notify_new_draft"
	case "filled":
		notifyColumn = "notify_limit_filled"
	case "closed":
		notifyColumn = "notify_closed"
	case "invalidated":
		notifyColumn = "notify_invalidated"
	default:
		return nil
	}

	return enqueueAlertsForTrigger(ctx, repo, deps, notifyColumn, triggerType, tradeSymbol, tradeID, side, entry, stopLoss, takeProfit, risk)
}

func enqueueAlertsForTrigger(ctx context.Context, repo Repository, deps Dependencies, notifyColumn, triggerType, tradeSymbol, tradeID, side string, entry, stopLoss, takeProfit, risk float64) error {
	subscribers, err := repo.GetSubscribersForTrigger(ctx, notifyColumn)
	if err != nil {
		return err
	}

	trackingLink := fmt.Sprintf("https://app.futures-copilot.com/playground/trades/%s", tradeID)

	for _, sub := range subscribers {
		payload := BuildAlertPayload("live", triggerType, tradeSymbol, side, entry, stopLoss, takeProfit, risk, trackingLink)
		payloadBytes, _ := json.Marshal(payload)
		payloadText := string(payloadBytes)

		job := AlertJob{
			UserEmail:   sub.UserEmail,
			ChannelType: sub.Channel,
			Destination: sub.Destination,
			Message:     payloadText,
			TriggerType: "",
			CreatedAt:   time.Now().Unix(),
		}

		switch notifyColumn {
		case "notify_new_draft":
			job.TriggerType = "draft"
		case "notify_limit_filled":
			job.TriggerType = "filled"
		case "notify_closed":
			job.TriggerType = "closed"
		case "notify_invalidated":
			job.TriggerType = "invalidated"
		}

		jobJSON, err := json.Marshal(job)
		if err != nil {
			continue
		}

		if deps.EnqueueAlertJob != nil {
			if err := deps.EnqueueAlertJob(ctx, jobJSON); err != nil {
				log.Printf("Failed to enqueue alert job for %s:%s: %v", sub.UserEmail, sub.Channel, err)
			}
		}
	}

	return nil
}
