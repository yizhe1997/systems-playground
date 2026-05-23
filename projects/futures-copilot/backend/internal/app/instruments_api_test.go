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

func TestSaveInstrumentInvalidPayload(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/instruments", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing instrument code")
}

func TestGetInstrumentsSuccessWithInjectedRepo(t *testing.T) {
	original := instrumentsRepo
	instrumentsRepo = mockInstrumentsRepo{
		listFn: func(context.Context) ([]core.InstrumentDefinition, error) {
			return []core.InstrumentDefinition{{Code: "COMEX:GC1!"}}, nil
		},
	}
	t.Cleanup(func() { instrumentsRepo = original })

	app := newApp()
	req := httptest.NewRequest(http.MethodGet, "/api/instruments", nil)
	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	if res.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.StatusCode, http.StatusOK)
	}

	var body []core.InstrumentDefinition
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
		saveFn: func(_ context.Context, instrument core.InstrumentDefinition) error {
			if instrument.Code != "GC" {
				t.Fatalf("unexpected instrument code: %q", instrument.Code)
			}
			return nil
		},
	}
	t.Cleanup(func() { instrumentsRepo = original })

	app := newApp()
	req := httptest.NewRequest(http.MethodPost, "/api/instruments", strings.NewReader(`{"code":"gc"}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	if res.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.StatusCode, http.StatusOK)
	}
}
