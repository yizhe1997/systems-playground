package contact

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/mail"
	"net/smtp"
	"net/url"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	core "futures-copilot-mvp/internal/core"

	"github.com/gofiber/fiber/v2"
)

type ContactRequest struct {
	Name           string `json:"name"`
	Email          string `json:"email"`
	Subject        string `json:"subject"`
	Message        string `json:"message"`
	Company        string `json:"company"`
	RecaptchaToken string `json:"recaptchaToken"`
}

type recaptchaVerifyResponse struct {
	Success    bool     `json:"success"`
	Action     string   `json:"action"`
	Score      float64  `json:"score"`
	Hostname   string   `json:"hostname"`
	ErrorCodes []string `json:"error-codes"`
}

type rateLimitEntry struct {
	Count   int
	ResetAt time.Time
}

var ipRateLimiter = struct {
	mu      sync.Mutex
	entries map[string]rateLimitEntry
}{
	entries: map[string]rateLimitEntry{},
}

const contactRecaptchaAction = "contact_submit"
const maxContactMessageWords = 300

func PostContact(c *fiber.Ctx) error {
	var req ContactRequest
	if err := core.ParseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}

	name := cleanHeaderValue(cleanText(req.Name, 120))
	email := strings.ToLower(cleanText(req.Email, 320))
	subject := cleanHeaderValue(cleanText(req.Subject, 160))
	message := cleanText(req.Message, 4000)
	honeypot := cleanText(req.Company, 200)
	recaptchaToken := cleanText(req.RecaptchaToken, 4096)

	if honeypot != "" {
		return c.JSON(fiber.Map{"message": "Thanks for your message."})
	}

	if len(name) < 2 || len(message) == 0 || countWords(message) > maxContactMessageWords || !isValidEmail(email) {
		return core.JSONError(c, fiber.StatusBadRequest, fmt.Sprintf("Please provide a valid name, email, and message (1-%d words).", maxContactMessageWords))
	}

	ip := getClientIP(c)
	allowed, retryAfterSeconds := enforceRateLimit(ip)
	if !allowed {
		c.Set("Retry-After", strconv.Itoa(retryAfterSeconds))
		return core.JSONError(c, fiber.StatusTooManyRequests, fmt.Sprintf("Too many messages from this IP. Please wait %ds and try again.", retryAfterSeconds))
	}

	if recaptchaSecret := strings.TrimSpace(os.Getenv("RECAPTCHA_SECRET_KEY")); recaptchaSecret != "" {
		if recaptchaToken == "" {
			return core.JSONError(c, fiber.StatusBadRequest, "reCAPTCHA token is missing.")
		}

		expectedActions := []string{contactRecaptchaAction}

		if err := verifyRecaptcha(recaptchaSecret, recaptchaToken, ip, expectedActions); err != nil {
			if !isProductionEnv() {
				fmt.Printf("reCAPTCHA validation failed: %v\n", err)
			}
			return core.JSONError(c, fiber.StatusBadRequest, "reCAPTCHA validation failed. Please try again.")
		}
	}

	missing := missingSMTPConfig()
	if len(missing) > 0 {
		return core.JSONError(c, fiber.StatusServiceUnavailable, "Contact form is not configured yet. Please try again later.")
	}

	emailSubject := subject
	if emailSubject == "" {
		emailSubject = "New contact message"
	}

	if err := sendSMTPEmail(emailSubject, message, email, name); err != nil {
		return core.LogAndJSONError(c, fiber.StatusBadGateway, "Unable to send your message right now. Please try again later.", err)
	}

	return c.JSON(fiber.Map{"message": "Message sent successfully!"})
}

func cleanText(value string, maxLength int) string {
	trimmed := strings.TrimSpace(value)
	if len(trimmed) <= maxLength {
		return trimmed
	}
	return trimmed[:maxLength]
}

