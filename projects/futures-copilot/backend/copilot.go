package main

import (
	"context"
	"log"
	"os"

	"github.com/redis/go-redis/v9"
)

// Global Redis Client
var rdb *redis.Client
var ctx = context.Background()

func InitRedis() {
	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "localhost:6379"
	}

	rdb = redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: "", 
		DB:       0,
	})

	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		log.Printf("⚠️ Redis not connected: %v", err)
	} else {
		log.Println("✅ Connected to Redis (Copilot DB)")
	}
}

// Structs mapping to the Next.js forms
type AccountConfig struct {
	ID             string  `json:"id"`
	Type           string  `json:"type"`
	Balance        float64 `json:"balance"`
	DailyLossLimit float64 `json:"dailyLossLimit"`
	DefaultRisk    string  `json:"defaultRisk"`
	CurrentDailyPnL float64 `json:"currentDailyPnL"`
}

type Rubric struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Rules      string `json:"rules"`
	PineScript string `json:"pinescript"`
}

type TradePlan struct {
	ID          string  `json:"id"`
	AccountID   string  `json:"accountId"`
	RubricID    string  `json:"rubricId"`
	Instrument  string  `json:"instrument"`
	Bias        string  `json:"bias"`
	Entry       float64 `json:"entry"`
	StopLoss    float64 `json:"stopLoss"`
	TakeProfit  float64 `json:"takeProfit"`
	Contracts   int     `json:"contracts"`
	Notes       string  `json:"notes"`
	Status      string  `json:"status"` // 'draft' | 'working' | 'filled' | 'closed'
	UpdatedAt   string  `json:"updatedAt,omitempty"`
}

type AIResponse struct {
	Decision   string `json:"decision"` // 'Approve', 'Revise', 'Reject'
	RiskAmount float64 `json:"riskAmount"`
	Feedback   string `json:"feedback"`
}

// -----------------------
// Handlers
// -----------------------

// Calculates deterministic risk based on ticking point values
func computeRiskMath(plan TradePlan) float64 {
	// Simple multiplier based on instrument
	multiplier := 10.0 // Default (e.g. NQ = $20/pt, GC = $100/pt = 10 * 10 ticks)
	
	if plan.Instrument == "GC" {
		multiplier = 100.0 // 1 point = $100
	} else if plan.Instrument == "NQ" {
		multiplier = 20.0
	} else if plan.Instrument == "ES" {
		multiplier = 50.0
	}

	// Calculate distance
	distance := plan.Entry - plan.StopLoss
	if plan.Bias == "Short" {
		distance = plan.StopLoss - plan.Entry
	}

	if distance < 0 {
		distance = 0 // Invalid SL
	}

	return distance * multiplier * float64(plan.Contracts)
}

