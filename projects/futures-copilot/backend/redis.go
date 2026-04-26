package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/redis/go-redis/v9"
)

const aiSetupGradeQueueKey = "copilot:ai:setup-grade:queue"

// Global Redis Client
var rdb *redis.Client

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

	_, err := rdb.Ping(context.Background()).Result()
	if err != nil {
		log.Printf("⚠️ Redis not connected: %v", err)
		rdb = nil
	} else {
		log.Println("✅ Connected to Redis (Copilot DB)")
	}
}

func enqueueAISetupGradeJob(ctx context.Context, tradeID string) error {
	if rdb == nil {
		return errors.New("redis is not initialized")
	}
	if strings.TrimSpace(tradeID) == "" {
		return errors.New("trade id is required")
	}

	return rdb.RPush(ctx, aiSetupGradeQueueKey, tradeID).Err()
}

func startAISetupGradeWorker() {
	if rdb == nil {
		log.Println("⚠️ AI setup grade worker not started (redis unavailable)")
		return
	}

	go func() {
		for {
			result, err := rdb.BLPop(context.Background(), 0, aiSetupGradeQueueKey).Result()
			if err != nil {
				log.Printf("AI setup grade worker BLPOP error: %v", err)
				continue
			}
			if len(result) < 2 {
				continue
			}

			tradeID := strings.TrimSpace(result[1])
			if tradeID == "" {
				continue
			}

			if err := processAISetupGradeJob(context.Background(), tradeID); err != nil {
				log.Printf("AI setup grade worker failed for %s: %v", tradeID, err)
			}
		}
	}()

	log.Println("✅ AI setup grade worker started")
}

func processAISetupGradeJob(ctx context.Context, tradeID string) error {
	if err := setTradeAISetupGradeStatus(ctx, tradeID, "grading"); err != nil {
		return err
	}

	trade, err := getTradeByID(ctx, tradeID)
	if err != nil {
		_ = setTradeAISetupGradeResult(ctx, tradeID, "failed", "Unable to load trade context for setup grade.")
		return err
	}

	riskAmount := computeRiskMath(trade)
	aiResponse := buildDraftAIResponse(riskAmount)

	findings := "SETUP GRADE: " + strings.ToUpper(aiResponse.Decision) + "\n" +
		"RISK AMOUNT: " + formatUSD(riskAmount) + "\n" +
		"FINDINGS: " + aiResponse.Feedback

	return setTradeAISetupGradeResult(ctx, tradeID, "ready", findings)
}

func formatUSD(value float64) string {
	return fmt.Sprintf("$%.2f", value)
}