func cleanHeaderValue(value string) string {
	value = strings.Map(func(r rune) rune {
		if r == '\r' || r == '\n' || r == '\t' {
			return ' '
		}
		if r < 32 || r == 127 {
			return -1
		}
		return r
	}, value)
	return strings.TrimSpace(strings.Join(strings.Fields(value), " "))
}

func countWords(value string) int {
	if strings.TrimSpace(value) == "" {
		return 0
	}
	return len(strings.Fields(value))
}

func isValidEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

func getClientIP(c *fiber.Ctx) string {
	if cfIP := strings.TrimSpace(c.Get("CF-Connecting-IP")); cfIP != "" {
		return cfIP
	}
	if realIP := strings.TrimSpace(c.Get("X-Real-IP")); realIP != "" {
		return realIP
	}
	if forwarded := strings.TrimSpace(c.Get("X-Forwarded-For")); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		if len(parts) > 0 {
			ip := strings.TrimSpace(parts[0])
			if ip != "" {
				return ip
			}
		}
	}

	if ip := strings.TrimSpace(c.IP()); ip != "" {
		return ip
	}

	return ""
}

func parseIntEnv(key string, fallback int) int {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func parseFloatEnv(key string, fallback float64) float64 {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return fallback
	}
	return parsed
}

func enforceRateLimit(ip string) (bool, int) {
	windowMs := parseIntEnv("CONTACT_RATE_LIMIT_WINDOW_MS", 10*60*1000)
	maxRequests := parseIntEnv("CONTACT_RATE_LIMIT_MAX_REQUESTS", 5)
	now := time.Now()

	ipRateLimiter.mu.Lock()
	defer ipRateLimiter.mu.Unlock()

	for key, entry := range ipRateLimiter.entries {
		if !entry.ResetAt.After(now) {
			delete(ipRateLimiter.entries, key)
		}
	}

	entry, exists := ipRateLimiter.entries[ip]
	if !exists || !entry.ResetAt.After(now) {
		ipRateLimiter.entries[ip] = rateLimitEntry{
			Count:   1,
			ResetAt: now.Add(time.Duration(windowMs) * time.Millisecond),
		}
		return true, 0
	}

	if entry.Count >= maxRequests {
		retry := int(entry.ResetAt.Sub(now).Seconds())
		if retry < 1 {
			retry = 1
		}
		return false, retry
	}

	entry.Count++
	ipRateLimiter.entries[ip] = entry
	return true, 0
}

