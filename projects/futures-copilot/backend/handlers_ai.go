package main

import (
	"context"
	"errors"
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

func getAIAvailability(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{"availableProviders": availableAIProviders()})
}

func getAIProviderConfig(c *fiber.Ctx) error {
	config, err := aiProviderConfigRepo.GetAIProviderConfig(context.Background())
	if err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to fetch AI provider config", err)
	}

	return c.JSON(fiber.Map{
		"features":           config.Features,
		"timeoutMs":          config.TimeoutMs,
		"updatedAt":          config.UpdatedAt,
		"availableProviders": config.AvailableProviders,
		"modelPresets":       config.ModelPresets,
	})
}

func updateAIProviderConfig(c *fiber.Ctx) error {
	var req updateAIProviderConfigRequest
	if err := parseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}

	if validationMessage := validateAIProviderConfig(req); validationMessage != "" {
		return jsonError(c, fiber.StatusBadRequest, validationMessage)
	}

	availableProviders := availableAIProviders()

	config := AIProviderConfig{TimeoutMs: req.TimeoutMs, AvailableProviders: availableProviders}

	for _, f := range req.Features {
		if !isProviderAvailable(f.Provider, availableProviders) {
			return jsonError(c, fiber.StatusBadRequest, "Provider "+f.Provider+" is not available (missing API key)")
		}
		timeoutMs := f.TimeoutMs
		if timeoutMs <= 0 {
			if req.TimeoutMs > 0 {
				timeoutMs = req.TimeoutMs
			} else {
				timeoutMs = 15000
			}
		}
		config.Features = append(config.Features, AIFeatureConfig{
			Key:       strings.TrimSpace(f.Key),
			Label:     strings.TrimSpace(f.Label),
			Provider:  strings.TrimSpace(f.Provider),
			Model:     strings.TrimSpace(f.Model),
			TimeoutMs: timeoutMs,
		})
	}

	if err := aiProviderConfigRepo.SaveAIProviderConfig(context.Background(), config); err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to save AI provider config", err)
	}

	return c.JSON(fiber.Map{"status": "saved"})
}

func scrapeAccountRules(c *fiber.Ctx) error {
	startedAt := time.Now()

	var req scrapeRulesRequest
	if err := parseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}
	if len(req.URLs) == 0 {
		return jsonError(c, fiber.StatusBadRequest, "Missing urls")
	}
	if strings.TrimSpace(req.AccountType) == "" {
		return jsonError(c, fiber.StatusBadRequest, "Missing accountType")
	}

	log.Printf("level=info req_id=%s method=%s path=%s event=%s account_type=%q url_count=%d", c.Locals("requestid"), c.Method(), c.OriginalURL(), "ai_scrape_account_rules_start", req.AccountType, len(req.URLs))

	config, err := aiProviderConfigRepo.GetAIProviderConfig(context.Background())
	if err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to resolve AI provider config", err)
	}

	featureCfg, err := resolveFeatureConfig(config, req.FeatureKey, AIFeatureKeyAccountRulesContextScrapeRules)
	if err != nil {
		return jsonError(c, fiber.StatusBadRequest, err.Error())
	}

	compiledSource, err := compileURLSourceText(req.URLs)
	if err != nil {
		return logAndJSONError(c, fiber.StatusBadGateway, "Failed to fetch source urls", err)
	}

	contextText, err := extractAccountRulesSummary(
		featureCfg.Provider,
		featureCfg.Model,
		featureCfg.TimeoutMs,
		req.AccountType,
		compiledSource,
	)
	if err != nil {
		return logAndJSONError(c, fiber.StatusBadGateway, "Failed to extract rules context", err)
	}

	log.Printf("level=info req_id=%s method=%s path=%s event=%s provider=%s model=%s feature_key=%s latency_ms=%d", c.Locals("requestid"), c.Method(), c.OriginalURL(), "ai_scrape_account_rules_success", featureCfg.Provider, featureCfg.Model, featureCfg.Key, time.Since(startedAt).Milliseconds())

	return c.JSON(fiber.Map{"context": contextText})
}

