package main

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"log"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
)

// slogHTTPMiddleware replaces fiber's default plain-text request logger with
// structured JSON lines - method/path/status/latency/ip as real fields, not
// text to grep. Promtail already ships every container's stdout into Loki
// (see infra/observability), so this is what makes those logs filterable by
// field in Grafana instead of just full-text searchable.
func slogHTTPMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		err := c.Next()

		ip := c.IP()
		// The anonymous post-rating vote (POST /api/posts/:id/rate, see
		// cms.go) deliberately never stores the visitor's raw IP - it only
		// keeps a one-way SHA-256 hash as a cheap per-IP dedup key. Logging
		// the plaintext IP here would quietly undo that and leave it sitting
		// in Loki anyway, so this route logs a hash of just the IP instead
		// (deliberately not the exact dedup key, which is also salted with
		// the post id - hashing the IP alone keeps the same visitor's hash
		// consistent across posts, which is what you'd actually want for
		// spotting one visitor hammering /rate across many posts).
		if strings.HasPrefix(c.Path(), "/api/posts/") && strings.HasSuffix(c.Path(), "/rate") {
			ip = fmt.Sprintf("hashed:%x", sha256.Sum256([]byte(ip)))
		}

		attrs := []any{
			"method", c.Method(),
			"path", c.Path(),
			"status", c.Response().StatusCode(),
			"latency_ms", time.Since(start).Milliseconds(),
			"ip", ip,
		}
		if err != nil {
			attrs = append(attrs, "error", err.Error())
		}
		slog.Info("http.request", attrs...)

		return err
	}
}

// corsAllowedOrigins reuses FRONTEND_PUBLIC_URL (already set for email links -
// same underlying concept: "where does my real frontend live") as the CORS
// allowlist. The public, unauthenticated endpoints here (resume requests,
// config, etc.) must not accept requests claiming to originate from anywhere
// the operator didn't explicitly configure - AllowOrigins: "*" let literally
// any site call them directly. Falls back to the two local-dev origins this
// repo actually uses (npm run dev on :3000, the docker-compose frontend on
// :8086) when unset, rather than defaulting back to a wildcard.
func corsAllowedOrigins() string {
	if v := os.Getenv("FRONTEND_PUBLIC_URL"); v != "" {
		return v
	}
	return "http://localhost:3000,http://localhost:8086"
}

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

	app := fiber.New(fiber.Config{
		AppName: "Systems Playground API",
		// cloudflared connects to this app over localhost (see
		// infra/scripts/cloudflared-sync.sh — ingress is always
		// http://localhost:<port>), so the raw TCP remote addr Fiber's
		// c.IP() would otherwise return is cloudflared's own loopback
		// connection, not the visitor's. Cloudflare Tunnel sets
		// Cf-Connecting-Ip with the real client IP; trusting only the
		// localhost hop and reading that header is what makes c.IP()
		// (and anything keyed on it, e.g. the resume-request rate
		// limiter) resolve to the actual visitor instead of bucketing
		// every visitor together under cloudflared's address.
		EnableTrustedProxyCheck: true,
		TrustedProxies:          []string{"127.0.0.1", "::1"},
		ProxyHeader:             "Cf-Connecting-Ip",
	})

	// Middleware
	app.Use(slogHTTPMiddleware())
	app.Use(cors.New(cors.Config{
		AllowOrigins: corsAllowedOrigins(),
		AllowHeaders: "Origin, Content-Type, Accept, X-Admin-Token",
	}))

	// Initialize external systems
	initRedis()
	initDB()

	RegisterCMSRoutes(app)
	RegisterResumeRoutes(app)
	RegisterFilebrowserRoutes(app)
	RegisterLeadRoutes(app)

	// --- PUBLIC API ENDPOINTS ---

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	app.Get("/api/config", func(c *fiber.Ctx) error {
		resumeUrl, _ := GetConfig(c.Context(), "resumeUrl", "#")
		linkedinUrl, _ := GetConfig(c.Context(), "linkedinUrl", "#")
		githubUrl, _ := GetConfig(c.Context(), "githubUrl", "#")
		bio, _ := GetConfig(c.Context(), "bio", "")
		heroDescription, _ := GetConfig(c.Context(), "heroDescription", "")

		// Unlike the other fields, an empty jobTitles is a valid, deliberate
		// state (hide the badge entirely) - so this only falls back to the
		// default on the very first load (key never set) or corrupt stored
		// JSON, not on a legitimately empty "[]" saved by clearing the list.
		jobTitlesRaw, _ := GetConfig(c.Context(), "jobTitles", `[]`)
		var jobTitles []string
		if err := json.Unmarshal([]byte(jobTitlesRaw), &jobTitles); err != nil {
			jobTitles = []string{}
		}

		return c.JSON(fiber.Map{
			"resumeUrl":       resumeUrl,
			"linkedinUrl":     linkedinUrl,
			"githubUrl":       githubUrl,
			"bio":             bio,
			"heroDescription": heroDescription,
			"jobTitles":       jobTitles,
		})
	})

	// --- ADMIN UI CONTROL PLANE ENDPOINTS ---

	// Update Configuration Settings
	type ConfigRequest struct {
		ResumeUrl       string   `json:"resumeUrl"`
		LinkedinUrl     string   `json:"linkedinUrl"`
		GithubUrl       string   `json:"githubUrl"`
		Bio             string   `json:"bio"`
		HeroDescription string   `json:"heroDescription"`
		JobTitles       []string `json:"jobTitles"`
	}

	app.Post("/admin/config", func(c *fiber.Ctx) error {
		token := c.Get("X-Admin-Token")
		expectedToken := os.Getenv("ADMIN_API_KEY")
		if expectedToken == "" || token != expectedToken {
			return c.Status(403).JSON(fiber.Map{"error": "Forbidden: Invalid Internal API Key"})
		}

		var req ConfigRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		ctx := c.Context()
		SetConfig(ctx, "resumeUrl", req.ResumeUrl)
		SetConfig(ctx, "linkedinUrl", req.LinkedinUrl)
		SetConfig(ctx, "githubUrl", req.GithubUrl)
		SetConfig(ctx, "bio", req.Bio)
		SetConfig(ctx, "heroDescription", req.HeroDescription)
		if jobTitlesJSON, err := json.Marshal(req.JobTitles); err == nil {
			SetConfig(ctx, "jobTitles", string(jobTitlesJSON))
		}

		recordAudit(ctx, actorFromRequest(c), "config.update", "config", "", "")

		return c.JSON(fiber.Map{"status": "success", "message": "Configuration updated successfully"})
	})

	// Get port from env or default to 8080
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting server on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}
