package main

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type Project struct {
	ID    string `json:"id"`
	Title string `json:"title"`
	// Description is Markdown - rendered with react-markdown wherever it's
	// shown, same convention as Post.Content.
	Description string   `json:"description"`
	TechStack   []string `json:"tech_stack"`
	LiveUrl     string   `json:"live_url"`
	// StartDate/EndDate are "YYYY-MM"; empty EndDate means ongoing - same
	// convention as ExperiencePosition.
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	// Icon is a simple-icons slug (e.g. "react", "docker"), same convention
	// as StackSkill.Icon - resolved to a brand SVG by the frontend, or falls
	// back to a generic icon when empty/unresolved.
	Icon string `json:"icon"`
	// Featured controls homepage visibility directly on the item, replacing
	// the old separate cms:homepage allow-list - one less place to keep in
	// sync. Array order (admin's own drag/reorder) is the display order,
	// same convention as Experience/Education/Stack; there is no separate
	// numeric rank field to drift out of sync with it.
	Featured bool `json:"featured"`
	// Status is "draft" or "published" - see the Status doc comment on Post
	// for the full contract (also applies here and to every other CMS type).
	Status string `json:"status"`
}

type Post struct {
	ID         string `json:"id"`
	Title      string `json:"title"`
	SourceType string `json:"source_type"` // "external_url" or "native"
	// ContentTarget is the raw markdown URL - only meaningful when
	// SourceType is "external_url".
	ContentTarget string `json:"content_target"`
	// Content is the markdown body itself, stored inline - only meaningful
	// when SourceType is "native". Previously native posts pointed at a
	// file in the separate Filebrowser volume; that split write path (file
	// exists or doesn't, independently of whether the post record itself
	// was ever saved) was the source of the "Open Editor" 404s and the
	// unanswerable "what happens to the file on a source-type switch"
	// question. Storing it as a normal field removes the whole failure
	// mode - it saves and loads exactly like Title does.
	Content string `json:"content"`
	// CoverImageUrl is optional - shown atop the card on the homepage/blog
	// listing and at the top of the post page. Blank renders a text-only
	// card, same degrade-safe convention as Project.Icon.
	CoverImageUrl string `json:"cover_image_url"`
	// PublishedDate is "YYYY-MM-DD", optional - blank omits the date line
	// instead of showing a fake one.
	PublishedDate string `json:"published_date"`
	// Featured controls homepage visibility directly on the item - see
	// Project.Featured.
	Featured bool `json:"featured"`
	// Status is "draft" or "published". Draft items are excluded from every
	// public /api/* GET route (see filterPublished below) but still
	// returned in full to the authenticated /admin/cms/* GET routes, so the
	// admin panel can keep editing/resuming work that never has to pass
	// validation until it's actually published - see the per-type admin.Post
	// handlers below, which only enforce required fields when Status is
	// "published". Blank Status (pre-existing data saved before this field
	// existed) is treated as published by filterPublished, so nothing that
	// was already live silently disappeared when this shipped.
	Status string `json:"status"`
}

type CreditItem struct {
	Text string `json:"text"`
	// Url is optional - an item with no url renders as plain text instead
	// of a link, so e.g. "Deployed on Vercel" doesn't need a fake href.
	Url string `json:"url"`
}

type CreditRow struct {
	ID     string       `json:"id"`
	Label  string       `json:"label"`
	Items  []CreditItem `json:"items"`
	Status string       `json:"status"`
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
	Status string       `json:"status"`
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
	Status    string               `json:"status"`
}

type Education struct {
	ID           string   `json:"id"`
	School       string   `json:"school"`
	Degree       string   `json:"degree"`
	FieldOfStudy string   `json:"field_of_study"`
	StartDate    string   `json:"start_date"`
	EndDate      string   `json:"end_date"`
	Highlights   []string `json:"highlights"`
	Status       string   `json:"status"`
}

