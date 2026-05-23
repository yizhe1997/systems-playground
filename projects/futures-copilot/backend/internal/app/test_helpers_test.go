package app

import (
	"context"
	"encoding/json"
	core "futures-copilot-mvp/internal/core"
	accountsfeature "futures-copilot-mvp/internal/features/accounts"
	aifeature "futures-copilot-mvp/internal/features/ai"
	alertsfeature "futures-copilot-mvp/internal/features/alerts"
	instrumentsfeature "futures-copilot-mvp/internal/features/instruments"
	rubricsfeature "futures-copilot-mvp/internal/features/rubrics"
	tradesfeature "futures-copilot-mvp/internal/features/trades"
	usersfeature "futures-copilot-mvp/internal/features/users"
	auth "futures-copilot-mvp/internal/platform/auth"
	"net/http"
	"os"
	"testing"

	"github.com/gofiber/fiber/v2"
)

var (
	accountsRepo         accountsfeature.Repository    = mockAccountsRepo{}
	rubricsRepo          rubricsfeature.Repository     = mockRubricsRepo{}
	instrumentsRepo      instrumentsfeature.Repository = mockInstrumentsRepo{}
	tradeRepo            tradesfeature.Repository
	usersRepo            usersfeature.Repository = mockUsersRepo{}
	alertsRepo           alertsfeature.Repository
	aiProviderConfigRepo aifeature.ProviderConfigRepository = mockAIProviderConfigRepo{}
)

func newApp() *fiber.App {
	return New(Dependencies{
		AccountsRepo:         accountsRepo,
		RubricsRepo:          rubricsRepo,
		InstrumentsRepo:      instrumentsRepo,
		TradeRepo:            tradeRepo,
		UsersRepo:            usersRepo,
		AlertsRepo:           alertsRepo,
		AIProviderConfigRepo: aiProviderConfigRepo,
		DB:                   nil,
		RDB:                  nil,
	})
}

type mockAccountsRepo struct {
	listFn   func(context.Context) ([]core.AccountConfig, error)
	saveFn   func(context.Context, core.AccountConfig) error
	deleteFn func(context.Context, string) error
}

func (m mockAccountsRepo) ListAccounts(ctx context.Context) ([]core.AccountConfig, error) {
	if m.listFn != nil {
		return m.listFn(ctx)
	}
	return []core.AccountConfig{}, nil
}

func (m mockAccountsRepo) SaveAccountConfig(ctx context.Context, account core.AccountConfig) error {
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
	listFn   func(context.Context) ([]core.Rubric, error)
	saveFn   func(context.Context, core.Rubric) error
	deleteFn func(context.Context, string) error
}

func (m mockRubricsRepo) ListRubrics(ctx context.Context) ([]core.Rubric, error) {
	if m.listFn != nil {
		return m.listFn(ctx)
	}
	return []core.Rubric{}, nil
}

func (m mockRubricsRepo) SaveRubricConfig(ctx context.Context, rubric core.Rubric) error {
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
	listFn   func(context.Context) ([]core.InstrumentDefinition, error)
	saveFn   func(context.Context, core.InstrumentDefinition) error
	deleteFn func(context.Context, string) error
}

func (m mockInstrumentsRepo) ListInstruments(ctx context.Context) ([]core.InstrumentDefinition, error) {
	if m.listFn != nil {
		return m.listFn(ctx)
	}
	return []core.InstrumentDefinition{}, nil
}

func (m mockInstrumentsRepo) SaveInstrument(ctx context.Context, instrument core.InstrumentDefinition) error {
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
	syncFn    func(context.Context, core.SyncUserRequest) (string, bool, string, error)
	disableFn func(context.Context, string) error
}

func (m mockUsersRepo) SyncUserRecord(ctx context.Context, req core.SyncUserRequest) (string, bool, string, error) {
	if m.syncFn != nil {
		return m.syncFn(ctx, req)
	}
	return "ANON", false, "", nil
}

func (m mockUsersRepo) DisableUserByEmail(ctx context.Context, email string) error {
	if m.disableFn != nil {
		return m.disableFn(ctx, email)
	}
	return nil
}

type mockAIProviderConfigRepo struct {
	getFn  func(context.Context) (core.AIProviderConfig, error)
	saveFn func(context.Context, core.AIProviderConfig) error
}

func (m mockAIProviderConfigRepo) GetAIProviderConfig(ctx context.Context) (core.AIProviderConfig, error) {
	if m.getFn != nil {
		return m.getFn(ctx)
	}

	return aifeature.DefaultAIProviderConfig(), nil
}

func (m mockAIProviderConfigRepo) SaveAIProviderConfig(ctx context.Context, config core.AIProviderConfig) error {
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
	req.Header.Set(auth.InternalAPISecretHeader, secret)
	if role != "" {
		req.Header.Set(auth.InternalUserRoleHeader, role)
	}
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
