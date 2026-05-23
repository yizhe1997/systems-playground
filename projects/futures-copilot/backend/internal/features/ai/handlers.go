package ai

import (
	"context"
	"errors"
	"log"
	"strings"
	"time"

	core "futures-copilot-mvp/internal/core"

	"github.com/gofiber/fiber/v2"
)

type ExtractionDependencies struct {
	CompileURLSourceText       func(urls []string) (string, error)
	ExtractAccountRulesSummary func(provider string, model string, timeoutMs int, accountType string, source string) (string, error)
	ImproveGeneralText         func(provider string, model string, timeoutMs int, featureKey string, text string) (string, error)
}

func GetAIAvailability(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"availableProviders": AvailableAIProviders()})
}

func GetAIProviderConfig(c *fiber.Ctx, repo ProviderConfigRepository) error {
	config, err := repo.GetAIProviderConfig(context.Background())
	if err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to fetch AI provider config", err)
	}

	return c.JSON(fiber.Map{
		"features":           config.Features,
		"timeoutMs":          config.TimeoutMs,
		"updatedAt":          config.UpdatedAt,
		"availableProviders": config.AvailableProviders,
		"modelPresets":       config.ModelPresets,
	})
}

func UpdateAIProviderConfig(c *fiber.Ctx, repo ProviderConfigRepository) error {
	var req core.UpdateAIProviderConfigRequest
	if err := core.ParseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}

	if validationMessage := core.ValidateAIProviderConfig(req); validationMessage != "" {
		return core.JSONError(c, fiber.StatusBadRequest, validationMessage)
	}

	availableProviders := AvailableAIProviders()
	config := core.AIProviderConfig{TimeoutMs: req.TimeoutMs, AvailableProviders: availableProviders}

	for _, f := range req.Features {
		if !IsProviderAvailable(f.Provider, availableProviders) {
			return core.JSONError(c, fiber.StatusBadRequest, "Provider "+f.Provider+" is not available (missing API key)")
		}
		timeoutMs := f.TimeoutMs
		if timeoutMs <= 0 {
			if req.TimeoutMs > 0 {
				timeoutMs = req.TimeoutMs
			} else {
				timeoutMs = 15000
			}
		}
		config.Features = append(config.Features, core.AIFeatureConfig{
			Key:       strings.TrimSpace(f.Key),
			Label:     strings.TrimSpace(f.Label),
			Provider:  strings.TrimSpace(f.Provider),
			Model:     strings.TrimSpace(f.Model),
			TimeoutMs: timeoutMs,
		})
	}

	if err := repo.SaveAIProviderConfig(context.Background(), config); err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to save AI provider config", err)
	}

	return c.JSON(fiber.Map{"status": "saved"})
}

func ScrapeAccountRules(c *fiber.Ctx, repo ProviderConfigRepository, deps ExtractionDependencies) error {
	startedAt := time.Now()

	var req core.ScrapeRulesRequest
	if err := core.ParseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}
	if len(req.URLs) == 0 {
		return core.JSONError(c, fiber.StatusBadRequest, "Missing urls")
	}
	if strings.TrimSpace(req.AccountType) == "" {
		return core.JSONError(c, fiber.StatusBadRequest, "Missing accountType")
	}

	log.Printf("level=info req_id=%s method=%s path=%s event=%s account_type=%q url_count=%d", c.Locals("requestid"), c.Method(), c.OriginalURL(), "ai_scrape_account_rules_start", req.AccountType, len(req.URLs))

	config, err := repo.GetAIProviderConfig(context.Background())
	if err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to resolve AI provider config", err)
	}

	featureCfg, err := ResolveFeatureConfig(config, req.FeatureKey, FeatureKeyAccountRulesContextScrapeRules)
	if err != nil {
		return core.JSONError(c, fiber.StatusBadRequest, err.Error())
	}

	if deps.CompileURLSourceText == nil || deps.ExtractAccountRulesSummary == nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to resolve AI extraction dependencies", errors.New("missing scrape dependencies"))
	}

	compiledSource, err := deps.CompileURLSourceText(req.URLs)
	if err != nil {
		return core.LogAndJSONError(c, fiber.StatusBadGateway, "Failed to fetch source urls", err)
	}

	contextText, err := deps.ExtractAccountRulesSummary(featureCfg.Provider, featureCfg.Model, featureCfg.TimeoutMs, req.AccountType, compiledSource)
	if err != nil {
		return core.LogAndJSONError(c, fiber.StatusBadGateway, "Failed to extract rules context", err)
	}

	log.Printf("level=info req_id=%s method=%s path=%s event=%s provider=%s model=%s feature_key=%s latency_ms=%d", c.Locals("requestid"), c.Method(), c.OriginalURL(), "ai_scrape_account_rules_success", featureCfg.Provider, featureCfg.Model, featureCfg.Key, time.Since(startedAt).Milliseconds())

	return c.JSON(fiber.Map{"context": contextText})
}

