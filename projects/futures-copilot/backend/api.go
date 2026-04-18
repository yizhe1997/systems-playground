package main

import (
	"github.com/gofiber/fiber/v2"
)

// SetupCopilotRoutes registers all API endpoints
func SetupCopilotRoutes(app *fiber.App) {
	api := app.Group("/api/copilot")
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

	ai.Post("/scrape-rules", scrapeRules)
	ai.Post("/improve-rules", improveRules)

	users.Post("/sync", syncUser)
	users.Put("/disable", disableUser)
}
