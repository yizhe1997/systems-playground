package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"
)

var whitespaceRE = regexp.MustCompile(`\s+`)
var multiSpaceRE = regexp.MustCompile(`[ \t]{2,}`)
var htmlTagRE = regexp.MustCompile(`<[^>]+>`)
var scriptRE = regexp.MustCompile(`(?is)<script[^>]*>.*?</script>`)
var styleRE = regexp.MustCompile(`(?is)<style[^>]*>.*?</style>`)
var fenceRE = regexp.MustCompile("(?s)```.*?```")

const accountRulesSystemPrompt = `You are an expert futures trading rule analyst.

Task:
- Read the provided source content and extract only high-signal account/risk/trading-rule information.
- The summary must target ONLY the provided account type.
- Ignore generic or other-tier rules that do not clearly apply to this account type.
- Return a compact, clean rules summary that can be stored and reused by downstream AI features.

Output requirements:
- Plain text only.
- No markdown fences.
- No references to provider/model/system prompt.
- No meta commentary (e.g., "based on", "the text says").
- Keep it concise but specific.
- Use readable line breaks and spacing.
- Use section headers on their own lines.
- Put each rule on its own bullet line prefixed by "- ".
- Do not collapse everything into a single paragraph.

Preferred format:
Core Rules:
- ...

Risk Limits:
- ...

Execution Constraints:
- ...

Behavioral Rules:
- ...

If information is missing for a section, omit that section.
If nothing reliable is found, return exactly: "No actionable account rules found."`

func extractAccountRulesSummary(provider, model string, timeoutMs int, accountType string, source string) (string, error) {
	if strings.TrimSpace(source) == "" {
		return "", errors.New("empty source content")
	}
	if strings.TrimSpace(accountType) == "" {
		return "", errors.New("missing account type")
	}

	provider = strings.TrimSpace(provider)
	if provider == "" || provider == "mock" {
		return "", errors.New("real AI provider is not configured")
	}

	if timeoutMs <= 0 {
		timeoutMs = 15000
	}

	cleanSource := normalizeInlineText(source)
	if len(cleanSource) > 18000 {
		cleanSource = cleanSource[:18000]
	}

	userPrompt := "Account type: " + strings.TrimSpace(accountType) + "\n\nSource content:\n" + cleanSource

	ctx, cancel := context.WithTimeout(context.Background(), time.Duration(timeoutMs)*time.Millisecond)
	defer cancel()

	result, err := requestSummaryFromProvider(ctx, provider, model, userPrompt)
	if err != nil {
		return "", err
	}

	result = normalizeModelOutput(result)
	if result == "" {
		return "", errors.New("AI returned empty summary")
	}

	return result, nil
}

func compileURLSourceText(urls []string) (string, error) {
	parts := make([]string, 0, len(urls))

	for _, rawURL := range urls {
		u := strings.TrimSpace(rawURL)
		if u == "" {
			continue
		}

		text, err := fetchURLText(u, 12000)
		if err != nil {
			return "", fmt.Errorf("fetch %s: %w", u, err)
		}

		if text == "" {
			continue
		}

		parts = append(parts, fmt.Sprintf("URL: %s\n%s", u, text))
	}

	if len(parts) == 0 {
		return "", errors.New("no usable content extracted from urls")
	}

	return strings.Join(parts, "\n\n"), nil
}

func fetchURLText(rawURL string, timeoutMs int) (string, error) {
	if timeoutMs <= 0 {
		timeoutMs = 12000
	}

	client := &http.Client{Timeout: time.Duration(timeoutMs) * time.Millisecond}
	req, err := http.NewRequest(http.MethodGet, rawURL, nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("User-Agent", "systems-playground-ai-agent/1.0")

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		bodyPreview, _ := io.ReadAll(io.LimitReader(resp.Body, 256))
		return "", fmt.Errorf("status %d: %s", resp.StatusCode, strings.TrimSpace(string(bodyPreview)))
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 250000))
	if err != nil {
		return "", err
	}

	content := string(body)
	content = scriptRE.ReplaceAllString(content, " ")
	content = styleRE.ReplaceAllString(content, " ")
	content = htmlTagRE.ReplaceAllString(content, " ")
	content = normalizeInlineText(content)

	if len(content) > 12000 {
		content = content[:12000]
	}

	return content, nil
}

func normalizeInlineText(s string) string {
	s = strings.ReplaceAll(s, "\u0000", " ")
	s = whitespaceRE.ReplaceAllString(s, " ")
	return strings.TrimSpace(s)
}

