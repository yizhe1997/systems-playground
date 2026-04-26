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
		Features: []AIFeatureConfig{
			{Key: AIFeatureKeyAccountRulesContextScrapeRules, Label: AIFeatureLabelAccountRulesContextScrapeRules, Provider: defaultProvider, Model: defaultModelForFeature(AIFeatureKeyAccountRulesContextScrapeRules, defaultProvider), TimeoutMs: 15000},
			{Key: AIFeatureKeyAccountRulesContextCleanupText, Label: AIFeatureLabelAccountRulesContextCleanupText, Provider: defaultProvider, Model: defaultModelForFeature(AIFeatureKeyAccountRulesContextCleanupText, defaultProvider), TimeoutMs: 15000},
			{Key: AIFeatureKeyRubricRulesImproveText, Label: AIFeatureLabelRubricRulesImproveText, Provider: defaultProvider, Model: defaultModelForFeature(AIFeatureKeyRubricRulesImproveText, defaultProvider), TimeoutMs: 15000},
			{Key: AIFeatureKeyDraftContextNotesImproveText, Label: AIFeatureLabelDraftContextNotesImproveText, Provider: defaultProvider, Model: defaultModelForFeature(AIFeatureKeyDraftContextNotesImproveText, defaultProvider), TimeoutMs: 15000},
		},
		TimeoutMs:          15000,
		AvailableProviders: providers,
		ModelPresets:       defaultModelPresets(),
	}
}

func (PostgresAIProviderConfigRepository) GetAIProviderConfig(ctx context.Context) (AIProviderConfig, error) {
	defaultCfg := defaultAIProviderConfig()

	var config AIProviderConfig
	var updatedAt time.Time
	err := db.QueryRow(ctx, selectAIProviderConfigQuery).Scan(&config.TimeoutMs, &updatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return defaultCfg, nil
	}
	if err != nil {
		return AIProviderConfig{}, err
	}

	config.UpdatedAt = updatedAt.Format(time.RFC3339)
	config.AvailableProviders = availableAIProviders()

	rows, err := db.Query(ctx, selectAIFeatureConfigsQuery)
	if err != nil {
		return AIProviderConfig{}, err
	}
	defer rows.Close()

	features := make([]AIFeatureConfig, 0)
	for rows.Next() {
		var f AIFeatureConfig
		if err := rows.Scan(&f.Key, &f.Label, &f.Provider, &f.Model, &f.TimeoutMs); err != nil {
			continue
		}

		f.Provider = normalizeProviderKey(f.Provider)

		if strings.TrimSpace(f.Label) == "" {
			f.Label = f.Key
		}
		if !isProviderAvailable(f.Provider, config.AvailableProviders) {
			f.Provider = firstAvailableProvider(config.AvailableProviders)
			f.Model = defaultModelForFeature(f.Key, f.Provider)
		}
		if strings.TrimSpace(f.Model) == "" {
			f.Model = defaultModelForFeature(f.Key, f.Provider)
		}
		if f.TimeoutMs <= 0 {
			if config.TimeoutMs > 0 {
				f.TimeoutMs = config.TimeoutMs
			} else {
				f.TimeoutMs = 15000
			}
		}

		features = append(features, f)
	}

	if len(features) == 0 {
		features = defaultCfg.Features
	}

	config.Features = features
	if len(config.Features) > 0 && config.Features[0].TimeoutMs > 0 {
		config.TimeoutMs = config.Features[0].TimeoutMs
	}
	config.ModelPresets = map[string][]string{}

	presetRows, err := db.Query(ctx, selectAIModelPresetsQuery)
	if err == nil {
		defer presetRows.Close()
		for presetRows.Next() {
			var provider string
			var model string
			if scanErr := presetRows.Scan(&provider, &model); scanErr != nil {
				continue
			}
			provider = normalizeProviderKey(provider)
			config.ModelPresets[provider] = appendUniqueString(config.ModelPresets[provider], model)
		}
	}

	if len(config.ModelPresets) == 0 {
		config.ModelPresets = defaultModelPresets()
	}

	// Back-compat mirror fields.
	for _, f := range config.Features {
		switch f.Key {
		case AIFeatureKeyAccountRulesContextScrapeRules:
			config.ScrapeRulesProvider = f.Provider
			config.ScrapeRulesModel = f.Model
		case AIFeatureKeyAccountRulesContextCleanupText:
			config.CleanupTextProvider = f.Provider
			config.CleanupTextModel = f.Model
		}
	}

	return config, nil
}

