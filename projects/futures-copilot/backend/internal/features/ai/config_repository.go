package ai

import (
	"context"
	"errors"
	"os"
	"strings"
	"time"

	core "futures-copilot-mvp/internal/core"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	FeatureKeyAccountRulesContextScrapeRules = "accountRulesContextScrapeRules"
	FeatureKeyAccountRulesContextCleanupText = "accountRulesContextCleanupText"
	FeatureKeyRubricRulesImproveText         = "rubricRulesImproveText"
	FeatureKeyDraftContextNotesImproveText   = "draftContextNotesImproveText"

	FeatureLabelAccountRulesContextScrapeRules = "Account Rules Context - Scrape From URLs"
	FeatureLabelAccountRulesContextCleanupText = "Account Rules Context - Cleanup Text"
	FeatureLabelRubricRulesImproveText         = "Rubric - Trading Rules & Confluences"
	FeatureLabelDraftContextNotesImproveText   = "Draft Trade - Context Notes"
)

type ProviderConfigRepository interface {
	GetAIProviderConfig(ctx context.Context) (core.AIProviderConfig, error)
	SaveAIProviderConfig(ctx context.Context, config core.AIProviderConfig) error
}

type postgresProviderConfigRepository struct {
	dbGetter func() *pgxpool.Pool
}

func NewPostgresProviderConfigRepository(dbGetter func() *pgxpool.Pool) ProviderConfigRepository {
	return postgresProviderConfigRepository{dbGetter: dbGetter}
}

func DefaultAIProviderConfig() core.AIProviderConfig {
	providers := AvailableAIProviders()
	defaultProvider := FirstAvailableProvider(providers)

	return core.AIProviderConfig{
		Features: []core.AIFeatureConfig{
			{Key: FeatureKeyAccountRulesContextScrapeRules, Label: FeatureLabelAccountRulesContextScrapeRules, Provider: defaultProvider, Model: DefaultModelForFeature(FeatureKeyAccountRulesContextScrapeRules, defaultProvider), TimeoutMs: 15000},
			{Key: FeatureKeyAccountRulesContextCleanupText, Label: FeatureLabelAccountRulesContextCleanupText, Provider: defaultProvider, Model: DefaultModelForFeature(FeatureKeyAccountRulesContextCleanupText, defaultProvider), TimeoutMs: 15000},
			{Key: FeatureKeyRubricRulesImproveText, Label: FeatureLabelRubricRulesImproveText, Provider: defaultProvider, Model: DefaultModelForFeature(FeatureKeyRubricRulesImproveText, defaultProvider), TimeoutMs: 15000},
			{Key: FeatureKeyDraftContextNotesImproveText, Label: FeatureLabelDraftContextNotesImproveText, Provider: defaultProvider, Model: DefaultModelForFeature(FeatureKeyDraftContextNotesImproveText, defaultProvider), TimeoutMs: 15000},
		},
		TimeoutMs:          15000,
		AvailableProviders: providers,
		ModelPresets:       DefaultModelPresets(),
	}
}

