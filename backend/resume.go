package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/smtp"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ResumeRequest struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Company   string `json:"company"`
	Reason    string `json:"reason"`
	Status    string `json:"status"` // pending, approved, rejected
	CreatedAt int64  `json:"created_at"`
}

func RegisterResumeRoutes(app *fiber.App) {
	// Public endpoint to submit a new resume request
	app.Post("/api/resume/request", func(c *fiber.Ctx) error {
		var req ResumeRequest
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid request body"})
		}

		if req.Name == "" || req.Email == "" || req.Company == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Name, email, and company are required"})
		}

		req.ID = uuid.New().String()
		req.Status = "pending"
		req.CreatedAt = time.Now().UnixMilli()

		// Save to Redis List
		reqJSON, _ := json.Marshal(req)
		err := redisClient.LPush(c.Context(), "resume_requests", reqJSON).Err()
		if err != nil {
			log.Printf("❌ Failed to save resume request to Redis: %v", err)
			return c.Status(500).JSON(fiber.Map{"error": "Failed to save request"})
		}

		log.Printf("📩 New resume request from %s (%s)", req.Name, req.Company)

		// Fire Webhook Notification (e.g. Discord/Slack)
		webhookUrl := os.Getenv("RESUME_WEBHOOK_URL")
		if webhookUrl != "" {
			go fireNotificationWebhook(webhookUrl, req)
		}

		return c.Status(201).JSON(fiber.Map{"status": "success", "id": req.ID})
	})

	// Protected Admin Routes
	admin := app.Group("/admin/resume", authMiddleware)

	// List all requests
	admin.Get("/requests", func(c *fiber.Ctx) error {
		vals, err := redisClient.LRange(c.Context(), "resume_requests", 0, -1).Result()
		if err != nil {
			return c.JSON([]ResumeRequest{})
		}

		requests := make([]ResumeRequest, 0)
		for _, val := range vals {
			var req ResumeRequest
			json.Unmarshal([]byte(val), &req)
			requests = append(requests, req)
		}

		return c.JSON(requests)
	})

	// Approve or Reject a request
	admin.Post("/requests/:id/action", func(c *fiber.Ctx) error {
		id := c.Params("id")
		
		type ActionPayload struct {
			Action string `json:"action"` // "approve" or "reject"
		}
		var payload ActionPayload
		if err := c.BodyParser(&payload); err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid action payload"})
		}

		ctx := c.Context()
		vals, err := redisClient.LRange(ctx, "resume_requests", 0, -1).Result()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to read requests"})
		}

		var targetReq *ResumeRequest
		var targetIndex int

		for i, val := range vals {
			var r ResumeRequest
			json.Unmarshal([]byte(val), &r)
			if r.ID == id {
				targetReq = &r
				targetIndex = i
				break
			}
		}

		if targetReq == nil {
			return c.Status(404).JSON(fiber.Map{"error": "Request not found"})
		}

		// Process Action
		if payload.Action == "approve" {
			targetReq.Status = "approved"
			
			// 1. Ask Filebrowser for a 24h expiring link
			shareLink, err := generateFilebrowserShareLink(ctx)
			if err != nil {
				log.Printf("❌ Failed to generate share link: %v", err)
				return c.Status(500).JSON(fiber.Map{"error": fmt.Sprintf("Failed to generate secure link (Is Filebrowser running on port 8088?): %v", err)})
			}

			// 2. Send the Email via SendGrid/Resend API
			err = sendEmailViaSMTP(targetReq.Email, targetReq.Name, shareLink)
			if err != nil {
				log.Printf("❌ Failed to send email: %v", err)
				return c.Status(500).JSON(fiber.Map{"error": "Failed to send email. Link was generated."})
			}
			
		} else if payload.Action == "reject" {
			targetReq.Status = "rejected"
		} else {
			return c.Status(400).JSON(fiber.Map{"error": "Invalid action. Use 'approve' or 'reject'"})
		}

		// Update Redis List (LSET)
		updatedJSON, _ := json.Marshal(targetReq)
		err = redisClient.LSet(ctx, "resume_requests", int64(targetIndex), updatedJSON).Err()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Failed to update request status"})
		}

		return c.JSON(fiber.Map{"status": "success", "request": targetReq})
	})
}

