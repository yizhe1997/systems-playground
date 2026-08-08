package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

var httpClient = &http.Client{Timeout: 10 * time.Second}

// resumeFilesDir is where uploaded resume/CV files live in Filebrowser -
// separate from anything an operator may have placed at the root via
// Filebrowser's own UI, so the admin upload widget only ever lists files it
// manages itself.
const resumeFilesDir = "/resumes"

func filebrowserPublicURL() string {
	if v := os.Getenv("FILEBROWSER_PUBLIC_URL"); v != "" {
		return v
	}
	return "http://host.docker.internal:8088" // Default assuming host mapped port
}

// getFilebrowserToken authenticates with the Filebrowser API and returns the
// JWT token. Used by resume.go to generate expiring share links for the
// resume file - Filebrowser's own auth model, not a general-purpose file
// store for other content (native Blog posts used to route through here
// too; that content is now stored inline on the Post record instead).
func getFilebrowserToken() (string, error) {
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

	resp, err := httpClient.Post(fmt.Sprintf("%s/api/login", filebrowserPublicURL()), "application/json", bytes.NewBuffer(payload))
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

type ResumeFile struct {
	Name     string `json:"name"`     // display name (original filename, as uploaded)
	Filename string `json:"filename"` // unique stored filename under resumeFilesDir - what delete targets
	Path     string `json:"path"`     // full Filebrowser path - what "active resume" tracks
	Size     int64  `json:"size"`
	Modified string `json:"modified"`
}

// storedFilenameToDisplayName recovers the original filename from a
// uuid__original.ext stored name (see the upload handler). Falls back to the
// raw stored name for anything without that separator, so a file that
// somehow predates this scheme still lists instead of erroring.
func storedFilenameToDisplayName(stored string) string {
	parts := strings.SplitN(stored, "__", 2)
	if len(parts) == 2 {
		return parts[1]
	}
	return stored
}

// filebrowserUnavailableError is returned (as a JSON body, not a panic) any
// time Filebrowser can't be reached or rejects auth - misconfiguration or an
// unresponsive instance is expected here (it's a separate, optional service),
// so callers get a clear message instead of a silent failure or a raw 500.
func filebrowserUnavailableError(c *fiber.Ctx) error {
	return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
		"error": "Filebrowser is unreachable or misconfigured. Check FILEBROWSER_PUBLIC_URL, FILEBROWSER_ADMIN_USERNAME, and FILEBROWSER_ADMIN_PASSWORD.",
	})
}

// RegisterFilebrowserRoutes exposes the admin resume/CV upload widget's
// backend - list/upload/delete against a fixed Filebrowser directory, all
// behind authMiddleware. This is deliberately thin: Filebrowser remains the
// actual file store and the source of the 24h expiring share links
// (generateFilebrowserShareLink in resume.go); these routes just give the
// admin UI a way to manage files there without needing Filebrowser's own UI.
func RegisterFilebrowserRoutes(app *fiber.App) {
	admin := app.Group("/admin/resume-files", authMiddleware)

	admin.Get("/", func(c *fiber.Ctx) error {
		token, err := getFilebrowserToken()
		if err != nil {
			return filebrowserUnavailableError(c)
		}

		req, _ := http.NewRequest("GET", fmt.Sprintf("%s/api/resources%s/", filebrowserPublicURL(), resumeFilesDir), nil)
		req.Header.Set("X-Auth", token)

		resp, err := httpClient.Do(req)
		if err != nil {
			return filebrowserUnavailableError(c)
		}
		defer resp.Body.Close()

		// The directory hasn't been created yet (no files uploaded) - that's
		// an empty list, not an error.
		if resp.StatusCode == http.StatusNotFound {
			return c.JSON([]ResumeFile{})
		}
		if resp.StatusCode != http.StatusOK {
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": fmt.Sprintf("Filebrowser rejected the listing request (status %d).", resp.StatusCode)})
		}

		var listing struct {
			Items []struct {
				Name     string `json:"name"`
				Path     string `json:"path"`
				Size     int64  `json:"size"`
				Modified string `json:"modified"`
				IsDir    bool   `json:"isDir"`
			} `json:"items"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&listing); err != nil {
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": "Filebrowser returned an unexpected response."})
		}

		files := make([]ResumeFile, 0)
		for _, item := range listing.Items {
			if item.IsDir {
				continue
			}
			files = append(files, ResumeFile{
				Name:     storedFilenameToDisplayName(item.Name),
				Filename: item.Name,
				Path:     item.Path,
				Size:     item.Size,
				Modified: item.Modified,
			})
		}
		return c.JSON(files)
	})

	admin.Post("/", func(c *fiber.Ctx) error {
		fileHeader, err := c.FormFile("file")
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No file provided."})
		}

		f, err := fileHeader.Open()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to read uploaded file."})
		}
		defer f.Close()

		content, err := io.ReadAll(f)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to read uploaded file."})
		}

		token, err := getFilebrowserToken()
		if err != nil {
			return filebrowserUnavailableError(c)
		}

		// filepath.Base strips any directory components from the
		// client-supplied filename - without it, a crafted filename like
		// "../../etc/whatever" would let an upload write outside resumeFilesDir.
		originalName := filepath.Base(fileHeader.Filename)
		// Prefixing with a UUID keeps the stored filename unique regardless of
		// what the admin names their files - without this, uploading a second
		// "resume.pdf" silently overwrote the first one (?override=true was
		// doing exactly what it says) instead of adding a second file.
		storedFilename := uuid.New().String() + "__" + originalName
		uploadPath := fmt.Sprintf("%s/%s", resumeFilesDir, storedFilename)

		req, err := http.NewRequest("POST", fmt.Sprintf("%s/api/resources%s?override=true", filebrowserPublicURL(), uploadPath), bytes.NewReader(content))
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to build upload request."})
		}
		req.Header.Set("X-Auth", token)
		req.Header.Set("Content-Type", "application/octet-stream")

		resp, err := httpClient.Do(req)
		if err != nil {
			return filebrowserUnavailableError(c)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": fmt.Sprintf("Filebrowser rejected the upload (status %d).", resp.StatusCode)})
		}

		recordAudit(c.Context(), actorFromRequest(c), "resume_file.upload", "resume_file", storedFilename, originalName)

		return c.JSON(fiber.Map{"status": "success", "path": uploadPath, "name": originalName, "filename": storedFilename})
	})

	admin.Delete("/:filename", func(c *fiber.Ctx) error {
		filename := filepath.Base(c.Params("filename"))
		if filename == "" || filename == "." || filename == string(os.PathSeparator) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No file specified."})
		}

		token, err := getFilebrowserToken()
		if err != nil {
			return filebrowserUnavailableError(c)
		}

		deletePath := fmt.Sprintf("%s/%s", resumeFilesDir, filename)
		req, err := http.NewRequest("DELETE", fmt.Sprintf("%s/api/resources%s", filebrowserPublicURL(), deletePath), nil)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to build delete request."})
		}
		req.Header.Set("X-Auth", token)

		resp, err := httpClient.Do(req)
		if err != nil {
			return filebrowserUnavailableError(c)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
			return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"error": fmt.Sprintf("Filebrowser rejected the delete request (status %d).", resp.StatusCode)})
		}

		recordAudit(c.Context(), actorFromRequest(c), "resume_file.delete", "resume_file", filename, "")

		return c.JSON(fiber.Map{"status": "success"})
	})
}
