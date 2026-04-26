package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

type mockAccountsRepo struct {
	listFn   func(context.Context) ([]AccountConfig, error)
	saveFn   func(context.Context, AccountConfig) error
	deleteFn func(context.Context, string) error
}

func (m mockAccountsRepo) ListAccounts(ctx context.Context) ([]AccountConfig, error) {
	if m.listFn != nil {
		return m.listFn(ctx)
	}
	return []AccountConfig{}, nil
}

func (m mockAccountsRepo) SaveAccountConfig(ctx context.Context, account AccountConfig) error {
	if m.saveFn != nil {
		return m.saveFn(ctx, account)
	}
	return nil
}

func (m mockAccountsRepo) DeleteAccountByID(ctx context.Context, id string) error {
	if m.deleteFn != nil {
		return m.deleteFn(ctx, id)
	}
	return nil
}

type mockRubricsRepo struct {
	listFn   func(context.Context) ([]Rubric, error)
	saveFn   func(context.Context, Rubric) error
	deleteFn func(context.Context, string) error
}

func (m mockRubricsRepo) ListRubrics(ctx context.Context) ([]Rubric, error) {
	if m.listFn != nil {
		return m.listFn(ctx)
	}
	return []Rubric{}, nil
}

func (m mockRubricsRepo) SaveRubricConfig(ctx context.Context, rubric Rubric) error {
	if m.saveFn != nil {
		return m.saveFn(ctx, rubric)
	}
	return nil
}

func (m mockRubricsRepo) DeleteRubricByID(ctx context.Context, id string) error {
	if m.deleteFn != nil {
		return m.deleteFn(ctx, id)
	}
	return nil
}

type mockInstrumentsRepo struct {
	listFn   func(context.Context) ([]InstrumentDefinition, error)
	saveFn   func(context.Context, InstrumentDefinition) error
	deleteFn func(context.Context, string) error
}

func (m mockInstrumentsRepo) ListInstruments(ctx context.Context) ([]InstrumentDefinition, error) {
	if m.listFn != nil {
		return m.listFn(ctx)
	}
	return []InstrumentDefinition{}, nil
}

func (m mockInstrumentsRepo) SaveInstrument(ctx context.Context, instrument InstrumentDefinition) error {
	if m.saveFn != nil {
		return m.saveFn(ctx, instrument)
	}
	return nil
}

func (m mockInstrumentsRepo) DeleteInstrument(ctx context.Context, code string) error {
	if m.deleteFn != nil {
		return m.deleteFn(ctx, code)
	}
	return nil
}

type mockUsersRepo struct {
	syncFn    func(context.Context, syncUserRequest) (string, bool, error)
	disableFn func(context.Context, string) error
}

func (m mockUsersRepo) SyncUserRecord(ctx context.Context, req syncUserRequest) (string, bool, error) {
	if m.syncFn != nil {
		return m.syncFn(ctx, req)
	}
	return "ANON", false, nil
}

func (m mockUsersRepo) DisableUserByEmail(ctx context.Context, email string) error {
	if m.disableFn != nil {
		return m.disableFn(ctx, email)
	}
	return nil
}

type mockAIProviderConfigRepo struct {
	getFn  func(context.Context) (AIProviderConfig, error)
	saveFn func(context.Context, AIProviderConfig) error
}

func (m mockAIProviderConfigRepo) GetAIProviderConfig(ctx context.Context) (AIProviderConfig, error) {
	if m.getFn != nil {
		return m.getFn(ctx)
	}

	return defaultAIProviderConfig(), nil
}

func (m mockAIProviderConfigRepo) SaveAIProviderConfig(ctx context.Context, config AIProviderConfig) error {
	if m.saveFn != nil {
		return m.saveFn(ctx, config)
	}

	return nil
}

func configureInternalAPISecret(t *testing.T) string {
	t.Helper()

	const secret = "test-internal-secret"
	original, existed := os.LookupEnv("INTERNAL_API_SHARED_SECRET")
	if err := os.Setenv("INTERNAL_API_SHARED_SECRET", secret); err != nil {
		t.Fatalf("Setenv() error = %v", err)
	}

	t.Cleanup(func() {
		if existed {
			_ = os.Setenv("INTERNAL_API_SHARED_SECRET", original)
			return
		}
		_ = os.Unsetenv("INTERNAL_API_SHARED_SECRET")
	})

	return secret
}

