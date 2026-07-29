package main

import (
	"context"
	"errors"
	"testing"
)

func TestRunTriage_Success(t *testing.T) {
	setupTestDB(t)
	insertTestRequest(t, ResumeRequest{
		ID: "abc", Name: "Jane", Email: "jane@example.com", Company: "Acme",
		Reason: "hiring", Status: "pending", CreatedAt: 1000, TriageStatus: "queued",
	})

	prev := callTriage
	callTriage = func(ctx context.Context, req *ResumeRequest) (*triageResult, error) {
		return &triageResult{
			Legitimacy:       "legit",
			LegitimacyReason: "plausible recruiter request",
			RoleFitSummary:   "wants a senior backend engineer",
		}, nil
	}
	defer func() { callTriage = prev }()

	runTriage("abc")

	got, err := findResumeRequest(context.Background(), "abc")
	if err != nil || got == nil {
		t.Fatalf("expected request to still exist, err=%v", err)
	}
	if got.TriageStatus != "complete" {
		t.Errorf("expected triage_status 'complete', got %q", got.TriageStatus)
	}
	if got.AIModel != string(triageModel) {
		t.Errorf("expected ai_model %q, got %q", triageModel, got.AIModel)
	}
	if got.Legitimacy != "legit" || got.RoleFitSummary != "wants a senior backend engineer" {
		t.Errorf("triage result not persisted correctly: %+v", got)
	}
	if got.TriageError != "" {
		t.Errorf("expected no triage error on success, got %q", got.TriageError)
	}
}

func TestRunTriage_ModelFailure(t *testing.T) {
	setupTestDB(t)
	insertTestRequest(t, ResumeRequest{
		ID: "abc", Name: "Jane", Email: "jane@example.com", Company: "Acme",
		Reason: "hiring", Status: "pending", CreatedAt: 1000, TriageStatus: "queued",
	})

	prev := callTriage
	callTriage = func(ctx context.Context, req *ResumeRequest) (*triageResult, error) {
		return nil, errors.New("simulated API outage")
	}
	defer func() { callTriage = prev }()

	runTriage("abc")

	got, err := findResumeRequest(context.Background(), "abc")
	if err != nil || got == nil {
		t.Fatalf("expected request to still exist, err=%v", err)
	}
	if got.TriageStatus != "failed" {
		t.Errorf("expected triage_status 'failed', got %q", got.TriageStatus)
	}
	if got.TriageError == "" {
		t.Error("expected triage_error to be recorded")
	}
	if got.TriageAttempts != 1 {
		t.Errorf("expected triage_attempts=1 after first failure, got %d", got.TriageAttempts)
	}
}

// TestRunTriage_RetryIncrementsAttempts covers the operator's requeue
// scenario: a failed triage that's retried and fails again should accumulate
// attempts rather than resetting.
func TestRunTriage_RetryIncrementsAttempts(t *testing.T) {
	setupTestDB(t)
	insertTestRequest(t, ResumeRequest{
		ID: "abc", Name: "Jane", Email: "jane@example.com", Company: "Acme",
		Status: "pending", CreatedAt: 1000, TriageStatus: "failed",
		TriageError: "previous failure", TriageAttempts: 1,
	})

	prev := callTriage
	callTriage = func(ctx context.Context, req *ResumeRequest) (*triageResult, error) {
		return nil, errors.New("still down")
	}
	defer func() { callTriage = prev }()

	runTriage("abc")

	got, _ := findResumeRequest(context.Background(), "abc")
	if got.TriageAttempts != 2 {
		t.Errorf("expected triage_attempts=2 after second failure, got %d", got.TriageAttempts)
	}
}

func TestRunTriage_UnknownRequestDoesNotPanic(t *testing.T) {
	setupTestDB(t)

	// Must not panic when the request vanishes before triage runs.
	runTriage("does-not-exist")
}

func TestMarkTriageFailed_RecordsError(t *testing.T) {
	setupTestDB(t)
	insertTestRequest(t, ResumeRequest{
		ID: "abc", Name: "Jane", Email: "jane@example.com", Company: "Acme",
		Status: "pending", CreatedAt: 1000, TriageStatus: "processing",
	})

	markTriageFailed(context.Background(), "abc", "boom")

	got, _ := findResumeRequest(context.Background(), "abc")
	if got.TriageStatus != "failed" || got.TriageError != "boom" {
		t.Errorf("unexpected state after markTriageFailed: %+v", got)
	}
}
