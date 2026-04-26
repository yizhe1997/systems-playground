package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"time"

	"github.com/gofiber/fiber/v2"
)

type TradeStats struct {
	WinRate      float64 `json:"winRate"`
	AvgRR        float64 `json:"avgRR"`
	TotalTrades  int64   `json:"totalTrades"`
	ProfitFactor float64 `json:"profitFactor"`
}

type TradeStatsResponse struct {
	Stats       TradeStats `json:"stats"`
	Instruments []string   `json:"instruments"`
}

type rawStats struct {
	TotalTrades   int64
	WinningTrades int64
	LosingTrades  int64
	TotalWins     float64
	TotalLosses   float64
}

func getTradeStats(c *fiber.Ctx) error {
	instrument := c.Query("instrument", "ALL")

	// Try to get from cache first
	if rdb != nil {
		cacheKey := fmt.Sprintf("trade_stats_%s", instrument)
		cachedData, err := rdb.Get(context.Background(), cacheKey).Result()
		if err == nil {
			var cachedResponse TradeStatsResponse
			if err := json.Unmarshal([]byte(cachedData), &cachedResponse); err == nil {
				return c.JSON(cachedResponse)
			}
		}
	}

	// Fetch from database
	response, err := computeTradeStats(context.Background(), instrument)
	if err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to compute trade stats", err)
	}

	// Cache for 5 minutes
	if rdb != nil {
		responseJSON, _ := json.Marshal(response)
		rdb.Set(context.Background(), fmt.Sprintf("trade_stats_%s", instrument), string(responseJSON), 5*time.Minute)
	}

	return c.JSON(response)
}

func computeTradeStats(ctx context.Context, instrument string) (TradeStatsResponse, error) {
	// Get instruments list
	rows, err := db.Query(ctx, selectInstrumentsFromTradesQuery)
	if err != nil {
		return TradeStatsResponse{}, err
	}
	defer rows.Close()

	instruments := []string{}
	for rows.Next() {
		var inst string
		if err := rows.Scan(&inst); err != nil {
			log.Printf("Error scanning instrument: %v", err)
			continue
		}
		instruments = append(instruments, inst)
	}

	// Compute stats
	var stats TradeStats
	var rawStats rawStats

	if instrument == "ALL" {
		err = db.QueryRow(ctx, selectAllTradeStatsQuery).Scan(
			&rawStats.TotalTrades,
			&rawStats.WinningTrades,
			&rawStats.LosingTrades,
			&rawStats.TotalWins,
			&rawStats.TotalLosses,
		)
	} else {
		err = db.QueryRow(ctx, selectTradeStatsQuery, instrument).Scan(
			&rawStats.TotalTrades,
			&rawStats.WinningTrades,
			&rawStats.LosingTrades,
			&rawStats.TotalWins,
			&rawStats.TotalLosses,
		)
	}

	if err != nil && err.Error() != "no rows in result set" {
		return TradeStatsResponse{}, err
	}

	// Calculate win rate
	if rawStats.TotalTrades > 0 {
		stats.WinRate = (float64(rawStats.WinningTrades) / float64(rawStats.TotalTrades)) * 100
	}

	// Calculate profit factor
	if rawStats.TotalLosses > 0 {
		stats.ProfitFactor = rawStats.TotalWins / rawStats.TotalLosses
	} else if rawStats.TotalWins > 0 {
		stats.ProfitFactor = rawStats.TotalWins
	}

	// Calculate average R:R
	if rawStats.WinningTrades > 0 && rawStats.LosingTrades > 0 {
		avgWin := rawStats.TotalWins / float64(rawStats.WinningTrades)
		avgLoss := rawStats.TotalLosses / float64(rawStats.LosingTrades)
		if avgLoss > 0 {
			stats.AvgRR = avgWin / avgLoss
		}
	}

	stats.TotalTrades = rawStats.TotalTrades

	// Round to 2 decimal places
	stats.WinRate = roundFloat(stats.WinRate, 2)
	stats.AvgRR = roundFloat(stats.AvgRR, 2)
	stats.ProfitFactor = roundFloat(stats.ProfitFactor, 2)

	return TradeStatsResponse{
		Stats:       stats,
		Instruments: instruments,
	}, nil
}

func roundFloat(val float64, precision uint) float64 {
	ratio := math.Pow(10, float64(precision))
	return math.Round(val*ratio) / ratio
}
