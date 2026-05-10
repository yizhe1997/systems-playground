package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

const alertTestRateLimitTTL = 60 * time.Second

func alertTestRateLimitKey(email, channel string) string {
	return fmt.Sprintf("copilot:alert-test:%s:%s", email, channel)
}

func getAlertChannels(c *fiber.Ctx) error {
	userEmail := strings.TrimSpace(c.Query("userEmail"))
	if userEmail == "" {
		return jsonError(c, fiber.StatusBadRequest, "userEmail is required")
	}

	channels, err := alertsRepo.ListAlertChannels(context.Background(), userEmail)
	if err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to load alert channels", err)
	}

	return c.JSON(fiber.Map{"channels": channels})
}

func saveAlertChannel(c *fiber.Ctx) error {
	var req saveAlertChannelRequest
	if err := parseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}

	req.UserEmail = strings.TrimSpace(req.UserEmail)
	req.Channel = strings.TrimSpace(strings.ToLower(req.Channel))
	req.Destination = strings.TrimSpace(req.Destination)

	if req.UserEmail == "" {
		return jsonError(c, fiber.StatusBadRequest, "userEmail is required")
	}
	if req.Channel != "telegram" && req.Channel != "discord" && req.Channel != "webhook" {
		return jsonError(c, fiber.StatusBadRequest, "channel must be telegram, discord, or webhook")
	}

	if err := alertsRepo.UpsertAlertChannel(context.Background(), req.UserEmail, req); err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to save alert channel", err)
	}

	return c.JSON(fiber.Map{"status": "saved"})
}

func testAlertChannel(c *fiber.Ctx) error {
	var req testAlertChannelRequest
	if err := parseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}

	req.UserEmail = strings.TrimSpace(req.UserEmail)
	req.Channel = strings.TrimSpace(strings.ToLower(req.Channel))
	req.Destination = strings.TrimSpace(req.Destination)

	if req.UserEmail == "" {
		return jsonError(c, fiber.StatusBadRequest, "userEmail is required")
	}
	if req.Channel != "telegram" && req.Channel != "discord" && req.Channel != "webhook" {
		return jsonError(c, fiber.StatusBadRequest, "channel must be telegram, discord, or webhook")
	}
	if req.Destination == "" {
		return jsonError(c, fiber.StatusBadRequest, "destination is required")
	}

	// Rate limit: 1 test per 60s per user+channel
	if rdb != nil {
		key := alertTestRateLimitKey(req.UserEmail, req.Channel)
		set, err := rdb.SetNX(context.Background(), key, 1, alertTestRateLimitTTL).Result()
		if err == nil && !set {
			return jsonError(c, fiber.StatusTooManyRequests, "Please wait 60 seconds before sending another test")
		}
	}

	// Build test alert with sample trade data
	payload := buildAlertPayload(
		"test",  // status
		"test",  // trigger
		"ES",    // symbol
		"buy",   // side
		5234.50, // entry
		5220.00, // stopLoss
		5250.00, // takeProfit
		150.00,  // risk
		"https://app.futures-copilot.com/playground/trades/1", // trackingLink
	)

	var sendErr error
	switch req.Channel {
	case "telegram":
		sendErr = sendTelegramMessage(req.Destination, payload)
	case "discord":
		sendErr = sendDiscordWebhook(req.Destination, payload)
	case "webhook":
		sendErr = sendGenericWebhookPayload(req.Destination, payload)
	}

	if sendErr != nil {
		// Clear rate limit key so they can retry on a genuine error
		if rdb != nil {
			_ = rdb.Del(context.Background(), alertTestRateLimitKey(req.UserEmail, req.Channel))
		}
		return logAndJSONError(c, fiber.StatusBadGateway, "Failed to deliver test message: "+sendErr.Error(), sendErr)
	}

	return c.JSON(fiber.Map{"status": "sent"})
}

