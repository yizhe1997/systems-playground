package stats

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"time"

	core "futures-copilot-mvp/internal/core"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
)

type Dependencies struct {
	DB    *pgxpool.Pool
	Cache *redis.Client
}

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

const (
	selectTradeStatsQuery = `
		SELECT 
			COUNT(*) as total_trades,
			COUNT(CASE WHEN o.pnl > 0 THEN 1 END) as winning_trades,
			COUNT(CASE WHEN o.pnl < 0 THEN 1 END) as losing_trades,
			COALESCE(SUM(CASE WHEN o.pnl > 0 THEN o.pnl ELSE 0 END), 0) as total_wins,
			COALESCE(ABS(SUM(CASE WHEN o.pnl < 0 THEN o.pnl ELSE 0 END)), 0) as total_losses
		FROM trade_plans t
		LEFT JOIN trade_outcomes o ON o.trade_id = t.id
		WHERE (t.status = 'closed' OR t.status = 'filled') AND t.instrument = $1
	`

	selectAllTradeStatsQuery = `
		SELECT 
			COUNT(*) as total_trades,
			COUNT(CASE WHEN o.pnl > 0 THEN 1 END) as winning_trades,
			COUNT(CASE WHEN o.pnl < 0 THEN 1 END) as losing_trades,
			COALESCE(SUM(CASE WHEN o.pnl > 0 THEN o.pnl ELSE 0 END), 0) as total_wins,
			COALESCE(ABS(SUM(CASE WHEN o.pnl < 0 THEN o.pnl ELSE 0 END)), 0) as total_losses
		FROM trade_plans t
		LEFT JOIN trade_outcomes o ON o.trade_id = t.id
		WHERE t.status = 'closed' OR t.status = 'filled'
	`

	selectInstrumentsFromTradesQuery = `
		SELECT DISTINCT instrument
		FROM trade_plans
		WHERE (status = 'closed' OR status = 'filled')
		ORDER BY instrument ASC
	`
)

func GetTradeStats(c *fiber.Ctx, deps Dependencies) error {
	instrument := c.Query("instrument", "ALL")

	if deps.Cache != nil {
		cacheKey := fmt.Sprintf("trade_stats_%s", instrument)
		cachedData, err := deps.Cache.Get(context.Background(), cacheKey).Result()
		if err == nil {
			var cachedResponse TradeStatsResponse
			if err := json.Unmarshal([]byte(cachedData), &cachedResponse); err == nil {
				return c.JSON(cachedResponse)
			}
		}
	}

	response, err := computeTradeStats(context.Background(), deps, instrument)
	if err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to compute trade stats", err)
	}

	if deps.Cache != nil {
		responseJSON, _ := json.Marshal(response)
		deps.Cache.Set(context.Background(), fmt.Sprintf("trade_stats_%s", instrument), string(responseJSON), 5*time.Minute)
	}

	return c.JSON(response)
}

func computeTradeStats(ctx context.Context, deps Dependencies, instrument string) (TradeStatsResponse, error) {
	if deps.DB == nil {
		return TradeStatsResponse{}, fmt.Errorf("postgres is not initialized")
	}

	rows, err := deps.DB.Query(ctx, selectInstrumentsFromTradesQuery)
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

	var stats TradeStats
	var raw rawStats

	if instrument == "ALL" {
		err = deps.DB.QueryRow(ctx, selectAllTradeStatsQuery).Scan(
			&raw.TotalTrades,
			&raw.WinningTrades,
			&raw.LosingTrades,
			&raw.TotalWins,
			&raw.TotalLosses,
		)
	} else {
		err = deps.DB.QueryRow(ctx, selectTradeStatsQuery, instrument).Scan(
			&raw.TotalTrades,
			&raw.WinningTrades,
			&raw.LosingTrades,
			&raw.TotalWins,
			&raw.TotalLosses,
		)
	}

	if err != nil && err.Error() != "no rows in result set" {
		return TradeStatsResponse{}, err
	}

	if raw.TotalTrades > 0 {
		stats.WinRate = (float64(raw.WinningTrades) / float64(raw.TotalTrades)) * 100
	}
	if raw.TotalLosses > 0 {
		stats.ProfitFactor = raw.TotalWins / raw.TotalLosses
	} else if raw.TotalWins > 0 {
		stats.ProfitFactor = raw.TotalWins
	}
	if raw.WinningTrades > 0 && raw.LosingTrades > 0 {
		avgWin := raw.TotalWins / float64(raw.WinningTrades)
		avgLoss := raw.TotalLosses / float64(raw.LosingTrades)
		if avgLoss > 0 {
			stats.AvgRR = avgWin / avgLoss
		}
	}

	stats.TotalTrades = raw.TotalTrades
	stats.WinRate = roundFloat(stats.WinRate, 2)
	stats.AvgRR = roundFloat(stats.AvgRR, 2)
	stats.ProfitFactor = roundFloat(stats.ProfitFactor, 2)

	return TradeStatsResponse{Stats: stats, Instruments: instruments}, nil
}

func roundFloat(val float64, precision uint) float64 {
	ratio := math.Pow(10, float64(precision))
	return math.Round(val*ratio) / ratio
}
