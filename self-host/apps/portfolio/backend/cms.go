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
	FeaturedDocs     []string `json:"featured_docs"`
}

type StackSkill struct {
	Name string `json:"name"`
	// Icon is a simple-icons slug (e.g. "typescript", "postgresql") the
	// frontend resolves to a brand SVG. Left empty, the skill renders as
	// text-only - never a broken image, so a typo'd slug degrades safely.
	Icon string `json:"icon"`
}

type StackCategory struct {
	ID     string       `json:"id"`
	Name   string       `json:"name"`
	Skills []StackSkill `json:"skills"`
}

type ExperiencePosition struct {
	ID string `json:"id"`
	// EmploymentType is free text (e.g. "Full-time", "Part-time",
	// "Contract") rather than an enum - resumes use inconsistent
	// vocabulary and locking it down would just fight the admin.
	Title          string   `json:"title"`
	EmploymentType string   `json:"employment_type"`
	// StartDate/EndDate are "YYYY-MM"; empty EndDate means ongoing. Kept
	// as strings (not computed duration) - the frontend derives duration
	// and "Current" status from these two fields so there's exactly one
	// source of truth, never a stored value that drifts from the dates
	// next to it.
	StartDate string   `json:"start_date"`
	EndDate   string   `json:"end_date"`
	Bullets   []string `json:"bullets"`
	TechTags  []string `json:"tech_tags"`
}

type Experience struct {
	ID           string `json:"id"`
	Company      string `json:"company"`
	Location     string `json:"location"`
	LocationType string `json:"location_type"` // "Remote", "On-site", "Hybrid"
	// Positions is ordered newest-first by admin's own arrangement, same
	// convention as Projects/Documents - the frontend doesn't re-sort.
	Positions []ExperiencePosition `json:"positions"`
}

type Education struct {
	ID           string   `json:"id"`
	School       string   `json:"school"`
	Degree       string   `json:"degree"`
	FieldOfStudy string   `json:"field_of_study"`
	StartDate    string   `json:"start_date"`
	EndDate      string   `json:"end_date"`
	Highlights   []string `json:"highlights"`
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
				FeaturedDocs:     []string{},
			})
		}
		var hp HomepageVisibility
		json.Unmarshal([]byte(val), &hp)
		return c.JSON(hp)
	})

	app.Get("/api/stack", func(c *fiber.Ctx) error {
		val, err := redisClient.Get(c.Context(), "cms:stack").Result()
		if err != nil {
			return c.JSON([]StackCategory{})
		}
		var categories []StackCategory
		json.Unmarshal([]byte(val), &categories)
		return c.JSON(categories)
	})

	app.Get("/api/experience", func(c *fiber.Ctx) error {
		val, err := redisClient.Get(c.Context(), "cms:experience").Result()
		if err != nil {
			return c.JSON([]Experience{})
		}
		var experience []Experience
		json.Unmarshal([]byte(val), &experience)
		return c.JSON(experience)
	})

	app.Get("/api/education", func(c *fiber.Ctx) error {
		val, err := redisClient.Get(c.Context(), "cms:education").Result()
		if err != nil {
			return c.JSON([]Education{})
		}
		var education []Education
		json.Unmarshal([]byte(val), &education)
		return c.JSON(education)
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
		if hp.FeaturedDocs == nil {
			hp.FeaturedDocs = []string{}
		}
		data, _ := json.Marshal(hp)
		redisClient.Set(c.Context(), "cms:homepage", data, 0)
		return c.JSON(fiber.Map{"status": "success"})
	})

	admin.Post("/stack", func(c *fiber.Ctx) error {
		var categories []StackCategory
		if err := c.BodyParser(&categories); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid array"})
		}
		data, _ := json.Marshal(categories)
		redisClient.Set(c.Context(), "cms:stack", data, 0)
		return c.JSON(fiber.Map{"status": "success"})
	})

	admin.Post("/experience", func(c *fiber.Ctx) error {
		var experience []Experience
		if err := c.BodyParser(&experience); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid array"})
		}
		data, _ := json.Marshal(experience)
		redisClient.Set(c.Context(), "cms:experience", data, 0)
		return c.JSON(fiber.Map{"status": "success"})
	})

	admin.Post("/education", func(c *fiber.Ctx) error {
		var education []Education
		if err := c.BodyParser(&education); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid array"})
		}
		data, _ := json.Marshal(education)
		redisClient.Set(c.Context(), "cms:education", data, 0)
		return c.JSON(fiber.Map{"status": "success"})
	})
}