func authMiddleware(c *fiber.Ctx) error {
	token := c.Get("X-Admin-Token")
	expectedToken := os.Getenv("ADMIN_API_KEY")
	if expectedToken == "" || token != expectedToken {
		return c.Status(403).JSON(fiber.Map{"error": "Forbidden: Invalid Internal API Key"})
	}
	return c.Next()
}

// filterPublished drops draft items for every public /api/* GET route - the
// admin/cms/* GET routes below return the unfiltered array (including
// drafts) since the admin panel needs to keep editing them. Blank Status
// (data saved before this field existed) is treated as published, not
// draft, so nothing already-live silently vanished when this shipped.
func filterPublished[T any](items []T, getStatus func(T) string) []T {
	out := make([]T, 0, len(items))
	for _, item := range items {
		if getStatus(item) != "draft" {
			out = append(out, item)
		}
	}
	return out
}

func RegisterCMSRoutes(app *fiber.App) {
	// Public GET routes - published items only
	app.Get("/api/projects", func(c *fiber.Ctx) error {
		val, err := redisClient.Get(c.Context(), "cms:projects").Result()
		if err != nil {
			return c.JSON([]Project{})
		}
		var projects []Project
		json.Unmarshal([]byte(val), &projects)
		return c.JSON(filterPublished(projects, func(p Project) string { return p.Status }))
	})

	app.Get("/api/posts", func(c *fiber.Ctx) error {
		val, err := redisClient.Get(c.Context(), "cms:posts").Result()
		if err != nil {
			return c.JSON([]Post{})
		}
		var posts []Post
		json.Unmarshal([]byte(val), &posts)
		return c.JSON(filterPublished(posts, func(p Post) string { return p.Status }))
	})

	app.Get("/api/credits", func(c *fiber.Ctx) error {
		val, err := redisClient.Get(c.Context(), "cms:credits").Result()
		if err != nil {
			return c.JSON([]CreditRow{})
		}
		var rows []CreditRow
		json.Unmarshal([]byte(val), &rows)
		return c.JSON(filterPublished(rows, func(r CreditRow) string { return r.Status }))
	})

	app.Get("/api/stack", func(c *fiber.Ctx) error {
		val, err := redisClient.Get(c.Context(), "cms:stack").Result()
		if err != nil {
			return c.JSON([]StackCategory{})
		}
		var categories []StackCategory
		json.Unmarshal([]byte(val), &categories)
		return c.JSON(filterPublished(categories, func(cat StackCategory) string { return cat.Status }))
	})

	app.Get("/api/experience", func(c *fiber.Ctx) error {
		val, err := redisClient.Get(c.Context(), "cms:experience").Result()
		if err != nil {
			return c.JSON([]Experience{})
		}
		var experience []Experience
		json.Unmarshal([]byte(val), &experience)
		return c.JSON(filterPublished(experience, func(e Experience) string { return e.Status }))
	})

	app.Get("/api/education", func(c *fiber.Ctx) error {
		val, err := redisClient.Get(c.Context(), "cms:education").Result()
		if err != nil {
			return c.JSON([]Education{})
		}
		var education []Education
		json.Unmarshal([]byte(val), &education)
		return c.JSON(filterPublished(education, func(e Education) string { return e.Status }))
	})

	// Protected Admin Routes
	admin := app.Group("/admin/cms", authMiddleware)

	// Admin GET routes - unfiltered (drafts included), for the admin panel
	// to load and keep editing work-in-progress items.
	admin.Get("/projects", func(c *fiber.Ctx) error {
		val, err := redisClient.Get(c.Context(), "cms:projects").Result()
		if err != nil {
			return c.JSON([]Project{})
		}
		var projects []Project
		json.Unmarshal([]byte(val), &projects)
		return c.JSON(projects)
	})

	admin.Get("/posts", func(c *fiber.Ctx) error {
		val, err := redisClient.Get(c.Context(), "cms:posts").Result()
		if err != nil {
			return c.JSON([]Post{})
		}
		var posts []Post
		json.Unmarshal([]byte(val), &posts)
		return c.JSON(posts)
	})

	admin.Get("/credits", func(c *fiber.Ctx) error {
		val, err := redisClient.Get(c.Context(), "cms:credits").Result()
		if err != nil {
			return c.JSON([]CreditRow{})
		}
		var rows []CreditRow
		json.Unmarshal([]byte(val), &rows)
		return c.JSON(rows)
	})

	admin.Get("/stack", func(c *fiber.Ctx) error {
		val, err := redisClient.Get(c.Context(), "cms:stack").Result()
		if err != nil {
			return c.JSON([]StackCategory{})
		}
		var categories []StackCategory
		json.Unmarshal([]byte(val), &categories)
		return c.JSON(categories)
	})

	admin.Get("/experience", func(c *fiber.Ctx) error {
		val, err := redisClient.Get(c.Context(), "cms:experience").Result()
		if err != nil {
			return c.JSON([]Experience{})
		}
		var experience []Experience
		json.Unmarshal([]byte(val), &experience)
		return c.JSON(experience)
	})

	admin.Get("/education", func(c *fiber.Ctx) error {
		val, err := redisClient.Get(c.Context(), "cms:education").Result()
		if err != nil {
			return c.JSON([]Education{})
		}
		var education []Education
		json.Unmarshal([]byte(val), &education)
		return c.JSON(education)
	})

	admin.Post("/projects", func(c *fiber.Ctx) error {
		var projects []Project
		if err := c.BodyParser(&projects); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid array"})
		}
		var errs []string
		for i, p := range projects {
			if p.Status != "published" {
				continue
			}
			if strings.TrimSpace(p.Title) == "" {
				errs = append(errs, fmt.Sprintf("Project #%d needs a title", i+1))
			}
		}
		if len(errs) > 0 {
			return c.Status(400).JSON(fiber.Map{"error": strings.Join(errs, "; ")})
		}
		data, _ := json.Marshal(projects)
		redisClient.Set(c.Context(), "cms:projects", data, 0)
		recordAudit(c.Context(), actorFromRequest(c), "cms.projects.update", "cms", "projects", fmt.Sprintf("%d item(s)", len(projects)))
		return c.JSON(fiber.Map{"status": "success"})
	})

	admin.Post("/posts", func(c *fiber.Ctx) error {
		var posts []Post
		if err := c.BodyParser(&posts); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid array"})
		}
		var errs []string
		for i, p := range posts {
			if p.Status != "published" {
				continue
			}
			if strings.TrimSpace(p.Title) == "" {
				errs = append(errs, fmt.Sprintf("Post #%d needs a title", i+1))
			}
			if p.SourceType == "external_url" {
				if strings.TrimSpace(p.ContentTarget) == "" {
					errs = append(errs, fmt.Sprintf("Post #%d needs a raw URL", i+1))
				}
			} else if strings.TrimSpace(p.Content) == "" {
				errs = append(errs, fmt.Sprintf("Post #%d needs content", i+1))
			}
		}
		if len(errs) > 0 {
			return c.Status(400).JSON(fiber.Map{"error": strings.Join(errs, "; ")})
		}
		data, _ := json.Marshal(posts)
		redisClient.Set(c.Context(), "cms:posts", data, 0)
		recordAudit(c.Context(), actorFromRequest(c), "cms.posts.update", "cms", "posts", fmt.Sprintf("%d item(s)", len(posts)))
		return c.JSON(fiber.Map{"status": "success"})
	})

	admin.Post("/credits", func(c *fiber.Ctx) error {
		var rows []CreditRow
		if err := c.BodyParser(&rows); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid array"})
		}
		var errs []string
		for i, row := range rows {
			if row.Status != "published" {
				continue
			}
			if strings.TrimSpace(row.Label) == "" {
				errs = append(errs, fmt.Sprintf("Row #%d needs a label", i+1))
			}
			for j, item := range row.Items {
				if strings.TrimSpace(item.Text) == "" {
					errs = append(errs, fmt.Sprintf("Row #%d, item #%d needs text", i+1, j+1))
				}
			}
		}
		if len(errs) > 0 {
			return c.Status(400).JSON(fiber.Map{"error": strings.Join(errs, "; ")})
		}
		data, _ := json.Marshal(rows)
		redisClient.Set(c.Context(), "cms:credits", data, 0)
		recordAudit(c.Context(), actorFromRequest(c), "cms.credits.update", "cms", "credits", fmt.Sprintf("%d item(s)", len(rows)))
		return c.JSON(fiber.Map{"status": "success"})
	})

	admin.Post("/stack", func(c *fiber.Ctx) error {
		var categories []StackCategory
		if err := c.BodyParser(&categories); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid array"})
		}
		var errs []string
		for i, cat := range categories {
			if cat.Status != "published" {
				continue
			}
			if strings.TrimSpace(cat.Name) == "" {
				errs = append(errs, fmt.Sprintf("Category #%d needs a name", i+1))
			}
			for j, skill := range cat.Skills {
				if strings.TrimSpace(skill.Name) == "" {
					errs = append(errs, fmt.Sprintf("Category #%d, skill #%d needs a name", i+1, j+1))
				}
			}
		}
		if len(errs) > 0 {
			return c.Status(400).JSON(fiber.Map{"error": strings.Join(errs, "; ")})
		}
		data, _ := json.Marshal(categories)
		redisClient.Set(c.Context(), "cms:stack", data, 0)
		recordAudit(c.Context(), actorFromRequest(c), "cms.stack.update", "cms", "stack", fmt.Sprintf("%d item(s)", len(categories)))
		return c.JSON(fiber.Map{"status": "success"})
	})

	admin.Post("/experience", func(c *fiber.Ctx) error {
		var experience []Experience
		if err := c.BodyParser(&experience); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid array"})
		}
		var errs []string
		for i, exp := range experience {
			if exp.Status != "published" {
				continue
			}
			if strings.TrimSpace(exp.Company) == "" {
				errs = append(errs, fmt.Sprintf("Company #%d needs a name", i+1))
			}
			for j, pos := range exp.Positions {
				if strings.TrimSpace(pos.Title) == "" {
					errs = append(errs, fmt.Sprintf("Company #%d, position #%d needs a title", i+1, j+1))
				}
			}
		}
		if len(errs) > 0 {
			return c.Status(400).JSON(fiber.Map{"error": strings.Join(errs, "; ")})
		}
		data, _ := json.Marshal(experience)
		redisClient.Set(c.Context(), "cms:experience", data, 0)
		recordAudit(c.Context(), actorFromRequest(c), "cms.experience.update", "cms", "experience", fmt.Sprintf("%d item(s)", len(experience)))
		return c.JSON(fiber.Map{"status": "success"})
	})

	admin.Post("/education", func(c *fiber.Ctx) error {
		var education []Education
		if err := c.BodyParser(&education); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid array"})
		}
		var errs []string
		for i, edu := range education {
			if edu.Status != "published" {
				continue
			}
			if strings.TrimSpace(edu.School) == "" {
				errs = append(errs, fmt.Sprintf("Education #%d needs a school", i+1))
			}
		}
		if len(errs) > 0 {
			return c.Status(400).JSON(fiber.Map{"error": strings.Join(errs, "; ")})
		}
		data, _ := json.Marshal(education)
		redisClient.Set(c.Context(), "cms:education", data, 0)
		recordAudit(c.Context(), actorFromRequest(c), "cms.education.update", "cms", "education", fmt.Sprintf("%d item(s)", len(education)))
		return c.JSON(fiber.Map{"status": "success"})
	})
}
