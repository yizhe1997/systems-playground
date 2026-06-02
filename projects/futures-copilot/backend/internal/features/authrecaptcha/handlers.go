package authrecaptcha

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"

	core "futures-copilot-mvp/internal/core"

	"github.com/gofiber/fiber/v2"
)

type verifyAuthRecaptchaRequest struct {
	RecaptchaToken string `json:"recaptchaToken"`
	Action         string `json:"action"`
}

type recaptchaVerifyResponse struct {
	Success    bool     `json:"success"`
	Action     string   `json:"action"`
	Score      float64  `json:"score"`
	Hostname   string   `json:"hostname"`
	ErrorCodes []string `json:"error-codes"`
}

var authRecaptchaExpectedActions = []string{"sign_in", "sign_up"}

func VerifyAuthRecaptcha(c *fiber.Ctx) error {
	var req verifyAuthRecaptchaRequest
	if err := core.ParseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}

	recaptchaSecret := strings.TrimSpace(os.Getenv("RECAPTCHA_SECRET_KEY"))
	if recaptchaSecret == "" {
		return core.JSONError(c, fiber.StatusServiceUnavailable, "reCAPTCHA is not configured.")
	}

	token := strings.TrimSpace(req.RecaptchaToken)
	if token == "" {
		return core.JSONError(c, fiber.StatusBadRequest, "reCAPTCHA token is missing.")
	}

	action := strings.TrimSpace(strings.ToLower(req.Action))
	if action == "" {
		return core.JSONError(c, fiber.StatusBadRequest, "reCAPTCHA action is missing.")
	}

	if !containsString(authRecaptchaExpectedActions, action) {
		return core.JSONError(c, fiber.StatusBadRequest, "Invalid reCAPTCHA action.")
	}

	ip := strings.TrimSpace(c.Get("X-Forwarded-For"))
	if ip == "" {
		ip = strings.TrimSpace(c.Get("X-Real-IP"))
	}
	if ip == "" {
		ip = strings.TrimSpace(c.IP())
	}

	if err := verifyRecaptcha(recaptchaSecret, token, ip, authRecaptchaExpectedActions); err != nil {
		return core.JSONError(c, fiber.StatusBadRequest, err.Error())
	}

	return c.JSON(fiber.Map{"status": "ok"})
}

func verifyRecaptcha(secret, token, ip string, expectedActions []string) error {
	form := url.Values{}
	form.Set("secret", secret)
	form.Set("response", token)
	if ip != "" {
		form.Set("remoteip", ip)
	}

	req, err := http.NewRequest(
		http.MethodPost,
		"https://www.google.com/recaptcha/api/siteverify",
		strings.NewReader(form.Encode()),
	)
	if err != nil {
		return fmt.Errorf("failed to build reCAPTCHA request")
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to verify reCAPTCHA")
	}
	defer resp.Body.Close()

	var verifyResp recaptchaVerifyResponse
	if err := json.NewDecoder(resp.Body).Decode(&verifyResp); err != nil {
		return fmt.Errorf("failed to decode reCAPTCHA response")
	}

	if !verifyResp.Success {
		return fmt.Errorf("reCAPTCHA verification failed")
	}

	action := strings.TrimSpace(strings.ToLower(verifyResp.Action))
	if len(expectedActions) > 0 && !containsString(expectedActions, action) {
		return fmt.Errorf("reCAPTCHA action mismatch")
	}

	if expectedHost := parseExpectedHostname(strings.TrimSpace(os.Getenv("RECAPTCHA_EXPECTED_HOSTNAME"))); expectedHost != "" {
		hostname := strings.TrimSpace(strings.ToLower(verifyResp.Hostname))
		if !isAllowedRecaptchaHostname(hostname, expectedHost) {
			return fmt.Errorf("reCAPTCHA hostname mismatch")
		}
	}

	minScore := parseMinScore(strings.TrimSpace(os.Getenv("RECAPTCHA_MIN_SCORE")), 0.5)
	if !isProductionEnv() && minScore > 0.1 {
		minScore = 0.1
	}
	if verifyResp.Score < minScore {
		return fmt.Errorf("reCAPTCHA score too low")
	}

	return nil
}

func parseMinScore(raw string, fallback float64) float64 {
	if raw == "" {
		return fallback
	}

	v, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		return fallback
	}

	if v < 0 {
		return 0
	}
	if v > 1 {
		return 1
	}

	return v
}

func parseExpectedHostname(raw string) string {
	if raw == "" {
		return ""
	}

	return strings.TrimSpace(strings.ToLower(raw))
}

func containsString(items []string, target string) bool {
	for _, item := range items {
		if strings.TrimSpace(strings.ToLower(item)) == strings.TrimSpace(strings.ToLower(target)) {
			return true
		}
	}
	return false
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
