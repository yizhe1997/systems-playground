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

func TestSaveRubricInvalidPayload(t *testing.T) {
	app := newApp()

	req := httptest.NewRequest(http.MethodPost, "/api/rubrics", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")

	res, err := app.Test(req)
	if err != nil {
		t.Fatalf("app.Test() error = %v", err)
	}

	assertJSONError(t, res, http.StatusBadRequest, "Missing rubric fields")
}

func TestSaveRubricSuccessWithInjectedRepo(t *testing.T) {
	original := rubricsRepo
	rubricsRepo = mockRubricsRepo{
		saveFn: func(_ context.Context, rubric core.Rubric) error {
			if rubric.Name != "Test Rubric" {
				t.Fatalf("unexpected rubric name: %q", rubric.Name)
			}
			return nil
		},
	}
	t.Cleanup(func() { rubricsRepo = original })

	app := newApp()
	req := httptest.NewRequest(http.MethodPost, "/api/rubrics", strings.NewReader(`{"name":"Test Rubric","rules":"R1"}`))
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
