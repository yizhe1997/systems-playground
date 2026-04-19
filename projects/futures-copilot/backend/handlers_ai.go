package main

import (
	"context"
	"strings"

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
		"features": []AIFeatureConfig{
			{Key: "scrapeRules", Provider: config.ScrapeRulesProvider, Model: config.ScrapeRulesModel},
			{Key: "cleanupText", Provider: config.CleanupTextProvider, Model: config.CleanupTextModel},
		},
		"timeoutMs":          config.TimeoutMs,
		"updatedAt":          config.UpdatedAt,
		"availableProviders": config.AvailableProviders,
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

	var config AIProviderConfig
	config.TimeoutMs = req.TimeoutMs
	config.AvailableProviders = availableProviders

	for _, f := range req.Features {
		if !isProviderAvailable(f.Provider, availableProviders) {
			return jsonError(c, fiber.StatusBadRequest, "Provider "+f.Provider+" is not available (missing API key)")
		}
		switch f.Key {
		case "scrapeRules":
			config.ScrapeRulesProvider = f.Provider
			config.ScrapeRulesModel = f.Model
		case "cleanupText":
			config.CleanupTextProvider = f.Provider
			config.CleanupTextModel = f.Model
		}
	}

	if err := aiProviderConfigRepo.SaveAIProviderConfig(context.Background(), config); err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to save AI provider config", err)
	}

	return c.JSON(fiber.Map{"status": "saved"})
}

func scrapeAccountRules(c *fiber.Ctx) error {
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

	config, err := aiProviderConfigRepo.GetAIProviderConfig(context.Background())
	if err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to resolve AI provider config", err)
	}

	compiledSource, err := compileURLSourceText(req.URLs)
	if err != nil {
		return logAndJSONError(c, fiber.StatusBadGateway, "Failed to fetch source urls", err)
	}

	contextText, err := extractAccountRulesSummary(
		config.ScrapeRulesProvider,
		config.ScrapeRulesModel,
		config.TimeoutMs,
		req.AccountType,
		compiledSource,
	)
	if err != nil {
		return logAndJSONError(c, fiber.StatusBadGateway, "Failed to extract rules context", err)
	}

	return c.JSON(fiber.Map{"context": contextText})
}

func improveAccountRules(c *fiber.Ctx) error {
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

	config, err := aiProviderConfigRepo.GetAIProviderConfig(context.Background())
	if err != nil {
		return logAndJSONError(c, fiber.StatusInternalServerError, "Failed to resolve AI provider config", err)
	}

	contextText, err := extractAccountRulesSummary(
		config.CleanupTextProvider,
		config.CleanupTextModel,
		config.TimeoutMs,
		req.AccountType,
		req.Text,
	)
	if err != nil {
		return logAndJSONError(c, fiber.StatusBadGateway, "Failed to improve rules context", err)
	}

	return c.JSON(fiber.Map{"context": contextText})
}
