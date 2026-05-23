package app

import (
	"context"
	core "futures-copilot-mvp/internal/core"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestGetAIProviderConfigSuccessWithInjectedRepo(t *testing.T) {
	secret := configureInternalAPISecret(t)
	original := aiProviderConfigRepo
	aiProviderConfigRepo = mockAIProviderConfigRepo{
		getFn: func(context.Context) (core.AIProviderConfig, error) {
			return core.AIProviderConfig{
				ScrapeRulesProvider: "openrouter",
				ScrapeRulesModel:    "google/gemini-2.0-flash-001",
				CleanupTextProvider: "gemini",
				CleanupTextModel:    "gemini-2.0-flash",
				TimeoutMs:           15000,
			}, nil
		},
	}
	t.Cleanup(func() { aiProviderConfigRepo = original })

	app := newApp()
	req := httptest.NewRequest(http.MethodGet, "/api/copilot/ai/config", nil)
	addInternalRequestHeaders(req, secret, "ADMIN")
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	if res.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.StatusCode, http.StatusOK)
	}
}

func TestGetAIProviderConfigUnauthorizedWithoutInternalSecret(t *testing.T) {
	configureInternalAPISecret(t)
	app := newApp()

	req := httptest.NewRequest(http.MethodGet, "/api/copilot/ai/config", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusUnauthorized, "Unauthorized")
}

func TestUpdateAIProviderConfigForbiddenForNonAdminRole(t *testing.T) {
	secret := configureInternalAPISecret(t)
	app := newApp()

	req := httptest.NewRequest(http.MethodPut, "/api/copilot/ai/config", strings.NewReader(`{"features":[{"key":"accountRulesContextScrapeRules","provider":"openrouter","model":"google/gemini-2.0-flash-001"},{"key":"accountRulesContextCleanupText","provider":"gemini","model":"gemini-2.0-flash"}],"timeoutMs":15000}`))
	req.Header.Set("Content-Type", "application/json")
	addInternalRequestHeaders(req, secret, "ANON")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusForbidden, "Forbidden")
}

func TestUpdateAIProviderConfigInvalidPayload(t *testing.T) {
	secret := configureInternalAPISecret(t)
	app := newApp()
	req := httptest.NewRequest(http.MethodPut, "/api/copilot/ai/config", strings.NewReader(`{"features":[],"timeoutMs":15000}`))
	req.Header.Set("Content-Type", "application/json")
	addInternalRequestHeaders(req, secret, "ADMIN")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing features")
}

func TestScrapeAccountRulesForbiddenForNonAdminRole(t *testing.T) {
	secret := configureInternalAPISecret(t)
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/copilot/ai/scrape-account-rules", strings.NewReader(`{"urls":["https://example.com/rules"],"accountType":"TOPSTEP EVAL 50K"}`))
	req.Header.Set("Content-Type", "application/json")
	addInternalRequestHeaders(req, secret, "ANON")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusForbidden, "Forbidden")
}

func TestScrapeAccountRulesInvalidPayload(t *testing.T) {
	secret := configureInternalAPISecret(t)
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/copilot/ai/scrape-account-rules", strings.NewReader(`{"urls":[]}`))
	req.Header.Set("Content-Type", "application/json")
	addInternalRequestHeaders(req, secret, "ADMIN")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing urls")
}

func TestImproveAccountRulesInvalidPayload(t *testing.T) {
	secret := configureInternalAPISecret(t)
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/copilot/ai/improve-account-rules", strings.NewReader(`{"text":"","accountType":"TOPSTEP EVAL 50K"}`))
	req.Header.Set("Content-Type", "application/json")
	addInternalRequestHeaders(req, secret, "ADMIN")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing text")
}

func TestImproveAccountRulesProviderNotConfigured(t *testing.T) {
	secret := configureInternalAPISecret(t)

	original := aiProviderConfigRepo
	aiProviderConfigRepo = mockAIProviderConfigRepo{
		getFn: func(context.Context) (core.AIProviderConfig, error) {
			return core.AIProviderConfig{
				CleanupTextProvider: "mock",
				CleanupTextModel:    "mock-fast",
				TimeoutMs:           15000,
			}, nil
		},
	}
	t.Cleanup(func() { aiProviderConfigRepo = original })

	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/copilot/ai/improve-account-rules", strings.NewReader(`{"text":"daily loss limit 1500","accountType":"TOPSTEP EVAL 50K"}`))
	req.Header.Set("Content-Type", "application/json")
	addInternalRequestHeaders(req, secret, "ADMIN")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadGateway, "Failed to improve rules context")
}

func TestScrapeAccountRulesMissingAccountType(t *testing.T) {
	secret := configureInternalAPISecret(t)
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/copilot/ai/scrape-account-rules", strings.NewReader(`{"urls":["https://example.com/rules"]}`))
	req.Header.Set("Content-Type", "application/json")
	addInternalRequestHeaders(req, secret, "ADMIN")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing accountType")
}

func TestImproveAccountRulesMissingAccountType(t *testing.T) {
	secret := configureInternalAPISecret(t)
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/copilot/ai/improve-account-rules", strings.NewReader(`{"text":"daily loss limit 1500"}`))
	req.Header.Set("Content-Type", "application/json")
	addInternalRequestHeaders(req, secret, "ADMIN")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing accountType")
}