func (r postgresProviderConfigRepository) GetAIProviderConfig(ctx context.Context) (core.AIProviderConfig, error) {
	pool := r.dbGetter()
	if pool == nil {
		return core.AIProviderConfig{}, errors.New("postgres is not initialized")
	}

	defaultCfg := DefaultAIProviderConfig()

	config := core.AIProviderConfig{
		TimeoutMs:          defaultCfg.TimeoutMs,
		AvailableProviders: AvailableAIProviders(),
	}

	var updatedAt time.Time
	err := pool.QueryRow(ctx, selectAIFeatureConfigUpdatedAtQuery).Scan(&updatedAt)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return core.AIProviderConfig{}, err
	}
	if updatedAt.IsZero() {
		updatedAt = time.Now()
	}
	config.UpdatedAt = updatedAt.Format(time.RFC3339)

	rows, err := pool.Query(ctx, selectAIFeatureConfigsQuery)
	if err != nil {
		return core.AIProviderConfig{}, err
	}
	defer rows.Close()

	features := make([]core.AIFeatureConfig, 0)
	for rows.Next() {
		var f core.AIFeatureConfig
		if err := rows.Scan(&f.Key, &f.Label, &f.Provider, &f.Model, &f.TimeoutMs); err != nil {
			continue
		}

		f.Provider = NormalizeProviderKey(f.Provider)

		if strings.TrimSpace(f.Label) == "" {
			f.Label = f.Key
		}
		if !IsProviderAvailable(f.Provider, config.AvailableProviders) {
			f.Provider = FirstAvailableProvider(config.AvailableProviders)
			f.Model = DefaultModelForFeature(f.Key, f.Provider)
		}
		if strings.TrimSpace(f.Model) == "" {
			f.Model = DefaultModelForFeature(f.Key, f.Provider)
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

	presetRows, err := pool.Query(ctx, selectAIModelPresetsQuery)
	if err == nil {
		defer presetRows.Close()
		for presetRows.Next() {
			var provider string
			var model string
			if scanErr := presetRows.Scan(&provider, &model); scanErr != nil {
				continue
			}
			provider = NormalizeProviderKey(provider)
			config.ModelPresets[provider] = AppendUniqueString(config.ModelPresets[provider], model)
		}
	}

	if len(config.ModelPresets) == 0 {
		config.ModelPresets = DefaultModelPresets()
	}

	for _, f := range config.Features {
		switch f.Key {
		case FeatureKeyAccountRulesContextScrapeRules:
			config.ScrapeRulesProvider = f.Provider
			config.ScrapeRulesModel = f.Model
		case FeatureKeyAccountRulesContextCleanupText:
			config.CleanupTextProvider = f.Provider
			config.CleanupTextModel = f.Model
		}
	}

	return config, nil
}

func (r postgresProviderConfigRepository) SaveAIProviderConfig(ctx context.Context, config core.AIProviderConfig) error {
	pool := r.dbGetter()
	if pool == nil {
		return errors.New("postgres is not initialized")
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback(ctx) }()

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
			feature.Provider = FirstAvailableProvider(config.AvailableProviders)
		}
		feature.Provider = NormalizeProviderKey(feature.Provider)
		if strings.TrimSpace(feature.Model) == "" {
			feature.Model = DefaultModelForFeature(feature.Key, feature.Provider)
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

func AvailableAIProviders() []string {
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

func IsProviderAvailable(provider string, availableProviders []string) bool {
	provider = NormalizeProviderKey(provider)
	for _, available := range availableProviders {
		if provider == NormalizeProviderKey(available) {
			return true
		}
	}

	return false
}

func FirstAvailableProvider(availableProviders []string) string {
	if len(availableProviders) == 0 {
		return "mock"
	}

	return availableProviders[0]
}

func DefaultModelForProvider(provider string) string {
	switch NormalizeProviderKey(provider) {
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

func DefaultModelForFeature(featureKey string, provider string) string {
	p := NormalizeProviderKey(provider)

	switch strings.TrimSpace(featureKey) {
	case FeatureKeyAccountRulesContextCleanupText, FeatureKeyDraftContextNotesImproveText:
		switch p {
		case "openrouter":
			return "google/gemini-2.5-flash"
		case "google":
			return "gemini-2.5-flash"
		case "anthropic":
			return "claude-3-5-haiku-latest"
		default:
			return DefaultModelForProvider(provider)
		}
	default:
		return DefaultModelForProvider(provider)
	}
}

func DefaultModelPresets() map[string][]string {
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

func NormalizeProviderKey(provider string) string {
	p := strings.ToLower(strings.TrimSpace(provider))
	switch p {
	case "gemini", "google":
		return "google"
	default:
		return p
	}
}

func AppendUniqueString(existing []string, value string) []string {
	for _, item := range existing {
		if item == value {
			return existing
		}
	}
	return append(existing, value)
}

const (
	selectAIFeatureConfigsQuery = `
		SELECT feature_key, label, provider, model, timeout_ms
		FROM ai_feature_configs
		ORDER BY feature_key ASC
	`

	selectAIFeatureConfigUpdatedAtQuery = `
		SELECT COALESCE(MAX(updated_at), CURRENT_TIMESTAMP)
		FROM ai_feature_configs
	`

	upsertAIFeatureConfigQuery = `
		INSERT INTO ai_feature_configs (feature_key, label, provider, model, timeout_ms, updated_at)
		VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
		ON CONFLICT (feature_key) DO UPDATE SET
			label = EXCLUDED.label,
			provider = EXCLUDED.provider,
			model = EXCLUDED.model,
			timeout_ms = EXCLUDED.timeout_ms,
			updated_at = CURRENT_TIMESTAMP
	`

	deleteAIFeatureConfigsNotInQuery = `
		DELETE FROM ai_feature_configs
		WHERE feature_key <> ALL($1::text[])
	`

	selectAIModelPresetsQuery = `
		SELECT provider, model
		FROM ai_model_presets
		ORDER BY provider ASC, sort_order ASC, model ASC
	`
)