// ---------------------------------------------
// Helper Functions
// ---------------------------------------------

func fireNotificationWebhook(url string, req ResumeRequest) {
	payload := map[string]any{
		"content": fmt.Sprintf("🚨 **New Resume Request!**\n**Name:** %s\n**Company:** %s\n**Reason:** %s\n\nLogin to the Control Plane to approve.", req.Name, req.Company, req.Reason),
	}
	jsonPayload, _ := json.Marshal(payload)
	http.Post(url, "application/json", bytes.NewBuffer(jsonPayload))
}

func generateFilebrowserShareLink(ctx context.Context) (string, error) {
	// Get internal filebrowser API token
	token, err := getFilebrowserToken()
	if err != nil {
		return "", err
	}

	fbUrl := os.Getenv("FILEBROWSER_URL")
	if fbUrl == "" {
		fbUrl = "http://host.docker.internal:8088"
	}

	// Fetch dynamic path from Redis global settings
	resumePath, err := GetConfig(ctx, "resumeUrl", "/resume.pdf")
	if err != nil || resumePath == "" {
		resumePath = "/resume.pdf"
	}
	
	// Ensure the path starts with a slash
	if len(resumePath) > 0 && resumePath[0] != '/' {
		resumePath = "/" + resumePath
	}

	// Post to /api/share/{path}
	payload := map[string]any{
		"password": "", 
		"expires": "24h", // 24 hour expiration
		"unit": "hours",
	}
	jsonPayload, _ := json.Marshal(payload)

	reqUrl := fmt.Sprintf("%s/api/share%s", fbUrl, resumePath)
	req, _ := http.NewRequest("POST", reqUrl, bytes.NewBuffer(jsonPayload))
	req.Header.Set("X-Auth", token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("filebrowser rejected share request: %d", resp.StatusCode)
	}

	// The API returns an object with a "hash" string
	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	hash, ok := result["hash"].(string)
	if !ok {
		return "", fmt.Errorf("no hash returned from filebrowser")
	}

	// Construct the public URL
	publicDomain := os.Getenv("FILEBROWSER_PUBLIC_URL") // e.g. https://files.yourdomain.com
	if publicDomain == "" {
		publicDomain = "http://localhost:8088"
	}

	return fmt.Sprintf("%s/share/%s", publicDomain, hash), nil
}

func sendEmailViaSMTP(toEmail string, name string, shareLink string) error {
	smtpEmail := os.Getenv("SMTP_EMAIL")
	smtpPassword := os.Getenv("SMTP_PASSWORD")

	if smtpEmail == "" || smtpPassword == "" {
		log.Println("⚠️ SMTP credentials not set. Skipping actual email dispatch (Simulation Mode).")
		log.Printf("📩 SIMULATED EMAIL TO %s: Here is your link: %s\n", toEmail, shareLink)
		return nil
	}

	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	auth := smtp.PlainAuth("", smtpEmail, smtpPassword, smtpHost)

	from := smtpEmail
	to := []string{toEmail}

	subject := "Subject: Chin Yi Zhe - Requested Resume\r\n"
	mime := "MIME-version: 1.0;\r\nContent-Type: text/html; charset=\"UTF-8\";\r\n\r\n"
	body := fmt.Sprintf("<p>Hi %s,</p><p>Thank you for your interest! As requested, here is the link to download my resume.</p><p><a href='%s'>Download Resume (Expires in 24 hours)</a></p><p>Best regards,<br/>Chin Yi Zhe</p>", name, shareLink)

	msg := []byte(subject + mime + body)

	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, from, to, msg)
	if err != nil {
		return fmt.Errorf("smtp error: %v", err)
	}

	return nil
}
