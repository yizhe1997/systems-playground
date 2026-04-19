package main

import (
	"github.com/gofiber/fiber/v2"
)

// SetupCopilotRoutes registers all API endpoints
func SetupCopilotRoutes(app *fiber.App) {
	registerCopilotRoutes(app, "/api")
	registerCopilotRoutes(app, "/api/copilot")
}

func registerCopilotRoutes(app *fiber.App, basePath string) {
	api := app.Group(basePath)
	accounts := api.Group("/accounts")
	rubrics := api.Group("/rubrics")
	trades := api.Group("/trades")
	ai := api.Group("/ai")
	users := api.Group("/users")

	accounts.Get("", getAccounts)
	accounts.Post("", saveAccount)
	accounts.Delete("/:id", deleteAccount)

	rubrics.Get("", getRubrics)
	rubrics.Post("", saveRubric)
	rubrics.Delete("/:id", deleteRubric)

	trades.Get("", getTrades)
	trades.Put("/:id/status", updateTradeStatus)

	api.Post("/draft", draftTrade)
	api.Post("/journal", journalTrade)

	ai.Post("/scrape-account-rules", requireTrustedAdminRequest(scrapeAccountRules))
	ai.Post("/improve-account-rules", requireTrustedAdminRequest(improveAccountRules))
	ai.Get("/availability", requireTrustedAdminRequest(getAIAvailability))
	ai.Get("/config", requireTrustedAdminRequest(getAIProviderConfig))
	ai.Put("/config", requireTrustedAdminRequest(updateAIProviderConfig))

	users.Post("/sync", requireTrustedInternalRequest(syncUser))
	users.Put("/disable", requireTrustedAdminRequest(disableUser))
}
