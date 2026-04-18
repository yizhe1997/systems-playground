package main

import "testing"

func TestInstrumentMultiplier(t *testing.T) {
	tests := []struct {
		name       string
		instrument string
		want       float64
	}{
		{name: "gold", instrument: "GC", want: 100},
		{name: "nasdaq", instrument: "NQ", want: 20},
		{name: "sp500", instrument: "ES", want: 50},
		{name: "default", instrument: "YM", want: 10},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := instrumentMultiplier(tt.instrument)
			if got != tt.want {
				t.Fatalf("instrumentMultiplier(%q) = %v, want %v", tt.instrument, got, tt.want)
			}
		})
	}
}

func TestComputeRiskMath(t *testing.T) {
	tests := []struct {
		name string
		plan TradePlan
		want float64
	}{
		{
			name: "long gc trade",
			plan: TradePlan{Instrument: "GC", Bias: "Long", Entry: 2350, StopLoss: 2348, Contracts: 2},
			want: 400,
		},
		{
			name: "short nq trade",
			plan: TradePlan{Instrument: "NQ", Bias: "Short", Entry: 19500, StopLoss: 19510, Contracts: 3},
			want: 600,
		},
		{
			name: "invalid stop loss clamps to zero",
			plan: TradePlan{Instrument: "ES", Bias: "Long", Entry: 5100, StopLoss: 5110, Contracts: 1},
			want: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := computeRiskMath(tt.plan)
			if got != tt.want {
				t.Fatalf("computeRiskMath() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestBuildDraftAIResponse(t *testing.T) {
	approved := buildDraftAIResponse(400)
	if approved.Decision != "approved" {
		t.Fatalf("expected approved decision, got %q", approved.Decision)
	}
	if approved.RiskAmount != 400 {
		t.Fatalf("expected risk amount 400, got %v", approved.RiskAmount)
	}

	warning := buildDraftAIResponse(900)
	if warning.Decision != "warning" {
		t.Fatalf("expected warning decision, got %q", warning.Decision)
	}
	if warning.Feedback == approved.Feedback {
		t.Fatal("expected warning feedback to differ from approved feedback")
	}
}

func TestBuildJournalRetrospective(t *testing.T) {
	if got := buildJournalRetrospective("LOSS"); got != "Loss logged. Upon review, you took this 15 mins before CPI. Rule #4 violated." {
		t.Fatalf("unexpected loss retrospective: %q", got)
	}

	if got := buildJournalRetrospective("WIN"); got != "Journal logged. Good discipline holding to target despite the early chop." {
		t.Fatalf("unexpected default retrospective: %q", got)
	}
}

func TestNullableString(t *testing.T) {
	if got := nullableString(nil); got != nil {
		t.Fatalf("expected nil for nil pointer, got %#v", got)
	}

	empty := ""
	if got := nullableString(&empty); got != nil {
		t.Fatalf("expected nil for empty string, got %#v", got)
	}

	value := "rubric-123"
	if got := nullableString(&value); got != &value {
		t.Fatalf("expected original pointer, got %#v", got)
	}
}
