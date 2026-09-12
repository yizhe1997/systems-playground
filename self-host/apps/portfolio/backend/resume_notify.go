package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html"
	"html/template"
	"log"
	"net/http"
	"net/smtp"
	"os"
	"strings"
)

func fireNotificationWebhook(url string, req ResumeRequest) {
	content := fmt.Sprintf("🚨 **New Resume Request!**\n**Name:** %s\n**Hiring company:** %s\n**Reason:** %s", req.Name, req.Company, req.Reason)
	if req.SalaryRange != "" {
		content += fmt.Sprintf("\n**Salary range:** %s", req.SalaryRange)
	}
	content += "\n\nLogin to the Control Plane to approve."

	// allowed_mentions: {"parse": []} is Discord's own documented way to
	// disable every kind of mention (@everyone, @here, user/role pings) a
	// message's content could trigger, regardless of what's actually in it -
	// the right fix here, since Name/Company/Reason are untrusted third-party
	// input and Discord interprets @everyone etc. in webhook content by
	// default. Hand-stripping "@everyone" as text would be both fragile
	// (several equivalent mention forms exist) and would mangle a legitimate
	// company name that happens to contain an @ symbol.
	payload := map[string]any{
		"content":          content,
		"allowed_mentions": map[string]any{"parse": []string{}},
	}
	jsonPayload, _ := json.Marshal(payload)
	http.Post(url, "application/json", bytes.NewBuffer(jsonPayload))
}

// ResumeLink pairs a share URL with the resume's display name (the original
// filename, recovered from its uuid__original.ext stored name - see
// storedFilenameToDisplayName in filebrowser.go) for use in the approval email.
type ResumeLink struct {
	Name string
	URL  string
}

func generateFilebrowserShareLink(resumePath string) (string, error) {
	// Get internal filebrowser API token
	token, err := getFilebrowserToken()
	if err != nil {
		return "", err
	}

	fbUrl := filebrowserPublicURL()

	// Ensure the path starts with a slash
	if len(resumePath) > 0 && resumePath[0] != '/' {
		resumePath = "/" + resumePath
	}

	// Post to /api/share/{path}
	payload := map[string]any{
		"password": "",
		"expires":  "24", // 24 hour expiration
		"unit":     "hours",
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

	// Distinct from fbUrl above: that's the Docker-internal address this
	// backend uses to reach Filebrowser (host.docker.internal), but this URL
	// is emailed to a human and opened in their browser, so its fallback
	// must be something actually reachable from outside the container.
	publicDomain := os.Getenv("FILEBROWSER_PUBLIC_URL")
	if publicDomain == "" {
		publicDomain = "http://localhost:8088"
	}

	return fmt.Sprintf("%s/share/%s", publicDomain, hash), nil
}

// resumeLinksHTML renders one or more resume links for the {{.link}}
// template value - a single anchor for one resume (matches the original
// single-resume email's look), or a bulleted list once there's more than
// one so the recipient can tell them apart. l.Name comes from an
// admin-picked filename (see storedFilenameToDisplayName), not third-party
// input, but it's escaped anyway since this fragment gets marked
// template.HTML at the call site and so bypasses the template engine's own
// auto-escaping.
func resumeLinksHTML(links []ResumeLink) string {
	if len(links) == 1 {
		return fmt.Sprintf("<a href='%s'>%s (Expires in 24 hours)</a>", links[0].URL, html.EscapeString(links[0].Name))
	}
	var sb strings.Builder
	sb.WriteString("<ul>")
	for _, l := range links {
		sb.WriteString(fmt.Sprintf("<li><a href='%s'>%s (Expires in 24 hours)</a></li>", l.URL, html.EscapeString(l.Name)))
	}
	sb.WriteString("</ul>")
	return sb.String()
}

// resumeLinksRaw renders the {{.raw_link}} template value - plain
// "Name: URL" per resume, newline-separated, for admins who want the bare
// URL(s) rather than a pre-built link element.
func resumeLinksRaw(links []ResumeLink) string {
	parts := make([]string, len(links))
	for i, l := range links {
		parts[i] = fmt.Sprintf("%s: %s", l.Name, l.URL)
	}
	return strings.Join(parts, "\n")
}

// renderEmailTemplate parses src as an html/template and executes it
// against data - the one place every outbound email body routes through, so
// {{.name}} (the requester's own submitted, untrusted name) is always
// auto-escaped by the template engine itself rather than relying on each
// call site to remember to escape it by hand. A value that's already-safe,
// pre-built HTML (like resumeLinksHTML's output) is passed in wrapped as
// template.HTML so the engine renders it verbatim instead of escaping it
// into visible tag text.
func renderEmailTemplate(src string, data map[string]any) (string, error) {
	tmpl, err := template.New("email").Parse(src)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return "", err
	}
	return buf.String(), nil
}

// wrongRecipientDisclaimer is appended to every outbound resume-request
// email. Nothing in the submission flow verifies the submitter actually
// owns the email address they typed in - there's no verification-link step,
// so this can't stop someone from putting in a stranger's address. It just
// makes sure whoever actually receives the email, if it wasn't them who
// asked, knows what happened and that no action is needed on their part.
const wrongRecipientDisclaimer = `<p style="color:#888888;font-size:12px;margin-top:24px;">If you didn't request this, you can safely ignore this email — no action was taken and nothing further will be sent.</p>`

