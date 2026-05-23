package trades

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/redis/go-redis/v9"
)

const AISetupGradeQueueKey = "copilot:ai:setup-grade:queue"

func EnqueueAISetupGradeJob(client *redis.Client, ctx context.Context, tradeID string) error {
	if client == nil {
		return errors.New("redis is not initialized")
	}
	if strings.TrimSpace(tradeID) == "" {
		return errors.New("trade id is required")
	}

	return client.RPush(ctx, AISetupGradeQueueKey, tradeID).Err()
}

func StartAISetupGradeWorker(client *redis.Client, repo Repository) {
	if client == nil {
		log.Println("⚠️ AI setup grade worker not started (redis unavailable)")
		return
	}

	go func() {
		for {
			result, err := client.BLPop(context.Background(), 0, AISetupGradeQueueKey).Result()
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

			if err := ProcessAISetupGradeJob(context.Background(), repo, tradeID); err != nil {
				log.Printf("AI setup grade worker failed for %s: %v", tradeID, err)
			}
		}
	}()

	log.Println("✅ AI setup grade worker started")
}

func ProcessAISetupGradeJob(ctx context.Context, repo Repository, tradeID string) error {
	if err := repo.SetTradeAISetupGradeStatus(ctx, tradeID, "grading"); err != nil {
		return err
	}

	trade, err := repo.GetTradeByID(ctx, tradeID)
	if err != nil {
		_ = repo.SetTradeAISetupGradeResult(ctx, tradeID, "failed", "Unable to load trade context for setup grade.")
		return err
	}

	riskAmount := ComputeRiskMath(trade)
	aiResponse := BuildDraftAIResponse(riskAmount)

	findings := "SETUP GRADE: " + strings.ToUpper(aiResponse.Decision) + "\n" +
		"RISK AMOUNT: " + formatUSD(riskAmount) + "\n" +
		"FINDINGS: " + aiResponse.Feedback

	return repo.SetTradeAISetupGradeResult(ctx, tradeID, "ready", findings)
}

func formatUSD(value float64) string {
	return fmt.Sprintf("$%.2f", value)
}
