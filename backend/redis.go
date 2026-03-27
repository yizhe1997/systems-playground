package main

import (
	"context"
	"log"
	"os"

	"github.com/redis/go-redis/v9"
)

var redisClient *redis.Client

func initRedis() {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		redisURL = "localhost:6379" // fallback for local dev without compose
	}

	redisClient = redis.NewClient(&redis.Options{
		Addr: redisURL,
		DB:   0, // use default DB
	})

	// Test connection
	if err := redisClient.Ping(context.Background()).Err(); err != nil {
		log.Printf("⚠️ Could not connect to Redis at %s: %v", redisURL, err)
	} else {
		log.Printf("✅ Connected to Redis at %s", redisURL)
	}
}

// GetConfig fetches a configuration value from Redis. 
// If it doesn't exist, it returns the provided default value.
func GetConfig(ctx context.Context, key string, defaultValue string) (string, error) {
	if redisClient == nil {
		return defaultValue, nil
	}

	val, err := redisClient.Get(ctx, "config:"+key).Result()
	if err == redis.Nil {
		return defaultValue, nil
	} else if err != nil {
		return defaultValue, err
	}
	return val, nil
}

// SetConfig saves a configuration value to Redis permanently.
func SetConfig(ctx context.Context, key string, value string) error {
	if redisClient == nil {
		return nil
	}
	return redisClient.Set(ctx, "config:"+key, value, 0).Err() // 0 means no expiration
}
