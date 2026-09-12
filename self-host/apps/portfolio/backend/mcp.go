package main

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/adaptor"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// --- list_projects ---

type ListProjectsInput struct{}

// ListProjectsOutput wraps the slice in an object - the SDK's AddTool
// derives an output JSON schema by reflection and requires a top-level
// object, not a bare array.
type ListProjectsOutput struct {
	Projects []Project `json:"projects"`
}

func listProjectsHandler(ctx context.Context, req *mcp.CallToolRequest, in ListProjectsInput) (*mcp.CallToolResult, ListProjectsOutput, error) {
	return nil, ListProjectsOutput{Projects: getPublishedList(ctx, "cms:projects", func(p Project) string { return p.Status })}, nil
}

// --- get_project ---

type GetProjectInput struct {
	ID string `json:"id" jsonschema:"the project's id, as returned by list_projects"`
}

func getProjectHandler(ctx context.Context, req *mcp.CallToolRequest, in GetProjectInput) (*mcp.CallToolResult, *Project, error) {
	projects := getPublishedList(ctx, "cms:projects", func(p Project) string { return p.Status })
	for i := range projects {
		if projects[i].ID == in.ID {
			return nil, &projects[i], nil
		}
	}
	return nil, nil, fmt.Errorf("no published project with id %q", in.ID)
}

// --- list_posts ---

type ListPostsInput struct{}

type ListPostsOutput struct {
	Posts []Post `json:"posts"`
}

func listPostsHandler(ctx context.Context, req *mcp.CallToolRequest, in ListPostsInput) (*mcp.CallToolResult, ListPostsOutput, error) {
	return nil, ListPostsOutput{Posts: getPublishedList(ctx, "cms:posts", func(p Post) string { return p.Status })}, nil
}

// --- list_education ---

type ListEducationInput struct{}

type ListEducationOutput struct {
	Education []Education `json:"education"`
}

func listEducationHandler(ctx context.Context, req *mcp.CallToolRequest, in ListEducationInput) (*mcp.CallToolResult, ListEducationOutput, error) {
	return nil, ListEducationOutput{Education: getPublishedList(ctx, "cms:education", func(e Education) string { return e.Status })}, nil
}

// --- list_experience ---

type ListExperienceInput struct{}

type ListExperienceOutput struct {
	Experience []Experience `json:"experience"`
}

func listExperienceHandler(ctx context.Context, req *mcp.CallToolRequest, in ListExperienceInput) (*mcp.CallToolResult, ListExperienceOutput, error) {
	return nil, ListExperienceOutput{Experience: getPublishedList(ctx, "cms:experience", func(e Experience) string { return e.Status })}, nil
}

// --- list_stack ---

type ListStackInput struct{}

type ListStackOutput struct {
	Stack []StackCategory `json:"stack"`
}

func listStackHandler(ctx context.Context, req *mcp.CallToolRequest, in ListStackInput) (*mcp.CallToolResult, ListStackOutput, error) {
	return nil, ListStackOutput{Stack: getPublishedList(ctx, "cms:stack", func(cat StackCategory) string { return cat.Status })}, nil
}

// --- search_by_tag ---

type SearchByTagInput struct {
	Tag string `json:"tag" jsonschema:"the technology/skill tag to search for, e.g. 'Redis' - matched case-insensitively, exact tag match not substring"`
}

// ExperienceTagMatch is a flattened position-level result (rather than the
// full Experience/ExperiencePosition nesting) - a tag search cares about
// "which role used X", so returning the position directly alongside its
// parent company avoids making the caller re-walk Positions to find the
// one that actually matched.
type ExperienceTagMatch struct {
	Company   string   `json:"company"`
	Position  string   `json:"position"`
	StartDate string   `json:"start_date"`
	EndDate   string   `json:"end_date"`
	TechTags  []string `json:"tech_tags"`
}

type SearchByTagOutput struct {
	Projects   []Project             `json:"projects"`
	Experience []ExperienceTagMatch `json:"experience"`
}

func hasTagCI(tags []string, tag string) bool {
	for _, t := range tags {
		if strings.EqualFold(strings.TrimSpace(t), strings.TrimSpace(tag)) {
			return true
		}
	}
	return false
}

