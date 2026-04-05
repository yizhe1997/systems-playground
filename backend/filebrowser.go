package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

var httpClient = &http.Client{Timeout: 10 * time.Second}

// getFilebrowserToken authenticates with the Filebrowser API and returns the JWT token.
func getFilebrowserToken() (string, error) {
	fbUrl := os.Getenv("FILEBROWSER_PUBLIC_URL")
	if fbUrl == "" {
		fbUrl = os.Getenv("FILEBROWSER_URL")
	}
	if fbUrl == "" {
		fbUrl = "http://host.docker.internal:8088" // Default assuming host mapped port
	}
	fbUser := os.Getenv("FILEBROWSER_ADMIN_USERNAME")
	if fbUser == "" {
		fbUser = "admin"
	}
	fbPass := os.Getenv("FILEBROWSER_ADMIN_PASSWORD")
	if fbPass == "" {
		fbPass = "admin"
	}

	payload, _ := json.Marshal(map[string]string{
		"username": fbUser,
		"password": fbPass,
	})

	resp, err := httpClient.Post(fmt.Sprintf("%s/api/login", fbUrl), "application/json", bytes.NewBuffer(payload))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to authenticate with filebrowser, status: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	return string(body), nil
}

// RegisterFilebrowserRoutes sets up the proxy endpoints for the Next.js frontend to talk to Filebrowser securely.
func RegisterFilebrowserRoutes(app *fiber.App) {
	fbUrl := os.Getenv("FILEBROWSER_PUBLIC_URL")
	if fbUrl == "" {
		fbUrl = os.Getenv("FILEBROWSER_URL")
	}
	if fbUrl == "" {
		fbUrl = "http://host.docker.internal:8088"
	}

	// Public endpoint to read native markdown files
	// Next.js will call: /api/docs/raw/blogs/my-post.md
	app.Get("/api/docs/raw/*", func(c *fiber.Ctx) error {
		filePath := c.Params("*")

		token, err := getFilebrowserToken()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to connect to storage engine"})
		}

		// Ensure path starts with a slash
		if !strings.HasPrefix(filePath, "/") {
			filePath = "/" + filePath
		}

		req, err := http.NewRequest("GET", fmt.Sprintf("%s/api/raw%s", fbUrl, filePath), nil)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create request"})
		}
		req.Header.Set("X-Auth", token)

		resp, err := httpClient.Do(req)
		if err != nil {
			return c.Status(502).JSON(fiber.Map{"error": "Failed to fetch document from storage"})
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusNotFound {
			return c.Status(404).JSON(fiber.Map{"error": "Document not found"})
		}
		if resp.StatusCode != http.StatusOK {
			return c.Status(resp.StatusCode).JSON(fiber.Map{"error": "Failed to retrieve document"})
		}

		body, _ := io.ReadAll(resp.Body)
		c.Set("Content-Type", "text/markdown")
		return c.Send(body)
	})

	// Protected Admin endpoint to save/overwrite native markdown files
	// Next.js will call: POST /admin/docs/save/blogs/my-post.md
	admin := app.Group("/admin/docs", authMiddleware)
	admin.Post("/save/*", func(c *fiber.Ctx) error {
		filePath := c.Params("*")
		content := c.Body()

		token, err := getFilebrowserToken()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to connect to storage engine"})
		}

		if !strings.HasPrefix(filePath, "/") {
			filePath = "/" + filePath
		}

		req, err := http.NewRequest("POST", fmt.Sprintf("%s/api/resources%s?override=true", fbUrl, filePath), bytes.NewReader(content))
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to create request"})
		}
		req.Header.Set("X-Auth", token)
		req.Header.Set("Content-Type", "text/markdown") // Send as raw text

		resp, err := httpClient.Do(req)
		if err != nil {
			return c.Status(502).JSON(fiber.Map{"error": "Failed to save document to storage"})
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
			return c.Status(resp.StatusCode).JSON(fiber.Map{"error": "Storage engine rejected the save request"})
		}

		return c.JSON(fiber.Map{"status": "success", "message": "File saved successfully"})
	})
}
