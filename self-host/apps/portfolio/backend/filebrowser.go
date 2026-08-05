package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"
)

var httpClient = &http.Client{Timeout: 10 * time.Second}

// getFilebrowserToken authenticates with the Filebrowser API and returns the
// JWT token. Used by resume.go to generate expiring share links for the
// resume file - Filebrowser's own auth model, not a general-purpose file
// store for other content (native Blog posts used to route through here
// too; that content is now stored inline on the Post record instead).
func getFilebrowserToken() (string, error) {
	fbUrl := os.Getenv("FILEBROWSER_PUBLIC_URL")
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
