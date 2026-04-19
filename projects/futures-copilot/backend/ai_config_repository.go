package main

import (
	"context"
	"errors"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type AIProviderConfigRepository interface {
	GetAIProviderConfig(ctx context.Context) (AIProviderConfig, error)
	SaveAIProviderConfig(ctx context.Context, config AIProviderConfig) error
}

type PostgresAIProviderConfigRepository struct{}

func defaultAIProviderConfig() AIProviderConfig {
	providers := availableAIProviders()
	defaultProvider := firstAvailableProvider(providers)

	return AIProviderConfig{
		ScrapeRulesProvider: defaultProvider,
		ScrapeRulesModel:    defaultModelForProvider(defaultProvider),
		CleanupTextProvider: defaultProvider,
		CleanupTextModel:    defaultModelForProvider(defaultProvider),
		TimeoutMs:           15000,
		AvailableProviders:  providers,
	}
}

func (PostgresAIProviderConfigRepository) GetAIProviderConfig(ctx context.Context) (AIProviderConfig, error) {
	defaultCfg := defaultAIProviderConfig()

	var config AIProviderConfig
	var updatedAt time.Time
	err := db.QueryRow(ctx, selectAIProviderConfigQuery).Scan(
		&config.ScrapeRulesProvider,
		&config.ScrapeRulesModel,
		&config.CleanupTextProvider,
		&config.CleanupTextModel,
		&config.TimeoutMs,
		&updatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return defaultCfg, nil
	}
	if err != nil {
		return AIProviderConfig{}, err
	}

	config.UpdatedAt = updatedAt.Format(time.RFC3339)
	config.AvailableProviders = availableAIProviders()
	if !isProviderAvailable(config.ScrapeRulesProvider, config.AvailableProviders) {
		config.ScrapeRulesProvider = firstAvailableProvider(config.AvailableProviders)
		config.ScrapeRulesModel = defaultModelForProvider(config.ScrapeRulesProvider)
	}

	if !isProviderAvailable(config.CleanupTextProvider, config.AvailableProviders) {
		config.CleanupTextProvider = firstAvailableProvider(config.AvailableProviders)
		config.CleanupTextModel = defaultModelForProvider(config.CleanupTextProvider)
	}

	if strings.TrimSpace(config.ScrapeRulesModel) == "" {
		config.ScrapeRulesModel = defaultModelForProvider(config.ScrapeRulesProvider)
	}

	if strings.TrimSpace(config.CleanupTextModel) == "" {
		config.CleanupTextModel = defaultModelForProvider(config.CleanupTextProvider)
	}

	return config, nil
}

func (PostgresAIProviderConfigRepository) SaveAIProviderConfig(ctx context.Context, config AIProviderConfig) error {
	_, err := db.Exec(ctx, upsertAIProviderConfigQuery,
		config.ScrapeRulesProvider,
		config.ScrapeRulesModel,
		config.CleanupTextProvider,
		config.CleanupTextModel,
		config.TimeoutMs,
	)
	return err
}

var aiProviderConfigRepo AIProviderConfigRepository = PostgresAIProviderConfigRepository{}

func availableAIProviders() []string {
	providers := make([]string, 0, 4)

	if strings.TrimSpace(os.Getenv("OPENROUTER_API_KEY")) != "" {
		providers = append(providers, "openrouter")
	}

	if strings.TrimSpace(os.Getenv("GEMINI_API_KEY")) != "" {
		providers = append(providers, "gemini")
	}

	if strings.TrimSpace(os.Getenv("ANTHROPIC_API_KEY")) != "" {
		providers = append(providers, "anthropic")
	}

	if len(providers) == 0 {
		providers = append(providers, "mock")
	}

	return providers
}

func isProviderAvailable(provider string, availableProviders []string) bool {
	for _, available := range availableProviders {
		if provider == available {
			return true
		}
	}

	return false
}

func firstAvailableProvider(availableProviders []string) string {
	if len(availableProviders) == 0 {
		return "mock"
	}

	return availableProviders[0]
}

func defaultModelForProvider(provider string) string {
	switch provider {
	case "openrouter":
		return "google/gemini-2.0-flash-001"
	case "gemini":
		return "gemini-2.0-flash"
	case "anthropic":
		return "claude-3-5-haiku-latest"
	default:
		return "mock-fast"
	}
}
