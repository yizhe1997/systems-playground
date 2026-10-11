package api

// The agent door (feature 003, contracts/mcp-tools.md): the Model Context Protocol over HTTP. A tool is a thin
// wrapper over one of the owner's own read handlers, so an agent's figures are the screen's figures.

import (
	"context"
	"net/http"
	"net/url"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/adaptor"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/valyala/fasthttp"
)

// readResult is what one in-process run of a read handler produced.
type readResult struct {
	status int
	body   []byte
	total  string // X-Total-Count, when the handler set one
}

// runRead runs an owner read handler in process, as the GET request for path and query, and returns what it
// answered (an error answer included, shaped by the same error handler as the real route).
//
// The request context is initialised with Init: a bare fasthttp.RequestCtx has no server, and its Done and Err,
// which the database driver calls through c.Context(), would dereference it (fasthttp v1.51.0).
func (s *Server) runRead(h fiber.Handler, path string, query url.Values) (readResult, error) {
	var req fasthttp.Request
	req.Header.SetMethod(fiber.MethodGet)
	uri := path
	if len(query) > 0 {
		uri += "?" + query.Encode()
	}
	req.SetRequestURI(uri)
	var fctx fasthttp.RequestCtx
	fctx.Init(&req, nil, nil)
	c := s.app.AcquireCtx(&fctx)
	defer s.app.ReleaseCtx(c)
	if err := h(c); err != nil {
		if err := errorHandler(c, err); err != nil {
			return readResult{}, err
		}
	}
	return readResult{
		status: c.Response().StatusCode(),
		body:   append([]byte(nil), c.Response().Body()...),
		total:  string(c.Response().Header.Peek("X-Total-Count")),
	}, nil
}

// toolResult turns a handler's answer into a tool result: the JSON as text, and an error answer as a tool error.
func toolResult(r readResult) *mcp.CallToolResult {
	return &mcp.CallToolResult{
		Content: []mcp.Content{&mcp.TextContent{Text: string(r.body)}},
		IsError: r.status >= 400,
	}
}

type listAccountsArgs struct {
	IncludeArchived bool `json:"includeArchived,omitempty" jsonschema:"also list archived accounts"`
}

// mcpHandler is the endpoint: a stateless streamable-HTTP MCP server, answering in plain JSON.
func (s *Server) mcpHandler() fiber.Handler {
	srv := mcp.NewServer(&mcp.Implementation{Name: "tradecraft", Version: "0.1.0"}, nil)
	mcp.AddTool(srv, &mcp.Tool{
		Name:        "list_accounts",
		Description: "The journal's accounts with kind, currency, trading-day start and archived state.",
	}, func(_ context.Context, _ *mcp.CallToolRequest, in listAccountsArgs) (*mcp.CallToolResult, any, error) {
		q := url.Values{}
		if in.IncludeArchived {
			q.Set("includeArchived", "true")
		}
		r, err := s.runRead(s.listAccounts, "/accounts", q)
		if err != nil {
			return nil, nil, err
		}
		return toolResult(r), nil, nil
	})
	h := mcp.NewStreamableHTTPHandler(func(*http.Request) *mcp.Server { return srv },
		&mcp.StreamableHTTPOptions{Stateless: true, JSONResponse: true})
	return adaptor.HTTPHandler(h)
}