func addInternalRequestHeaders(req *http.Request, secret string, role string) {
	req.Header.Set(internalAPISecretHeader, secret)
	if role != "" {
		req.Header.Set(internalUserRoleHeader, role)
	}
}

func TestNewAppHealthcheck(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	if res.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.StatusCode, http.StatusOK)
	}
}

func TestDraftTradeInvalidPayload(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/copilot/draft", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing required trade fields")
}

func TestJournalTradeInvalidPayload(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/copilot/journal", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing journal fields")
}

func TestUpdateTradeStatusInvalidPayload(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPut, "/api/copilot/trades/test-id/status", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing status")
}

func TestSaveAccountInvalidPayload(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/copilot/accounts", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing account type")
}

func TestSaveAccountMissingCurrentBalance(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/copilot/accounts", strings.NewReader(`{"type":"TOPSTEP EVAL 50K","currentDailyStopLevel":49000,"currentMaxLossLevel":48000}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing current balance")
}

func TestSaveAccountMissingDailyStopLevel(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/copilot/accounts", strings.NewReader(`{"type":"TOPSTEP EVAL 50K","currentBalance":50000,"currentMaxLossLevel":48000}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing daily stop level")
}

func TestSaveAccountMissingMaxLossLevel(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/copilot/accounts", strings.NewReader(`{"type":"TOPSTEP EVAL 50K","currentBalance":50000,"currentDailyStopLevel":49000}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing max loss level")
}

func TestDeleteAccountMissingID(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodDelete, "/api/copilot/accounts/", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	if res.StatusCode != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want %d", res.StatusCode, http.StatusMethodNotAllowed)
	}
}

func TestSaveRubricInvalidPayload(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/copilot/rubrics", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing rubric fields")
}

func TestSaveInstrumentInvalidPayload(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/copilot/instruments", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing instrument code")
}

func TestSyncUserInvalidPayload(t *testing.T) {
	secret := configureInternalAPISecret(t)
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/copilot/users/sync", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	addInternalRequestHeaders(req, secret, "")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing user fields")
}

func TestDisableUserInvalidPayload(t *testing.T) {
	secret := configureInternalAPISecret(t)
	app := newApp()

	req := httptest.NewRequest(http.MethodPut, "/api/copilot/users/disable", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	addInternalRequestHeaders(req, secret, "ADMIN")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusForbidden, "Admin accounts cannot be deleted")
}

func TestGetAccountsSuccessWithInjectedRepo(t *testing.T) {
	original := accountsRepo
	accountsRepo = mockAccountsRepo{
		listFn: func(context.Context) ([]AccountConfig, error) {
			return []AccountConfig{{ID: "a-1", Type: "TOPSTEPX"}}, nil
		},
	}
	t.Cleanup(func() { accountsRepo = original })

	app := newApp()
	req := httptest.NewRequest(http.MethodGet, "/api/copilot/accounts", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	if res.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.StatusCode, http.StatusOK)
	}

	var body []AccountConfig
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		t.Fatalf("Decode() error = %v", err)
	}
	if len(body) != 1 || body[0].ID != "a-1" {
		t.Fatalf("unexpected accounts response: %#v", body)
	}
}

