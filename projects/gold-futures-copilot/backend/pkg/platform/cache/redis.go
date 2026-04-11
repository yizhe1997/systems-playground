package cache

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"

	"github.com/yizhe1997/systems-playground/projects/gold-futures-copilot/backend/pkg/config"
)

func NewRedisClient(ctx context.Context, cfg config.Config) (*redis.Client, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})

	if err := client.Ping(ctx).Err(); err != nil {
		client.Close()
		return nil, fmt.Errorf("ping redis: %w", err)
	}

	return client, nil
}
