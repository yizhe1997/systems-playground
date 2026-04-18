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