func (PostgresAIProviderConfigRepository) SaveAIProviderConfig(ctx context.Context, config AIProviderConfig) error {
	tx, err := db.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	effectiveTimeoutMs := config.TimeoutMs
	if len(config.Features) > 0 && config.Features[0].TimeoutMs > 0 {
		effectiveTimeoutMs = config.Features[0].TimeoutMs
	}
	if effectiveTimeoutMs <= 0 {
		effectiveTimeoutMs = 15000
	}

	if _, err := tx.Exec(ctx, upsertAIProviderConfigQuery, effectiveTimeoutMs); err != nil {
		return err
	}

	keys := make([]string, 0, len(config.Features))
	for _, f := range config.Features {
		feature := f
		if strings.TrimSpace(feature.Key) == "" {
			continue
		}
		if strings.TrimSpace(feature.Label) == "" {
			feature.Label = feature.Key
		}
		if strings.TrimSpace(feature.Provider) == "" {
			feature.Provider = firstAvailableProvider(config.AvailableProviders)
		}
		feature.Provider = normalizeProviderKey(feature.Provider)
		if strings.TrimSpace(feature.Model) == "" {
			feature.Model = defaultModelForFeature(feature.Key, feature.Provider)
		}
		if feature.TimeoutMs <= 0 {
			if config.TimeoutMs > 0 {
				feature.TimeoutMs = config.TimeoutMs
			} else {
				feature.TimeoutMs = 15000
			}
		}

		keys = append(keys, feature.Key)
		if _, err := tx.Exec(ctx, upsertAIFeatureConfigQuery, feature.Key, feature.Label, feature.Provider, feature.Model, feature.TimeoutMs); err != nil {
			return err
		}
	}

	if len(keys) > 0 {
		if _, err := tx.Exec(ctx, deleteAIFeatureConfigsNotInQuery, keys); err != nil {
			return err
		}
	}

	return tx.Commit(ctx)
}

var aiProviderConfigRepo AIProviderConfigRepository = PostgresAIProviderConfigRepository{}

func availableAIProviders() []string {
	providers := make([]string, 0, 4)

	if strings.TrimSpace(os.Getenv("OPENROUTER_API_KEY")) != "" {
		providers = append(providers, "openrouter")
	}

	if strings.TrimSpace(os.Getenv("GEMINI_API_KEY")) != "" {
		providers = append(providers, "google")
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
	provider = normalizeProviderKey(provider)
	for _, available := range availableProviders {
		if provider == normalizeProviderKey(available) {
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
	switch normalizeProviderKey(provider) {
	case "openrouter":
		return "google/gemini-2.5-pro"
	case "google":
		return "gemini-2.5-pro"
	case "anthropic":
		return "claude-3-5-sonnet-latest"
	default:
		return "mock-fast"
	}
}

func defaultModelForFeature(featureKey string, provider string) string {
	p := normalizeProviderKey(provider)

	switch strings.TrimSpace(featureKey) {
	case AIFeatureKeyAccountRulesContextCleanupText, AIFeatureKeyDraftContextNotesImproveText:
		switch p {
		case "openrouter":
			return "google/gemini-2.5-flash"
		case "google":
			return "gemini-2.5-flash"
		case "anthropic":
			return "claude-3-5-haiku-latest"
		default:
			return defaultModelForProvider(provider)
		}
	default:
		return defaultModelForProvider(provider)
	}
}

func defaultModelPresets() map[string][]string {
	return map[string][]string{
		"openrouter": {
			"openrouter/free",
			"google/gemini-2.5-pro",
			"google/gemini-2.5-flash",
		},
		"google": {
			"gemini-2.5-pro",
			"gemini-2.5-flash",
		},
		"anthropic": {
			"claude-3-5-sonnet-latest",
			"claude-3-5-haiku-latest",
		},
	}
}

func normalizeProviderKey(provider string) string {
	p := strings.ToLower(strings.TrimSpace(provider))
	switch p {
	case "gemini", "google":
		return "google"
	default:
		return p
	}
}

func appendUniqueString(existing []string, value string) []string {
	for _, item := range existing {
		if item == value {
			return existing
		}
	}
	return append(existing, value)
}