func TestSaveRubricSuccessWithInjectedRepo(t *testing.T) {
	original := rubricsRepo
	rubricsRepo = mockRubricsRepo{
		saveFn: func(_ context.Context, rubric Rubric) error {
			if rubric.Name != "Test Rubric" {
				t.Fatalf("unexpected rubric name: %q", rubric.Name)
			}
			return nil
		},
	}
	t.Cleanup(func() { rubricsRepo = original })

	app := newApp()
	req := httptest.NewRequest(http.MethodPost, "/api/copilot/rubrics", strings.NewReader(`{"name":"Test Rubric","rules":"R1"}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	if res.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.StatusCode, http.StatusOK)
	}

	var body map[string]any
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		t.Fatalf("Decode() error = %v", err)
	}
	if body["status"] != "saved" {
		t.Fatalf("unexpected response: %#v", body)
	}
}

func TestGetInstrumentsSuccessWithInjectedRepo(t *testing.T) {
	original := instrumentsRepo
	instrumentsRepo = mockInstrumentsRepo{
		listFn: func(context.Context) ([]InstrumentDefinition, error) {
			return []InstrumentDefinition{{Code: "COMEX:GC1!"}}, nil
		},
	}
	t.Cleanup(func() { instrumentsRepo = original })

	app := newApp()
	req := httptest.NewRequest(http.MethodGet, "/api/copilot/instruments", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	if res.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.StatusCode, http.StatusOK)
	}

	var body []InstrumentDefinition
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		t.Fatalf("Decode() error = %v", err)
	}
	if len(body) != 1 || body[0].Code != "COMEX:GC1!" {
		t.Fatalf("unexpected instruments response: %#v", body)
	}
}

func TestSaveInstrumentSuccessWithInjectedRepo(t *testing.T) {
	original := instrumentsRepo
	instrumentsRepo = mockInstrumentsRepo{
		saveFn: func(_ context.Context, instrument InstrumentDefinition) error {
			if instrument.Code != "GC" {
				t.Fatalf("unexpected instrument code: %q", instrument.Code)
			}
			return nil
		},
	}
	t.Cleanup(func() { instrumentsRepo = original })

	app := newApp()
	req := httptest.NewRequest(http.MethodPost, "/api/copilot/instruments", strings.NewReader(`{"code":"gc"}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	if res.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.StatusCode, http.StatusOK)
	}
}

func TestSyncUserSuccessWithInjectedRepo(t *testing.T) {
	secret := configureInternalAPISecret(t)
	original := usersRepo
	usersRepo = mockUsersRepo{
		syncFn: func(_ context.Context, req syncUserRequest) (string, bool, error) {
			if req.Email != "alice@example.com" {
				t.Fatalf("unexpected email: %q", req.Email)
			}
			return "ADMIN", false, nil
		},
	}
	t.Cleanup(func() { usersRepo = original })

	app := newApp()
	req := httptest.NewRequest(http.MethodPost, "/api/copilot/users/sync", strings.NewReader(`{"providerId":"p-1","email":"alice@example.com","name":"Alice"}`))
	req.Header.Set("Content-Type", "application/json")
	addInternalRequestHeaders(req, secret, "")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	if res.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.StatusCode, http.StatusOK)
	}

	var body map[string]any
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		t.Fatalf("Decode() error = %v", err)
	}
	if body["role"] != "ADMIN" {
		t.Fatalf("unexpected response: %#v", body)
	}
}

func TestGetAIProviderConfigSuccessWithInjectedRepo(t *testing.T) {
	secret := configureInternalAPISecret(t)
	original := aiProviderConfigRepo
	aiProviderConfigRepo = mockAIProviderConfigRepo{
		getFn: func(context.Context) (AIProviderConfig, error) {
			return AIProviderConfig{
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
	app := newApp()

	original := aiProviderConfigRepo
	aiProviderConfigRepo = mockAIProviderConfigRepo{
		getFn: func(context.Context) (AIProviderConfig, error) {
			return AIProviderConfig{
				CleanupTextProvider: "mock",
				CleanupTextModel:    "mock-fast",
				TimeoutMs:           15000,
			}, nil
		},
	}
	t.Cleanup(func() { aiProviderConfigRepo = original })

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

func assertJSONError(t *testing.T, res *http.Response, wantStatus int, wantError string) {
	t.Helper()

	if res.StatusCode != wantStatus {
		t.Fatalf("status = %d, want %d", res.StatusCode, wantStatus)
	}

	var body map[string]string
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		t.Fatalf("Decode() error = %v", err)
	}

	if body["error"] != wantError {
		t.Fatalf("error message = %q, want %q", body["error"], wantError)
	}
}