func sendEmailViaSMTP(toEmail string, name string, links []ResumeLink, customSubject string, customBody string) error {
	smtpEmail := os.Getenv("SMTP_EMAIL")
	smtpPassword := os.Getenv("SMTP_PASSWORD")

	if smtpEmail == "" || smtpPassword == "" {
		log.Println("⚠️ SMTP credentials not set. Skipping actual email dispatch (Simulation Mode).")
		for _, l := range links {
			log.Printf("📩 SIMULATED EMAIL TO %s: %s -> %s\n", toEmail, l.Name, l.URL)
		}
		return nil
	}

	smtpHost := "smtp.gmail.com"
	smtpPort := "587"

	auth := smtp.PlainAuth("", smtpEmail, smtpPassword, smtpHost)

	from := smtpEmail
	to := []string{toEmail}

	subjectLine := customSubject
	if subjectLine == "" {
		subjectLine = "Chin Yi Zhe - Requested Resume"
	}
	subject := "Subject: " + subjectLine + "\r\n"

	mime := "MIME-version: 1.0;\r\nContent-Type: text/html; charset=\"UTF-8\";\r\n\r\n"

	data := map[string]any{
		"name":     name,
		"link":     template.HTML(resumeLinksHTML(links)), //nolint:gosec // resumeLinksHTML escapes what it interpolates itself
		"raw_link": resumeLinksRaw(links),
	}

	var bodySrc string
	if customBody == "" {
		intro := "here is the link to download my resume."
		if len(links) > 1 {
			intro = "here are the links to download my resume."
		}
		data["intro"] = intro
		bodySrc = "<p>Hi {{.name}},</p><p>Thank you for your interest! As requested, {{.intro}}</p><p>{{.link}}</p><p>Best regards,<br/>Chin Yi Zhe</p>" + wrongRecipientDisclaimer
	} else {
		// The admin's own line breaks become real <br/> tags in the
		// template's static (trusted, admin-authored) text - this happens
		// before parsing, not to any substituted value, so it's not an
		// escaping concern the way {{.name}} etc. are. The disclaimer is
		// appended unconditionally after whatever the admin writes, rather
		// than relying on them to remember to include it themselves.
		bodySrc = strings.ReplaceAll(customBody, "\n", "<br/>") + wrongRecipientDisclaimer
	}

	body, err := renderEmailTemplate(bodySrc, data)
	if err != nil {
		return fmt.Errorf("email body has invalid template syntax: %w", err)
	}

	msg := []byte("From: " + from + "\r\nTo: " + toEmail + "\r\n" + subject + mime + body)

	if err := smtp.SendMail(smtpHost+":"+smtpPort, auth, from, to, msg); err != nil {
		return fmt.Errorf("smtp error: %v", err)
	}

	return nil
}

// sendRequestReceivedEmail confirms the submission and gives the requester a
// link back to the live status page - they shouldn't have to keep the tab
// open while a human reviews the request.
func sendRequestReceivedEmail(toEmail string, name string, requestID string) {
	statusURL := fmt.Sprintf("%s/resume/status/%s", frontendPublicURL(), requestID)

	smtpEmail := os.Getenv("SMTP_EMAIL")
	smtpPassword := os.Getenv("SMTP_PASSWORD")
	if smtpEmail == "" || smtpPassword == "" {
		log.Printf("📩 SIMULATED EMAIL TO %s: Track your request here: %s\n", toEmail, statusURL)
		return
	}

	smtpHost := "smtp.gmail.com"
	smtpPort := "587"
	auth := smtp.PlainAuth("", smtpEmail, smtpPassword, smtpHost)

	subject := "Subject: Chin Yi Zhe - Resume request received\r\n"
	mime := "MIME-version: 1.0;\r\nContent-Type: text/html; charset=\"UTF-8\";\r\n\r\n"

	// .url lands inside an href attribute - html/template's context-aware
	// escaping applies URL-attribute rules to it automatically, on top of
	// .name's plain HTML-text escaping.
	body, err := renderEmailTemplate(
		`<p>Hi {{.name}},</p><p>Got your resume request - it's being triaged and reviewed now.</p><p><a href="{{.url}}">Track its status here</a></p><p>Best regards,<br/>Chin Yi Zhe</p>`+wrongRecipientDisclaimer,
		map[string]any{"name": name, "url": statusURL},
	)
	if err != nil {
		log.Printf("⚠️ Failed to render request-received email body for %s: %v", toEmail, err)
		return
	}

	msg := []byte("From: " + smtpEmail + "\r\nTo: " + toEmail + "\r\n" + subject + mime + body)

	if err := smtp.SendMail(smtpHost+":"+smtpPort, auth, smtpEmail, []string{toEmail}, msg); err != nil {
		log.Printf("⚠️ Failed to send request-received email to %s: %v", toEmail, err)
	}
}

func frontendPublicURL() string {
	url := os.Getenv("FRONTEND_PUBLIC_URL")
	if url == "" {
		return "http://localhost:8086"
	}
	return url
}
