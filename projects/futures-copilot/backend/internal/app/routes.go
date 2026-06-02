package app

import (
	accountsfeature "futures-copilot-mvp/internal/features/accounts"
	aifeature "futures-copilot-mvp/internal/features/ai"
	alertsfeature "futures-copilot-mvp/internal/features/alerts"
	authrecaptchafeature "futures-copilot-mvp/internal/features/authrecaptcha"
	contactfeature "futures-copilot-mvp/internal/features/contact"
	instrumentsfeature "futures-copilot-mvp/internal/features/instruments"
	rubricsfeature "futures-copilot-mvp/internal/features/rubrics"
	statsfeature "futures-copilot-mvp/internal/features/stats"
	tradesfeature "futures-copilot-mvp/internal/features/trades"
	usersfeature "futures-copilot-mvp/internal/features/users"
	auth "futures-copilot-mvp/internal/platform/auth"

	"github.com/gofiber/fiber/v2"
)

func registerRoutes(app *fiber.App, deps Dependencies) {
	api := app.Group("/api")
	copilot := api.Group("/copilot")
	accounts := api.Group("/accounts")
	rubrics := api.Group("/rubrics")
	instruments := api.Group("/instruments")
	trades := api.Group("/trades")
	ai := copilot.Group("/ai")
	users := api.Group("/users")
	stats := api.Group("/stats")
	alerts := api.Group("/alerts")
	contact := api.Group("/contact")
	authRecaptcha := api.Group("/auth/recaptcha")

	aiExtractionDeps := aifeature.ExtractionDependencies{
		CompileURLSourceText:       aifeature.CompileURLSourceText,
		ExtractAccountRulesSummary: aifeature.ExtractAccountRulesSummary,
		ImproveGeneralText:         aifeature.ImproveGeneralText,
	}

	alertDeps := BuildAlertDependencies(deps.RDB)
	tradeDeps := BuildTradeDependencies(deps.RDB, deps.InstrumentsRepo, deps.AlertsRepo, alertDeps)

	accounts.Get("", func(c *fiber.Ctx) error { return accountsfeature.GetAccounts(c, deps.AccountsRepo) })
	accounts.Post("", func(c *fiber.Ctx) error { return accountsfeature.SaveAccount(c, deps.AccountsRepo) })
	accounts.Delete("/:id", func(c *fiber.Ctx) error { return accountsfeature.DeleteAccount(c, deps.AccountsRepo) })

	rubrics.Get("", func(c *fiber.Ctx) error { return rubricsfeature.GetRubrics(c, deps.RubricsRepo) })
	rubrics.Post("", func(c *fiber.Ctx) error { return rubricsfeature.SaveRubric(c, deps.RubricsRepo) })
	rubrics.Delete("/:id", func(c *fiber.Ctx) error { return rubricsfeature.DeleteRubric(c, deps.RubricsRepo) })

	instruments.Get("", func(c *fiber.Ctx) error { return instrumentsfeature.GetInstruments(c, deps.InstrumentsRepo) })
	instruments.Post("", func(c *fiber.Ctx) error { return instrumentsfeature.SaveInstrument(c, deps.InstrumentsRepo) })
	instruments.Delete("/:code", func(c *fiber.Ctx) error { return instrumentsfeature.DeleteInstrument(c, deps.InstrumentsRepo) })

	trades.Get("", func(c *fiber.Ctx) error { return tradesfeature.GetTrades(c, deps.TradeRepo) })
	trades.Put("/:id/status", func(c *fiber.Ctx) error { return tradesfeature.UpdateTradeStatus(c, deps.TradeRepo, tradeDeps) })
	trades.Post("/:id/regrade", func(c *fiber.Ctx) error { return tradesfeature.RegradeTradeSetup(c, deps.TradeRepo, tradeDeps) })
	trades.Post("/:id/invalidate", func(c *fiber.Ctx) error { return tradesfeature.InvalidateTrade(c, deps.TradeRepo, tradeDeps) })

	stats.Get("/trades", func(c *fiber.Ctx) error {
		return statsfeature.GetTradeStats(c, statsfeature.Dependencies{DB: deps.DB, Cache: deps.RDB})
	})

	api.Post("/draft", func(c *fiber.Ctx) error { return tradesfeature.DraftTrade(c, deps.TradeRepo, tradeDeps) })
	api.Post("/journal", func(c *fiber.Ctx) error { return tradesfeature.JournalTrade(c, deps.TradeRepo, tradeDeps) })

	ai.Post("/scrape-account-rules", auth.RequireTrustedAdminRequest(func(c *fiber.Ctx) error {
		return aifeature.ScrapeAccountRules(c, deps.AIProviderConfigRepo, aiExtractionDeps)
	}))
	ai.Post("/improve-account-rules", auth.RequireTrustedAdminRequest(func(c *fiber.Ctx) error {
		return aifeature.ImproveAccountRules(c, deps.AIProviderConfigRepo, aiExtractionDeps)
	}))
	ai.Post("/improve-text", auth.RequireTrustedAdminRequest(func(c *fiber.Ctx) error {
		return aifeature.ImproveText(c, deps.AIProviderConfigRepo, aiExtractionDeps)
	}))
	ai.Get("/availability", auth.RequireTrustedAdminRequest(aifeature.GetAIAvailability))
	ai.Get("/config", auth.RequireTrustedAdminRequest(func(c *fiber.Ctx) error {
		return aifeature.GetAIProviderConfig(c, deps.AIProviderConfigRepo)
	}))
	ai.Put("/config", auth.RequireTrustedAdminRequest(func(c *fiber.Ctx) error {
		return aifeature.UpdateAIProviderConfig(c, deps.AIProviderConfigRepo)
	}))

	users.Post("/sync", auth.RequireTrustedInternalRequest(func(c *fiber.Ctx) error { return usersfeature.SyncUser(c, deps.UsersRepo) }))
	users.Put("/disable", auth.RequireTrustedAdminRequest(func(c *fiber.Ctx) error { return usersfeature.DisableUser(c, deps.UsersRepo) }))

	alerts.Get("", auth.RequireTrustedInternalRequest(func(c *fiber.Ctx) error { return alertsfeature.GetAlertChannels(c, deps.AlertsRepo) }))
	alerts.Post("", auth.RequireTrustedInternalRequest(func(c *fiber.Ctx) error { return alertsfeature.SaveAlertChannel(c, deps.AlertsRepo) }))
	alerts.Post("/test", auth.RequireTrustedInternalRequest(func(c *fiber.Ctx) error { return alertsfeature.TestAlertChannel(c, deps.AlertsRepo, alertDeps) }))

	contact.Post("", auth.RequireTrustedInternalRequest(contactfeature.PostContact))
	authRecaptcha.Post("/verify", auth.RequireTrustedInternalRequest(authrecaptchafeature.VerifyAuthRecaptcha))
}
