package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	HTTPAddr        string
	PostgresURL     string
	RedisAddr       string
	RedisPassword   string
	RedisDB         int
	RedpandaBrokers []string
	MigrationsDir   string
}

func Load() (Config, error) {
	cfg := Config{
		HTTPAddr:      getOrDefault("HTTP_ADDR", ":8091"),
		PostgresURL:   os.Getenv("POSTGRES_URL"),
		RedisAddr:     getOrDefault("REDIS_ADDR", "localhost:6379"),
		RedisPassword: os.Getenv("REDIS_PASSWORD"),
		RedisDB:       getIntOrDefault("REDIS_DB", 0),
		MigrationsDir: getOrDefault("MIGRATIONS_DIR", "migrations"),
	}

	brokers := strings.TrimSpace(os.Getenv("REDPANDA_BROKERS"))
	if brokers == "" {
		cfg.RedpandaBrokers = []string{"localhost:19092"}
	} else {
		cfg.RedpandaBrokers = strings.Split(brokers, ",")
		for i := range cfg.RedpandaBrokers {
			cfg.RedpandaBrokers[i] = strings.TrimSpace(cfg.RedpandaBrokers[i])
		}
	}

	if err := cfg.Validate(); err != nil {
		return Config{}, err
	}

	return cfg, nil
}

func (c Config) Validate() error {
	var missing []string
	if strings.TrimSpace(c.PostgresURL) == "" {
		missing = append(missing, "POSTGRES_URL")
	}
	if len(c.RedpandaBrokers) == 0 {
		missing = append(missing, "REDPANDA_BROKERS")
	}
	if len(missing) > 0 {
		return fmt.Errorf("missing required environment variables: %s", strings.Join(missing, ", "))
	}
	return nil
}

func getOrDefault(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}

func getIntOrDefault(key string, fallback int) int {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		return fallback
	}
	var parsed int
	if _, err := fmt.Sscanf(v, "%d", &parsed); err != nil {
		return fallback
	}
	return parsed
}
