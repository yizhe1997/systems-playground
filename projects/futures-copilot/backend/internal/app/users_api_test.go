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

func TestSyncUserInvalidPayload(t *testing.T) {
	secret := configureInternalAPISecret(t)
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/users/sync", strings.NewReader(`{}`))
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

	req := httptest.NewRequest(http.MethodPut, "/api/users/disable", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	addInternalRequestHeaders(req, secret, "ADMIN")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusForbidden, "Admin accounts cannot be deleted")
}

func TestSyncUserSuccessWithInjectedRepo(t *testing.T) {
	secret := configureInternalAPISecret(t)
	original := usersRepo
	usersRepo = mockUsersRepo{
		syncFn: func(_ context.Context, req core.SyncUserRequest) (string, bool, string, error) {
			if req.Email != "alice@example.com" {
				t.Fatalf("unexpected email: %q", req.Email)
			}
			return "ADMIN", false, "2026-05-01T12:00:00Z", nil
		},
	}
	t.Cleanup(func() { usersRepo = original })

	app := newApp()
	req := httptest.NewRequest(http.MethodPost, "/api/users/sync", strings.NewReader(`{"providerId":"p-1","email":"alice@example.com","name":"Alice"}`))
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
	if body["createdAt"] != "2026-05-01T12:00:00Z" {
		t.Fatalf("unexpected response: %#v", body)
	}
}
