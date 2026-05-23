package app

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

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