func ImproveText(c *fiber.Ctx, repo ProviderConfigRepository, deps ExtractionDependencies) error {
	startedAt := time.Now()

	var req core.ImproveTextRequest
	if err := core.ParseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}
	if strings.TrimSpace(req.Text) == "" {
		return core.JSONError(c, fiber.StatusBadRequest, "Missing text")
	}

	log.Printf("level=info req_id=%s method=%s path=%s event=%s text_len=%d", c.Locals("requestid"), c.Method(), c.OriginalURL(), "ai_improve_text_start", len(req.Text))

	config, err := repo.GetAIProviderConfig(context.Background())
	if err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to resolve AI provider config", err)
	}

	featureCfg, err := ResolveFeatureConfig(config, req.FeatureKey, FeatureKeyDraftContextNotesImproveText)
	if err != nil {
		return core.JSONError(c, fiber.StatusBadRequest, err.Error())
	}

	if deps.ImproveGeneralText == nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to resolve AI extraction dependencies", errors.New("missing improve-text dependency"))
	}

	improved, err := deps.ImproveGeneralText(featureCfg.Provider, featureCfg.Model, featureCfg.TimeoutMs, featureCfg.Key, req.Text)
	if err != nil {
		return core.LogAndJSONError(c, fiber.StatusBadGateway, "Failed to improve text", err)
	}

	log.Printf("level=info req_id=%s method=%s path=%s event=%s provider=%s model=%s feature_key=%s latency_ms=%d", c.Locals("requestid"), c.Method(), c.OriginalURL(), "ai_improve_text_success", featureCfg.Provider, featureCfg.Model, featureCfg.Key, time.Since(startedAt).Milliseconds())

	return c.JSON(fiber.Map{"text": improved})
}

func ImproveAccountRules(c *fiber.Ctx, repo ProviderConfigRepository, deps ExtractionDependencies) error {
	startedAt := time.Now()

	var req core.ImproveRulesRequest
	if err := core.ParseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}
	if strings.TrimSpace(req.Text) == "" {
		return core.JSONError(c, fiber.StatusBadRequest, "Missing text")
	}
	if strings.TrimSpace(req.AccountType) == "" {
		return core.JSONError(c, fiber.StatusBadRequest, "Missing accountType")
	}

	log.Printf("level=info req_id=%s method=%s path=%s event=%s account_type=%q text_len=%d", c.Locals("requestid"), c.Method(), c.OriginalURL(), "ai_improve_account_rules_start", req.AccountType, len(req.Text))

	config, err := repo.GetAIProviderConfig(context.Background())
	if err != nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to resolve AI provider config", err)
	}

	featureCfg, err := ResolveFeatureConfig(config, req.FeatureKey, FeatureKeyAccountRulesContextCleanupText)
	if err != nil {
		return core.JSONError(c, fiber.StatusBadRequest, err.Error())
	}

	if deps.ExtractAccountRulesSummary == nil {
		return core.LogAndJSONError(c, fiber.StatusInternalServerError, "Failed to resolve AI extraction dependencies", errors.New("missing improve-rules dependency"))
	}

	contextText, err := deps.ExtractAccountRulesSummary(featureCfg.Provider, featureCfg.Model, featureCfg.TimeoutMs, req.AccountType, req.Text)
	if err != nil {
		return core.LogAndJSONError(c, fiber.StatusBadGateway, "Failed to improve rules context", err)
	}

	log.Printf("level=info req_id=%s method=%s path=%s event=%s provider=%s model=%s feature_key=%s latency_ms=%d", c.Locals("requestid"), c.Method(), c.OriginalURL(), "ai_improve_account_rules_success", featureCfg.Provider, featureCfg.Model, featureCfg.Key, time.Since(startedAt).Milliseconds())

	return c.JSON(fiber.Map{"context": contextText})
}

func ResolveFeatureConfig(config core.AIProviderConfig, featureKey string, fallbackKey string) (core.AIFeatureConfig, error) {
	key := strings.TrimSpace(featureKey)
	if key == "" {
		key = fallbackKey
	}

	for _, feature := range config.Features {
		if feature.Key == key {
			if strings.TrimSpace(feature.Provider) == "" || strings.TrimSpace(feature.Model) == "" {
				return core.AIFeatureConfig{}, errors.New("Feature " + key + " is missing provider/model configuration")
			}
			if feature.TimeoutMs <= 0 {
				if config.TimeoutMs > 0 {
					feature.TimeoutMs = config.TimeoutMs
				} else {
					feature.TimeoutMs = 15000
				}
			}
			return feature, nil
		}
	}

	switch key {
	case FeatureKeyAccountRulesContextScrapeRules:
		if strings.TrimSpace(config.ScrapeRulesProvider) != "" && strings.TrimSpace(config.ScrapeRulesModel) != "" {
			return core.AIFeatureConfig{Key: key, Provider: config.ScrapeRulesProvider, Model: config.ScrapeRulesModel, TimeoutMs: config.TimeoutMs}, nil
		}
	case FeatureKeyAccountRulesContextCleanupText, FeatureKeyRubricRulesImproveText, FeatureKeyDraftContextNotesImproveText:
		if strings.TrimSpace(config.CleanupTextProvider) != "" && strings.TrimSpace(config.CleanupTextModel) != "" {
			return core.AIFeatureConfig{Key: key, Provider: config.CleanupTextProvider, Model: config.CleanupTextModel, TimeoutMs: config.TimeoutMs}, nil
		}
	}

	return core.AIFeatureConfig{}, errors.New("Unknown AI feature key: " + key)
}
