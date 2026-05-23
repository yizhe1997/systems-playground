package alerts

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

func SendTelegramMessage(destination string, payload map[string]interface{}) error {
	token, chatID, err := resolveTelegramTarget(destination)
	if err != nil {
		return err
	}

	symbol, _ := payload["symbol"].(string)
	side, _ := payload["side"].(string)
	entry, _ := payload["entry"].(float64)
	stopLoss, _ := payload["stop_loss"].(float64)
	takeProfit, _ := payload["take_profit"].(float64)
	risk, _ := payload["risk"].(float64)
	trackingLink, _ := payload["tracking_link"].(string)
	status, _ := payload["status"].(string)

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

	apiURL := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", token)
	resp, err := http.Post(apiURL, "application/json", bytes.NewReader(body)) //nolint:noctx
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("telegram API returned %d", resp.StatusCode)
	}
	return nil
}

func SendDiscordWebhook(webhookURL string, payload map[string]interface{}) error {
	status, _ := payload["status"].(string)
	symbol, _ := payload["symbol"].(string)
	side, _ := payload["side"].(string)
	entry, _ := payload["entry"].(float64)
	stopLoss, _ := payload["stop_loss"].(float64)
	takeProfit, _ := payload["take_profit"].(float64)
	risk, _ := payload["risk"].(float64)
	trackingLink, _ := payload["tracking_link"].(string)

	color := 0x3498db
	if status == "live" {
		color = 0xf39c12
	} else if status == "error" {
		color = 0xe74c3c
	}

	fields := []map[string]interface{}{
		{"name": "Symbol", "value": symbol, "inline": true},
		{"name": "Side", "value": strings.ToUpper(side), "inline": true},
		{"name": "Entry", "value": fmt.Sprintf("%.2f", entry), "inline": true},
		{"name": "Stop Loss", "value": fmt.Sprintf("%.2f", stopLoss), "inline": true},
		{"name": "Take Profit", "value": fmt.Sprintf("%.2f", takeProfit), "inline": true},
		{"name": "Risk", "value": fmt.Sprintf("%.2f", risk), "inline": true},
		{"name": "Status", "value": strings.ToUpper(status), "inline": true},
	}

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

	discordPayload := map[string]interface{}{"embeds": []map[string]interface{}{embed}}
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

func SendGenericWebhookPayload(webhookURL string, payload map[string]interface{}) error {
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

func BuildAlertPayload(status, trigger, symbol, side string, entry, stopLoss, takeProfit, risk float64, trackingLink string) map[string]interface{} {
	return map[string]interface{}{
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

	if !strings.HasPrefix(trimmed, "http://") && !strings.HasPrefix(trimmed, "https://") {
		token = strings.TrimSpace(os.Getenv("TELEGRAM_BOT_TOKEN"))
		if token == "" {
			return "", "", fmt.Errorf("TELEGRAM_BOT_TOKEN is not configured")
		}
		return token, trimmed, nil
	}

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
		chatID = strings.TrimSpace(query.Get("url"))
	}

	if chatID == "" {
		return "", "", fmt.Errorf("telegram destination URL must include chat target")
	}

	return token, chatID, nil
}