// searchByTagHandler searches both Project.TechStack and
// ExperiencePosition.TechTags in one call. The motivating use case ("what's
// this person's experience with Redis?") is inherently cross-entity - a
// visitor asking about a technology doesn't know or care which CMS bucket
// it lives in, and splitting this into two tools would just force two tool
// calls for what's conceptually one question.
func searchByTagHandler(ctx context.Context, req *mcp.CallToolRequest, in SearchByTagInput) (*mcp.CallToolResult, SearchByTagOutput, error) {
	out := SearchByTagOutput{Projects: []Project{}, Experience: []ExperienceTagMatch{}}

	for _, p := range getPublishedList(ctx, "cms:projects", func(p Project) string { return p.Status }) {
		if hasTagCI(p.TechStack, in.Tag) {
			out.Projects = append(out.Projects, p)
		}
	}
	for _, e := range getPublishedList(ctx, "cms:experience", func(e Experience) string { return e.Status }) {
		for _, pos := range e.Positions {
			if hasTagCI(pos.TechTags, in.Tag) {
				out.Experience = append(out.Experience, ExperienceTagMatch{
					Company:   e.Company,
					Position:  pos.Title,
					StartDate: pos.StartDate,
					EndDate:   pos.EndDate,
					TechTags:  pos.TechTags,
				})
			}
		}
	}
	return nil, out, nil
}

func buildMCPServer() *mcp.Server {
	server := mcp.NewServer(&mcp.Implementation{
		Name:    "portfolio-mcp",
		Version: "1.0.0",
	}, nil)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "list_projects",
		Description: "List all published portfolio projects (title, description, tech stack, dates, links).",
	}, listProjectsHandler)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "get_project",
		Description: "Get a single published portfolio project by its id.",
	}, getProjectHandler)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "list_posts",
		Description: "List all published blog posts (title, content, cover image, published date, rating).",
	}, listPostsHandler)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "list_education",
		Description: "List published education history (school, degree, field of study, dates, highlights).",
	}, listEducationHandler)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "search_by_tag",
		Description: "Find projects and work-experience positions that used a given technology/skill tag.",
	}, searchByTagHandler)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "list_experience",
		Description: "List published work experience (companies, positions, bullets, tech tags).",
	}, listExperienceHandler)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "list_stack",
		Description: "List the published tech stack, grouped by category.",
	}, listStackHandler)

	return server
}

// RegisterMCPRoutes mounts a public, unauthenticated, read-only MCP server at
// /mcp. Everything it exposes (projects, stack, experience) is already fully
// public on the site today - MCP is just a different access shape to
// already-public data, not a new trust boundary. Stateless mode keeps every
// call a one-shot POST->JSON-response cycle: the right fit for simple
// read-only tools, and it also sidesteps a real limitation of Fiber's
// adaptor package (built on fasthttpadaptor, which doesn't implement
// http.Flusher, so true incremental SSE streaming through it is unreliable).
func RegisterMCPRoutes(app *fiber.App) {
	server := buildMCPServer()
	mcpHandler := mcp.NewStreamableHTTPHandler(
		func(*http.Request) *mcp.Server { return server },
		&mcp.StreamableHTTPOptions{Stateless: true},
	)

	mcpCORS := cors.New(cors.Config{
		AllowOrigins: "*",
		AllowMethods: "GET,POST,OPTIONS",
		AllowHeaders: "Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version",
	})

	// Generous relative to resumeRequestLimiter's 5/hour (a single form submission) - a real
	// conversational tool-use session can legitimately fire several tool calls per turn.
	// 30/min/IP protects availability, not cost: there's no AI inference on this side, just
	// Redis reads, so this is only about not letting a scripted flood hammer the backend.
	mcpLimiter := limiter.New(limiter.Config{
		Max:        30,
		Expiration: 1 * time.Minute,
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Too many MCP requests. Please slow down.",
			})
		},
	})

	app.All("/mcp", mcpCORS, mcpLimiter, adaptor.HTTPHandler(mcpHandler))
}
