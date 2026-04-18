package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
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

func TestSyncUserInvalidPayload(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/copilot/users/sync", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing user fields")
}

func TestDisableUserInvalidPayload(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPut, "/api/copilot/users/disable", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing email")
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

func TestSyncUserSuccessWithInjectedRepo(t *testing.T) {
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