func sendTelegramMessage(destination string, payload map[string]interface{}) error {
	token, chatID, err := resolveTelegramTarget(destination)
	if err != nil {
		return err
	}

	// Extract trade data from payload
	symbol, _ := payload["symbol"].(string)
	side, _ := payload["side"].(string)
	entry, _ := payload["entry"].(float64)
	stopLoss, _ := payload["stop_loss"].(float64)
	takeProfit, _ := payload["take_profit"].(float64)
	risk, _ := payload["risk"].(float64)
	trackingLink, _ := payload["tracking_link"].(string)
	status, _ := payload["status"].(string)

	// Build formatted text message with trade details and tracking link
	text := "<b>Futures Copilot Trade Alert</b>\n\n"
	text += fmt.Sprintf("<b>Symbol:</b> %s\n", escapeHTML(symbol))
	text += fmt.Sprintf("<b>Side:</b> %s\n", escapeHTML(strings.ToUpper(side)))
	text += fmt.Sprintf("<b>Entry:</b> %.2f\n", entry)
	text += fmt.Sprintf("<b>Stop Loss:</b> %.2f\n", stopLoss)
	text += fmt.Sprintf("<b>Take Profit:</b> %.2f\n", takeProfit)
	text += fmt.Sprintf("<b>Risk:</b> %.2f\n", risk)
	text += fmt.Sprintf("<b>Status:</b> %s\n\n", escapeHTML(status))

	if trackingLink != "" {
		text += fmt.Sprintf("<a href=\"%s\">View AI Grading</a>", escapeHTML(trackingLink))
	}

	telegramPayload := map[string]interface{}{
		"chat_id":    chatID,
		"text":       text,
		"parse_mode": "HTML",
	}
	body, _ := json.Marshal(telegramPayload)

	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", token)
	resp, err := http.Post(url, "application/json", bytes.NewReader(body)) //nolint:noctx
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("telegram API returned %d", resp.StatusCode)
	}
	return nil
}

func escapeHTML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, "\"", "&quot;")
	return s
}

func resolveTelegramTarget(destination string) (token string, chatID string, err error) {
	trimmed := strings.TrimSpace(destination)
	if trimmed == "" {
		return "", "", fmt.Errorf("telegram destination is required")
	}

	// 1) Direct chat-id format, e.g. -5260717479 (uses env token)
	if !strings.HasPrefix(trimmed, "http://") && !strings.HasPrefix(trimmed, "https://") {
		token = strings.TrimSpace(os.Getenv("TELEGRAM_BOT_TOKEN"))
		if token == "" {
			return "", "", fmt.Errorf("TELEGRAM_BOT_TOKEN is not configured")
		}
		return token, trimmed, nil
	}

	// 2) URL-based format (supports /sendMessage and /setWebhook?url=...)
	u, parseErr := url.Parse(trimmed)
	if parseErr != nil {
		return "", "", fmt.Errorf("invalid telegram URL")
	}

	pathParts := strings.Split(strings.Trim(u.Path, "/"), "/")
	if len(pathParts) < 2 {
		return "", "", fmt.Errorf("invalid telegram URL path")
	}

	botPart := pathParts[0]
	if !strings.HasPrefix(botPart, "bot") || len(botPart) <= 3 {
		return "", "", fmt.Errorf("invalid telegram bot token in URL")
	}
	token = strings.TrimPrefix(botPart, "bot")

	endpoint := strings.ToLower(pathParts[1])
	query := u.Query()

	if endpoint == "sendmessage" {
		chatID = strings.TrimSpace(query.Get("chat_id"))
		if chatID == "" {
			chatID = strings.TrimSpace(query.Get("url"))
		}
	}

	if endpoint == "setwebhook" {
		// Compatibility with the saved format requested by user:
		// https://api.telegram.org/bot{token}/setWebhook?url={channelid}
		chatID = strings.TrimSpace(query.Get("url"))
	}

	if chatID == "" {
		return "", "", fmt.Errorf("telegram destination URL must include chat target")
	}

	return token, chatID, nil
}