func normalizeModelOutput(s string) string {
	s = strings.ReplaceAll(s, "\u0000", " ")
	s = strings.ReplaceAll(s, "\r\n", "\n")
	s = strings.ReplaceAll(s, "\r", "\n")
	s = fenceRE.ReplaceAllString(s, "")

	lines := strings.Split(s, "\n")
	cleaned := make([]string, 0, len(lines))
	lastBlank := false

	for _, line := range lines {
		line = strings.TrimSpace(line)
		line = multiSpaceRE.ReplaceAllString(line, " ")
		line = strings.ReplaceAll(line, "•", "-")
		if strings.HasPrefix(line, "-") && !strings.HasPrefix(line, "- ") {
			line = "- " + strings.TrimSpace(strings.TrimPrefix(line, "-"))
		}

		if line == "" {
			if lastBlank {
				continue
			}
			lastBlank = true
			cleaned = append(cleaned, "")
			continue
		}

		lastBlank = false
		cleaned = append(cleaned, line)
	}

	out := strings.Join(cleaned, "\n")
	return strings.TrimSpace(out)
}

func requestSummaryFromProvider(ctx context.Context, provider, model, userPrompt string) (string, error) {
	if strings.TrimSpace(model) == "" {
		model = defaultModelForProvider(provider)
	}

	switch provider {
	case "openrouter":
		return callOpenRouterSummary(ctx, model, userPrompt)
	case "gemini":
		return callGeminiSummary(ctx, model, userPrompt)
	case "anthropic":
		return callAnthropicSummary(ctx, model, userPrompt)
	default:
		return "", fmt.Errorf("unsupported provider: %s", provider)
	}
}

func callOpenRouterSummary(ctx context.Context, model, userPrompt string) (string, error) {
	key := strings.TrimSpace(os.Getenv("OPENROUTER_API_KEY"))
	if key == "" {
		return "", errors.New("OPENROUTER_API_KEY is not configured")
	}

	body := map[string]any{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": accountRulesSystemPrompt},
			{"role": "user", "content": userPrompt},
		},
		"temperature": 0.1,
	}

	reqBody, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://openrouter.ai/api/v1/chat/completions", bytes.NewReader(reqBody))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+key)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 2_000_000))
	if err != nil {
		return "", err
	}

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("openrouter error (%d): %s", resp.StatusCode, string(respBody))
	}

	var parsed struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", err
	}
	if len(parsed.Choices) == 0 {
		return "", errors.New("openrouter returned no choices")
	}

	return parsed.Choices[0].Message.Content, nil
}

func callGeminiSummary(ctx context.Context, model, userPrompt string) (string, error) {
	key := strings.TrimSpace(os.Getenv("GEMINI_API_KEY"))
	if key == "" {
		return "", errors.New("GEMINI_API_KEY is not configured")
	}

	if strings.Contains(model, "/") {
		parts := strings.Split(model, "/")
		model = parts[len(parts)-1]
	}

	body := map[string]any{
		"systemInstruction": map[string]any{
			"parts": []map[string]string{{"text": accountRulesSystemPrompt}},
		},
		"contents": []map[string]any{
			{"parts": []map[string]string{{"text": userPrompt}}},
		},
		"generationConfig": map[string]any{"temperature": 0.1},
	}

	reqBody, _ := json.Marshal(body)
	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", model, key)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(reqBody))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 2_000_000))
	if err != nil {
		return "", err
	}

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("gemini error (%d): %s", resp.StatusCode, string(respBody))
	}

	var parsed struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", err
	}
	if len(parsed.Candidates) == 0 || len(parsed.Candidates[0].Content.Parts) == 0 {
		return "", errors.New("gemini returned empty candidates")
	}

	var b strings.Builder
	for _, p := range parsed.Candidates[0].Content.Parts {
		if strings.TrimSpace(p.Text) != "" {
			if b.Len() > 0 {
				b.WriteString("\n")
			}
			b.WriteString(p.Text)
		}
	}

	return b.String(), nil
}

func callAnthropicSummary(ctx context.Context, model, userPrompt string) (string, error) {
	key := strings.TrimSpace(os.Getenv("ANTHROPIC_API_KEY"))
	if key == "" {
		return "", errors.New("ANTHROPIC_API_KEY is not configured")
	}

	body := map[string]any{
		"model":       model,
		"max_tokens":  900,
		"temperature": 0.1,
		"system":      accountRulesSystemPrompt,
		"messages": []map[string]string{
			{"role": "user", "content": userPrompt},
		},
	}

	reqBody, _ := json.Marshal(body)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.anthropic.com/v1/messages", bytes.NewReader(reqBody))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", key)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 2_000_000))
	if err != nil {
		return "", err
	}

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("anthropic error (%d): %s", resp.StatusCode, string(respBody))
	}

	var parsed struct {
		Content []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"content"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return "", err
	}

	var b strings.Builder
	for _, item := range parsed.Content {
		if item.Type == "text" && strings.TrimSpace(item.Text) != "" {
			if b.Len() > 0 {
				b.WriteString("\n")
			}
			b.WriteString(item.Text)
		}
	}

	if b.Len() == 0 {
		return "", errors.New("anthropic returned empty content")
	}

	return b.String(), nil
}