func verifyRecaptcha(secret, token, ip string, expectedActions []string) error {
	form := url.Values{}
	form.Set("secret", secret)
	form.Set("response", token)
	if parsed := net.ParseIP(strings.TrimSpace(ip)); parsed != nil {
		form.Set("remoteip", parsed.String())
	}

	resp, err := http.Post(
		"https://www.google.com/recaptcha/api/siteverify",
		"application/x-www-form-urlencoded",
		bytes.NewBufferString(form.Encode()),
	)
	if err != nil {
		return fmt.Errorf("reCAPTCHA verify request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("reCAPTCHA verify returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("reCAPTCHA verify read failed: %w", err)
	}

	var verification recaptchaVerifyResponse
	if err := json.Unmarshal(body, &verification); err != nil {
		return fmt.Errorf("reCAPTCHA verify decode failed: %w", err)
	}

	if !verification.Success {
		return fmt.Errorf("verification_failed action=%s score=%0.2f hostname=%s errors=%v", verification.Action, verification.Score, verification.Hostname, verification.ErrorCodes)
	}

	actionMatched := false
	for _, expected := range expectedActions {
		if verification.Action == expected {
			actionMatched = true
			break
		}
	}
	if !actionMatched {
		return fmt.Errorf("action_mismatch action=%s expected=%v", verification.Action, expectedActions)
	}

	minScore := parseFloatEnv("RECAPTCHA_MIN_SCORE", 0.5)
	if !isProductionEnv() && minScore > 0.1 {
		minScore = 0.1
	}
	if verification.Score < minScore {
		return fmt.Errorf("score_too_low score=%0.2f min=%0.2f", verification.Score, minScore)
	}

	expectedHostname := strings.TrimSpace(os.Getenv("RECAPTCHA_EXPECTED_HOSTNAME"))
	if expectedHostname != "" && verification.Hostname != "" && !isAllowedRecaptchaHostname(verification.Hostname, expectedHostname) {
		return fmt.Errorf("hostname_mismatch hostname=%s expected=%s", verification.Hostname, expectedHostname)
	}

	return nil
}

func envValue(keys ...string) string {
	for _, key := range keys {
		value := strings.TrimSpace(os.Getenv(key))
		if value != "" {
			return value
		}
	}
	return ""
}

func missingSMTPConfig() []string {
	missing := []string{}
	if envValue("SMTP_HOST", "CONTACT_SMTP_HOST") == "" {
		missing = append(missing, "SMTP_HOST")
	}
	if envValue("SMTP_PORT", "CONTACT_SMTP_PORT") == "" {
		missing = append(missing, "SMTP_PORT")
	}
	if envValue("SMTP_EMAIL", "CONTACT_SMTP_USER") == "" {
		missing = append(missing, "SMTP_EMAIL")
	}
	if envValue("SMTP_PASSWORD", "CONTACT_SMTP_PASS") == "" {
		missing = append(missing, "SMTP_PASSWORD")
	}
	if envValue("SMTP_FROM", "CONTACT_SMTP_FROM") == "" {
		missing = append(missing, "SMTP_FROM")
	}
	if envValue("CONTACT_INBOX_EMAIL") == "" {
		missing = append(missing, "CONTACT_INBOX_EMAIL")
	}
	return missing
}

func sendSMTPEmail(subject, body, replyEmail, replyName string) error {
	smtpHost := envValue("SMTP_HOST", "CONTACT_SMTP_HOST")
	smtpPort := envValue("SMTP_PORT", "CONTACT_SMTP_PORT")
	smtpEmail := envValue("SMTP_EMAIL", "CONTACT_SMTP_USER")
	smtpPassword := envValue("SMTP_PASSWORD", "CONTACT_SMTP_PASS")
	smtpFrom := envValue("SMTP_FROM", "CONTACT_SMTP_FROM")
	inboxEmail := envValue("CONTACT_INBOX_EMAIL")

	auth := smtp.PlainAuth("", smtpEmail, smtpPassword, smtpHost)

	replyTo := mail.Address{Address: replyEmail}
	if replyName != "" {
		replyTo.Name = replyName
	}

	msg := []byte(
		"From: " + smtpFrom + "\r\n" +
			"To: " + inboxEmail + "\r\n" +
			"Reply-To: " + replyTo.String() + "\r\n" +
			"Subject: " + subject + "\r\n" +
			"MIME-version: 1.0;\r\n" +
			"Content-Type: text/plain; charset=\"UTF-8\";\r\n\r\n" +
			body,
	)

	if err := smtp.SendMail(smtpHost+":"+smtpPort, auth, smtpEmail, []string{inboxEmail}, msg); err != nil {
		return fmt.Errorf("smtp send failed: %w", err)
	}

	return nil
}

func isProductionEnv() bool {
	for _, key := range []string{"APP_ENV", "GO_ENV", "NODE_ENV"} {
		if strings.EqualFold(strings.TrimSpace(os.Getenv(key)), "production") {
			return true
		}
	}
	return false
}

func isAllowedRecaptchaHostname(actual, expectedRaw string) bool {
	actualHost := strings.TrimSpace(strings.ToLower(actual))
	if actualHost == "" {
		return false
	}

	for _, expected := range strings.Split(expectedRaw, ",") {
		host := strings.TrimSpace(strings.ToLower(expected))
		if host != "" && actualHost == host {
			return true
		}
	}

	if !isProductionEnv() {
		return actualHost == "localhost" || actualHost == "127.0.0.1"
	}

	return false
}
