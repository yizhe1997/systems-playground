package main

import (
	"encoding/json"
	"os"

	"github.com/gofiber/fiber/v2"
)

type Project struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	TechStack   []string `json:"tech_stack"`
	LiveUrl     string   `json:"live_url"`
	GithubUrl   string   `json:"github_url"`
}

type Document struct {
	ID            string `json:"id"`
	Title         string `json:"title"`
	Description   string `json:"description"`
	FolderPath    string `json:"folder_path"`
	SourceType    string `json:"source_type"` // "external_url" or "native"
	ContentTarget string `json:"content_target"`
}

type HomepageVisibility struct {
	FeaturedProjects []string `json:"featured_projects"`
	FeaturedDemos    []string `json:"featured_demos"`
	FeaturedDocs     []string `json:"featured_docs"`
}

func authMiddleware(c *fiber.Ctx) error {
	token := c.Get("X-Admin-Token")
	expectedToken := os.Getenv("ADMIN_API_KEY")
	if expectedToken == "" || token != expectedToken {
		return c.Status(403).JSON(fiber.Map{"error": "Forbidden: Invalid Internal API Key"})
	}
	return c.Next()
}

func RegisterCMSRoutes(app *fiber.App) {
	// Public GET routes
	app.Get("/api/projects", func(c *fiber.Ctx) error {
		val, err := redisClient.Get(c.Context(), "cms:projects").Result()
		if err != nil {
			return c.JSON([]Project{})
		}
		var projects []Project
		json.Unmarshal([]byte(val), &projects)
		return c.JSON(projects)
	})

	app.Get("/api/documents", func(c *fiber.Ctx) error {
		val, err := redisClient.Get(c.Context(), "cms:documents").Result()
		if err != nil {
			return c.JSON([]Document{})
		}
		var docs []Document
		json.Unmarshal([]byte(val), &docs)
		return c.JSON(docs)
	})

	app.Get("/api/homepage", func(c *fiber.Ctx) error {
		val, err := redisClient.Get(c.Context(), "cms:homepage").Result()
		if err != nil {
			return c.JSON(HomepageVisibility{
				FeaturedProjects: []string{},
				FeaturedDemos:    []string{},
				FeaturedDocs:     []string{},
			})
		}
		var hp HomepageVisibility
		json.Unmarshal([]byte(val), &hp)
		return c.JSON(hp)
	})

	// Protected Admin Routes
	admin := app.Group("/admin/cms", authMiddleware)

	admin.Post("/projects", func(c *fiber.Ctx) error {
		var projects []Project
		if err := c.BodyParser(&projects); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid array"})
		}
		data, _ := json.Marshal(projects)
		redisClient.Set(c.Context(), "cms:projects", data, 0)
		return c.JSON(fiber.Map{"status": "success"})
	})

	admin.Post("/documents", func(c *fiber.Ctx) error {
		var docs []Document
		if err := c.BodyParser(&docs); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid array"})
		}
		data, _ := json.Marshal(docs)
		redisClient.Set(c.Context(), "cms:documents", data, 0)
		return c.JSON(fiber.Map{"status": "success"})
	})

	admin.Post("/homepage", func(c *fiber.Ctx) error {
		var hp HomepageVisibility
		if err := c.BodyParser(&hp); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid payload"})
		}
		if hp.FeaturedProjects == nil {
			hp.FeaturedProjects = []string{}
		}
		if hp.FeaturedDemos == nil {
			hp.FeaturedDemos = []string{}
		}
		if hp.FeaturedDocs == nil {
			hp.FeaturedDocs = []string{}
		}
		data, _ := json.Marshal(hp)
		redisClient.Set(c.Context(), "cms:homepage", data, 0)
		return c.JSON(fiber.Map{"status": "success"})
	})
}
