package app

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestDraftTradeInvalidPayload(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/draft", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing required trade fields")
}

func TestJournalTradeInvalidPayload(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/journal", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing journal fields")
}

func TestUpdateTradeStatusInvalidPayload(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPut, "/api/trades/test-id/status", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing status")
}