func sendDiscordWebhook(webhookURL string, payload map[string]interface{}) error {
	status, _ := payload["status"].(string)
	symbol, _ := payload["symbol"].(string)
	side, _ := payload["side"].(string)
	entry, _ := payload["entry"].(float64)
	stopLoss, _ := payload["stop_loss"].(float64)
	takeProfit, _ := payload["take_profit"].(float64)
	risk, _ := payload["risk"].(float64)
	trackingLink, _ := payload["tracking_link"].(string)

	// Determine embed color based on status
	color := 0x3498db // Blue for test
	if status == "live" {
		color = 0xf39c12 // Amber for live
	} else if status == "error" {
		color = 0xe74c3c // Red for error
	}

	// Build embed fields with trade details
	fields := []map[string]interface{}{
		{
			"name":   "Symbol",
			"value":  symbol,
			"inline": true,
		},
		{
			"name":   "Side",
			"value":  strings.ToUpper(side),
			"inline": true,
		},
		{
			"name":   "Entry",
			"value":  fmt.Sprintf("%.2f", entry),
			"inline": true,
		},
		{
			"name":   "Stop Loss",
			"value":  fmt.Sprintf("%.2f", stopLoss),
			"inline": true,
		},
		{
			"name":   "Take Profit",
			"value":  fmt.Sprintf("%.2f", takeProfit),
			"inline": true,
		},
		{
			"name":   "Risk",
			"value":  fmt.Sprintf("%.2f", risk),
			"inline": true,
		},
		{
			"name":   "Status",
			"value":  strings.ToUpper(status),
			"inline": true,
		},
	}

	// Build embed description with tracking link
	description := ""
	if trackingLink != "" {
		description = fmt.Sprintf("[View AI Grading](%s)", trackingLink)
	}

	embed := map[string]interface{}{
		"title":       "Futures Copilot Trade Alert",
		"description": description,
		"color":       color,
		"fields":      fields,
		"footer": map[string]interface{}{
			"text": "Futures Copilot Alert System",
		},
	}

	discordPayload := map[string]interface{}{
		"embeds": []map[string]interface{}{embed},
	}
	body, _ := json.Marshal(discordPayload)

	resp, err := http.Post(webhookURL, "application/json", bytes.NewReader(body)) //nolint:noctx
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("discord webhook returned %d", resp.StatusCode)
	}
	return nil
}

func sendGenericWebhookPayload(webhookURL string, payload map[string]interface{}) error {
	if _, ok := payload["timestamp"]; !ok {
		payload["timestamp"] = time.Now().UTC().Format(time.RFC3339)
	}
	body, _ := json.Marshal(payload)

	resp, err := http.Post(webhookURL, "application/json", bytes.NewReader(body)) //nolint:noctx
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("webhook returned %d", resp.StatusCode)
	}
	return nil
}

func buildAlertPayload(status, trigger, symbol, side string, entry, stopLoss, takeProfit, risk float64, trackingLink string) map[string]interface{} {
	payload := map[string]interface{}{
		"status":        status,
		"symbol":        symbol,
		"side":          side,
		"entry":         entry,
		"stop_loss":     stopLoss,
		"take_profit":   takeProfit,
		"risk":          risk,
		"tracking_link": trackingLink,
		"timestamp":     time.Now().UTC().Format(time.RFC3339),
	}

	return payload
}

// triggerAlerts enqueues alerts for all subscribers subscribed to a given trigger type
func triggerAlerts(ctx context.Context, triggerType, tradeSymbol, tradeID, side string, entry, stopLoss, takeProfit, risk float64) error {
	// Map trigger types to required notification flags
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
		return nil // Unknown trigger type, skip
	}

	// Enqueue alerts with full trade details
	if err := enqueueAlertsForTrigger(ctx, notifyColumn, triggerType, tradeSymbol, tradeID, side, entry, stopLoss, takeProfit, risk); err != nil {
		return err
	}

	return nil
}

// enqueueAlertsForTrigger queries subscribers for a trigger and enqueues alert jobs
func enqueueAlertsForTrigger(ctx context.Context, notifyColumn, triggerType, tradeSymbol, tradeID, side string, entry, stopLoss, takeProfit, risk float64) error {
	subscribers, err := alertsRepo.GetSubscribersForTrigger(ctx, notifyColumn)
	if err != nil {
		return err
	}

	// Build tracking link to trade detail panel
	trackingLink := fmt.Sprintf("https://app.futures-copilot.com/playground/trades/%s", tradeID)

	for _, sub := range subscribers {
		payload := buildAlertPayload("live", triggerType, tradeSymbol, side, entry, stopLoss, takeProfit, risk, trackingLink)
		payloadBytes, _ := json.Marshal(payload)
		payloadText := string(payloadBytes)

		job := AlertJob{
			UserEmail:   sub.UserEmail,
			ChannelType: sub.Channel,
			Destination: sub.Destination,
			Message:     payloadText,
			TriggerType: "", // Will be set based on notifyColumn
			CreatedAt:   time.Now().Unix(),
		}

		// Map notifyColumn to triggerType
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

		// Marshal job to JSON and enqueue
		jobJSON, err := json.Marshal(job)
		if err != nil {
			continue // Skip on marshal error
		}

		if err := enqueueAlertJob(ctx, jobJSON); err != nil {
			log.Printf("Failed to enqueue alert job for %s:%s: %v", sub.UserEmail, sub.Channel, err)
		}
	}

	return nil
}
