package app

import (
	"context"
	"encoding/json"
	core "futures-copilot-mvp/internal/core"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSaveAccountInvalidPayload(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/accounts", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing account type")
}

func TestSaveAccountMissingCurrentBalance(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/accounts", strings.NewReader(`{"type":"TOPSTEP EVAL 50K","currentDailyStopLevel":49000,"currentMaxLossLevel":48000}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing current balance")
}

func TestSaveAccountMissingDailyStopLevel(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/accounts", strings.NewReader(`{"type":"TOPSTEP EVAL 50K","currentBalance":50000,"currentMaxLossLevel":48000}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing daily stop level")
}

func TestSaveAccountMissingMaxLossLevel(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/accounts", strings.NewReader(`{"type":"TOPSTEP EVAL 50K","currentBalance":50000,"currentDailyStopLevel":49000}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing max loss level")
}

func TestDeleteAccountMissingID(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodDelete, "/api/accounts/", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	if res.StatusCode != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d, want %d", res.StatusCode, http.StatusMethodNotAllowed)
	}
}

func TestGetAccountsSuccessWithInjectedRepo(t *testing.T) {
	original := accountsRepo
	accountsRepo = mockAccountsRepo{
		listFn: func(context.Context) ([]core.AccountConfig, error) {
			return []core.AccountConfig{{ID: "a-1", Type: "TOPSTEPX"}}, nil
		},
	}
	t.Cleanup(func() { accountsRepo = original })

	app := newApp()
	req := httptest.NewRequest(http.MethodGet, "/api/accounts", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	if res.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.StatusCode, http.StatusOK)
	}

	var body []core.AccountConfig
	if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
		t.Fatalf("Decode() error = %v", err)
	}
	if len(body) != 1 || body[0].ID != "a-1" {
		t.Fatalf("unexpected accounts response: %#v", body)
	}
}
