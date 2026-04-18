package main

import (
	"time"

	"github.com/gofiber/fiber/v2"
)

func scrapeRules(c *fiber.Ctx) error {
	var req scrapeRulesRequest
	if err := parseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}

	// MOCK AI SCRAPE
	time.Sleep(2 * time.Second)

	mockScraped := `// EXTRACTED VIA AI FROM BROKER DOCS //
Trailing EOD Max Drawdown: $2500.
Daily Loss Limit: $1500.
Consistency Rule: No single day over 50% of total profit.
Scaling Plan: 2 contracts per $1500 profit.
News Rule: No trading 1m before or after high impact tier 1 news.`

	return c.JSON(fiber.Map{"context": mockScraped})
}

func improveRules(c *fiber.Ctx) error {
	var req improveRulesRequest
	if err := parseRequestBody(c, &req, "Invalid payload"); err != nil {
		return err
	}

	// MOCK AI IMPROVEMENT
	time.Sleep(1500 * time.Millisecond)

	mockImproved := `[ AI CLEANED CONTEXT ]
` + req.Text + `

- Extracted Core constraint: Do not hold over weekends.
- Enforced Behavioral rule: Pause trading if Daily Loss Limit is hit.`

	return c.JSON(fiber.Map{"context": mockImproved})
}