func improveText(c *fiber.Ctx) error {
	startedAt := time.Now()

	var req improveTextRequest
	if err := parseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}
	if strings.TrimSpace(req.Text) == "" {
		return jsonError(c, fiber.StatusBadRequest, "Missing text")
	}

	log.Printf("level=info req_id=%s method=%s path=%s event=%s text_len=%d", c.Locals("requestid"), c.Method(), c.OriginalURL(), "ai_improve_text_start", len(req.Text))

	config, err := aiProviderConfigRepo.GetAIProviderConfig(context.Background())
	if err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to resolve AI provider config", err)
	}

	featureCfg, err := resolveFeatureConfig(config, req.FeatureKey, AIFeatureKeyDraftContextNotesImproveText)
	if err != nil {
		return jsonError(c, fiber.StatusBadRequest, err.Error())
	}

	improved, err := improveGeneralText(
		featureCfg.Provider,
		featureCfg.Model,
		featureCfg.TimeoutMs,
		featureCfg.Key,
		req.Text,
	)
	if err != nil {
		return logAndJSONError(c, fiber.StatusBadGateway, "Failed to improve text", err)
	}

	log.Printf("level=info req_id=%s method=%s path=%s event=%s provider=%s model=%s feature_key=%s latency_ms=%d", c.Locals("requestid"), c.Method(), c.OriginalURL(), "ai_improve_text_success", featureCfg.Provider, featureCfg.Model, featureCfg.Key, time.Since(startedAt).Milliseconds())

	return c.JSON(fiber.Map{"text": improved})
}

func improveAccountRules(c *fiber.Ctx) error {
	startedAt := time.Now()

	var req improveRulesRequest
	if err := parseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}
	if strings.TrimSpace(req.Text) == "" {
		return jsonError(c, fiber.StatusBadRequest, "Missing text")
	}
	if strings.TrimSpace(req.AccountType) == "" {
		return jsonError(c, fiber.StatusBadRequest, "Missing accountType")
	}

	log.Printf("level=info req_id=%s method=%s path=%s event=%s account_type=%q text_len=%d", c.Locals("requestid"), c.Method(), c.OriginalURL(), "ai_improve_account_rules_start", req.AccountType, len(req.Text))

	config, err := aiProviderConfigRepo.GetAIProviderConfig(context.Background())
	if err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to resolve AI provider config", err)
	}

	featureCfg, err := resolveFeatureConfig(config, req.FeatureKey, AIFeatureKeyAccountRulesContextCleanupText)
	if err != nil {
		return jsonError(c, fiber.StatusBadRequest, err.Error())
	}

	contextText, err := extractAccountRulesSummary(
		featureCfg.Provider,
		featureCfg.Model,
		featureCfg.TimeoutMs,
		req.AccountType,
		req.Text,
	)
	if err != nil {
		return logAndJSONError(c, fiber.StatusBadGateway, "Failed to improve rules context", err)
	}

	log.Printf("level=info req_id=%s method=%s path=%s event=%s provider=%s model=%s feature_key=%s latency_ms=%d", c.Locals("requestid"), c.Method(), c.OriginalURL(), "ai_improve_account_rules_success", featureCfg.Provider, featureCfg.Model, featureCfg.Key, time.Since(startedAt).Milliseconds())

	return c.JSON(fiber.Map{"context": contextText})
}

func resolveFeatureConfig(config AIProviderConfig, featureKey string, fallbackKey string) (AIFeatureConfig, error) {
	key := strings.TrimSpace(featureKey)
	if key == "" {
		key = fallbackKey
	}

	for _, feature := range config.Features {
		if feature.Key == key {
			if strings.TrimSpace(feature.Provider) == "" || strings.TrimSpace(feature.Model) == "" {
				return AIFeatureConfig{}, errors.New("Feature " + key + " is missing provider/model configuration")
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

	// Back-compat: allow legacy flat fields when features array is not populated
	// (primarily for tests and transitional callers).
	switch key {
	case AIFeatureKeyAccountRulesContextScrapeRules:
		if strings.TrimSpace(config.ScrapeRulesProvider) != "" && strings.TrimSpace(config.ScrapeRulesModel) != "" {
			return AIFeatureConfig{Key: key, Provider: config.ScrapeRulesProvider, Model: config.ScrapeRulesModel, TimeoutMs: config.TimeoutMs}, nil
		}
	case AIFeatureKeyAccountRulesContextCleanupText, AIFeatureKeyRubricRulesImproveText, AIFeatureKeyDraftContextNotesImproveText:
		if strings.TrimSpace(config.CleanupTextProvider) != "" && strings.TrimSpace(config.CleanupTextModel) != "" {
			return AIFeatureConfig{Key: key, Provider: config.CleanupTextProvider, Model: config.CleanupTextModel, TimeoutMs: config.TimeoutMs}, nil
		}
	}

	return AIFeatureConfig{}, errors.New("Unknown AI feature key: " + key)
}
