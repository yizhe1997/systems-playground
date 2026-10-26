package api

// The agent door (feature 003, contracts/mcp-tools.md): the Model Context Protocol over HTTP, read-only. Every tool is
// a thin wrapper over one of the owner's own read handlers, so an agent's figures are the screen's figures. Each tool
// call writes one audit entry before its answer is returned; a read that cannot be recorded returns nothing.

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/adaptor"
	"github.com/jackc/pgx/v5"
	"github.com/modelcontextprotocol/go-sdk/mcp"
	"github.com/valyala/fasthttp"

	"tradecraft/internal/store"
)

// agentHeader carries the accepted token's id from the gate to the tool handlers. The gate always overwrites it, so a
// value sent by a caller never reaches a tool.
const agentHeader = "X-Tradecraft-Agent-Token"

const (
	defaultToolLimit = 50  // an absent limit is never "all"
	maxToolLimit     = 200 // at most this many items per call; offset continues
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
func (s *Server) runRead(h fiber.Handler, path string, query url.Values) (res readResult, err error) {
	defer func() {
		if p := recover(); p != nil { // a tool must never take the API down; the caller gets a plain failure
			res, err = readResult{}, errors.New("that read failed")
		}
	}()
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
// A list also carries its total, so an agent knows how to continue.
func toolResult(r readResult) *mcp.CallToolResult {
	text := string(r.body)
	if r.total != "" && r.status < 400 {
		text = `{"total":` + r.total + `,"items":` + text + `}`
	}
	return &mcp.CallToolResult{Content: []mcp.Content{&mcp.TextContent{Text: text}}, IsError: r.status >= 400}
}

// agentTokenOf is the token the gate accepted for this call (by the id the gate put in the request).
func (s *Server) agentTokenOf(ctx context.Context, req *mcp.CallToolRequest) (store.AgentTokenByIDRow, error) {
	var id string
	if req != nil && req.Extra != nil {
		id = req.Extra.Header.Get(agentHeader)
	}
	if !uuidText.MatchString(id) {
		return store.AgentTokenByIDRow{}, errors.New("not signed in")
	}
	t, err := s.q.AgentTokenByID(ctx, id)
	if errors.Is(err, pgx.ErrNoRows) {
		return t, errors.New("not signed in")
	}
	return t, err
}

// read runs one tool: the handler, then the audit entry, then the answer. The entry names the tool and, when the call
// is about an account, the account's name; never an argument value, a figure or any text of the answer.
func (s *Server) read(ctx context.Context, req *mcp.CallToolRequest, tool, accountID string, h fiber.Handler, path string, q url.Values) (*mcp.CallToolResult, any, error) {
	subject := tool
	if uuidText.MatchString(accountID) {
		if a, err := s.q.GetAccount(ctx, accountID); err == nil {
			subject = tool + ", " + a.Name
		}
	}
	return s.readAs(ctx, req, subject, h, path, q)
}

// readAs is read with the audit subject already decided.
func (s *Server) readAs(ctx context.Context, req *mcp.CallToolRequest, subject string, h fiber.Handler, path string, q url.Values) (*mcp.CallToolResult, any, error) {
	tok, err := s.agentTokenOf(ctx, req)
	if err != nil {
		return nil, nil, err
	}
	r, err := s.runRead(h, path, q)
	if err != nil {
		return nil, nil, err
	}
	by := tok.CreatedBy
	if err := recordAudit(ctx, s.q, auditEvent{Actor: "agent", IdentityID: &by, Kind: "agent_read", Subject: subject, Label: tok.Name}); err != nil {
		return nil, nil, errors.New("this read could not be recorded, so nothing was returned")
	}
	return toolResult(r), nil, nil
}

func set(q url.Values, key, value string) {
	if value != "" {
		q.Set(key, value)
	}
}

// Definitions that travel with the figures (FR-015): the same words as docs/domain.md.
const (
	defMoney = "Money is an exact decimal string in the account's currency. Net result = gross result minus costs " +
		"(gross = (exit - entry) x size x dollars per point, reversed for a short; when dollars per point is blank the typed result is used). " +
		"R = net result / risk, risk = |entry - stop| x size x dollars per point; a figure that cannot be computed is null with its reason, never zero."
	defPlan = "Plan followed X of Y: X trades answered Yes of Y live trades; Partly never counts as followed; trades with no answer are 'not judged yet'. " +
		"Every money figure comes with the plan figure of the same scope."
	defDay = "A trade belongs to the trading day of its ENTRY time in the journal time zone (an account start time shifts it). " +
		"A day of a backtest account with trades and no saved review has no state; a live one is Missing once the day has ended."
	defMistakes = "The mistake count is records: each tag on a live trade and each whole-day record, once each."
)

type listAccountsArgs struct {
	IncludeArchived bool `json:"includeArchived,omitempty" jsonschema:"also list archived accounts"`
}

type listTradesArgs struct {
	AccountID        string `json:"accountId,omitempty" jsonschema:"one account's trades, whatever its kind"`
	IncludeBacktests bool   `json:"includeBacktests,omitempty" jsonschema:"with no accountId, also list backtest accounts (default false: live accounts only)"`
	From             string `json:"from,omitempty" jsonschema:"first trading day, YYYY-MM-DD"`
	To               string `json:"to,omitempty" jsonschema:"last trading day, YYYY-MM-DD"`
	Deleted          bool   `json:"deleted,omitempty" jsonschema:"list deleted trades instead"`
	Limit            int    `json:"limit,omitempty" jsonschema:"items to return, 1 to 200 (default 50)"`
	Offset           int    `json:"offset,omitempty" jsonschema:"items to skip, to continue a list"`
}

type tradeImagesArgs struct {
	TradeID string `json:"tradeId" jsonschema:"the trade (its id from list_trades or get_day)"`
}

type dayArgs struct {
	AccountID string `json:"accountId" jsonschema:"the account"`
	Date      string `json:"date" jsonschema:"the trading day, YYYY-MM-DD"`
}

type weekArgs struct {
	AccountID string `json:"accountId" jsonschema:"the account"`
	Date      string `json:"date" jsonschema:"any trading day of the week, YYYY-MM-DD (a week runs Monday to Sunday)"`
}

type monthArgs struct {
	AccountID string `json:"accountId" jsonschema:"the account"`
	Month     string `json:"month,omitempty" jsonschema:"the month, YYYY-MM (default: the current month)"`
}

type mistakesArgs struct {
	IncludeRetired bool `json:"includeRetired,omitempty" jsonschema:"also list retired mistakes"`
}

type counterArgs struct {
	Period    string `json:"period" jsonschema:"week or month"`
	Date      string `json:"date,omitempty" jsonschema:"a trading day inside the week or month, YYYY-MM-DD (default: today)"`
	AccountID string `json:"accountId,omitempty" jsonschema:"one account; with none, all live accounts"`
}

type focusArgs struct {
	Period string `json:"period" jsonschema:"week or month"`
	Date   string `json:"date,omitempty" jsonschema:"a trading day inside the week or month, YYYY-MM-DD (default: today)"`
}

type noArgs struct{}

// mcpServer builds the tools once; the gate in front of it decides who may call.
func (s *Server) mcpServer() *mcp.Server {
	srv := mcp.NewServer(&mcp.Implementation{Name: "tradecraft", Version: "0.1.0"}, &mcp.ServerOptions{
		Instructions: "Tradecraft is the owner's trading journal. These tools only read. " + defMoney + " " + defPlan,
	})

	mcp.AddTool(srv, &mcp.Tool{
		Name: "list_accounts",
		Description: "The journal's accounts with kind (live or backtest), currency, trading-day start and archived state. " +
			"A backtest account is kept apart from live trading: its days are never Missing and it stays out of live figures unless chosen.",
	}, func(ctx context.Context, req *mcp.CallToolRequest, in listAccountsArgs) (*mcp.CallToolResult, any, error) {
		q := url.Values{}
		if in.IncludeArchived {
			q.Set("includeArchived", "true")
		}
		return s.read(ctx, req, "list_accounts", "", s.listAccounts, "/accounts", q)
	})

	mcp.AddTool(srv, &mcp.Tool{
		Name: "list_trades",
		Description: "Trades newest ENTRY first, each with its plan answer and label. Returns {total, items}; at most 200 per call, use offset to continue. " +
			"With no accountId only live accounts are listed unless includeBacktests is true. " + defMoney + " " + defPlan + " " + defDay,
	}, func(ctx context.Context, req *mcp.CallToolRequest, in listTradesArgs) (*mcp.CallToolResult, any, error) {
		q := url.Values{}
		set(q, "accountId", in.AccountID)
		set(q, "from", in.From)
		set(q, "to", in.To)
		if in.IncludeBacktests {
			q.Set("includeBacktests", "true")
		}
		if in.Deleted {
			q.Set("deleted", "true")
		}
		limit := in.Limit
		switch {
		case limit < 1:
			limit = defaultToolLimit
		case limit > maxToolLimit:
			limit = maxToolLimit
		}
		q.Set("limit", strconv.Itoa(limit))
		if in.Offset > 0 {
			q.Set("offset", strconv.Itoa(in.Offset))
		}
		return s.read(ctx, req, "list_trades", in.AccountID, s.listTrades, "/trades", q)
	})

	mcp.AddTool(srv, &mcp.Tool{
		Name: "list_trade_images",
		Description: "The screenshots attached to one trade: id, name, note, type, size and when each was added, in the order they were added. " +
			"Details only: an image itself cannot be fetched by an agent, and the limits in the answer are the owner's.",
	}, func(ctx context.Context, req *mcp.CallToolRequest, in tradeImagesArgs) (*mcp.CallToolResult, any, error) {
		if !uuidText.MatchString(in.TradeID) {
			return nil, nil, errors.New("tradeId must be a trade's id")
		}
		subject := "list_trade_images"
		if cur, err := s.q.TradeForAudit(ctx, in.TradeID); err == nil {
			if loc, err := s.journalLocation(ctx); err == nil {
				subject += ", " + tradeSubject(cur.Instrument, cur.Direction, cur.EntryAt, loc)
			}
		}
		id := in.TradeID
		return s.readAs(ctx, req, subject, func(c *fiber.Ctx) error { return s.tradeImages(c, id) }, "/trades/"+id+"/images", nil)
	})

	mcp.AddTool(srv, &mcp.Tool{
		Name: "get_day",
		Description: "One account's day: its trades in entry order, the day's figures with the plan figure, the review and its state, and yesterday's focus. " +
			defMoney + " " + defPlan + " " + defDay,
	}, func(ctx context.Context, req *mcp.CallToolRequest, in dayArgs) (*mcp.CallToolResult, any, error) {
		q := url.Values{}
		set(q, "accountId", in.AccountID)
		set(q, "date", in.Date)
		return s.read(ctx, req, "get_day", in.AccountID, s.getDailyReview, "/reviews/day", q)
	})

	mcp.AddTool(srv, &mcp.Tool{
		Name: "get_week",
		Description: "One account's week read from its days: the week's figures with the plan figure, the missing days counted, the focus and the reviewed mark. " +
			defMoney + " " + defPlan + " " + defDay,
	}, func(ctx context.Context, req *mcp.CallToolRequest, in weekArgs) (*mcp.CallToolResult, any, error) {
		q := url.Values{}
		set(q, "accountId", in.AccountID)
		set(q, "date", in.Date)
		return s.read(ctx, req, "get_week", in.AccountID, s.getWeekly, "/weekly", q)
	})

	mcp.AddTool(srv, &mcp.Tool{
		Name: "get_month",
		Description: "One account's month as weeks and days with their states and figures, and the month's focus. " +
			defMoney + " " + defPlan + " " + defDay,
	}, func(ctx context.Context, req *mcp.CallToolRequest, in monthArgs) (*mcp.CallToolResult, any, error) {
		q := url.Values{}
		set(q, "accountId", in.AccountID)
		set(q, "month", in.Month)
		return s.read(ctx, req, "get_month", in.AccountID, s.listReviews, "/reviews", q)
	})

	mcp.AddTool(srv, &mcp.Tool{
		Name:        "list_mistakes",
		Description: "The owner's list of mistakes with their stop lines. " + defMistakes,
	}, func(ctx context.Context, req *mcp.CallToolRequest, in mistakesArgs) (*mcp.CallToolResult, any, error) {
		q := url.Values{}
		if in.IncludeRetired {
			q.Set("includeRetired", "true")
		}
		return s.read(ctx, req, "list_mistakes", "", s.listMistakes, "/mistakes", q)
	})

	mcp.AddTool(srv, &mcp.Tool{
		Name: "mistake_counter",
		Description: "How many records each mistake has for the week or the month holding a date, split by account, with each stop line's status. " +
			"With no accountId it counts all live accounts. " + defMistakes,
	}, func(ctx context.Context, req *mcp.CallToolRequest, in counterArgs) (*mcp.CallToolResult, any, error) {
		q := url.Values{}
		set(q, "period", in.Period)
		set(q, "date", in.Date)
		set(q, "accountId", in.AccountID)
		return s.read(ctx, req, "mistake_counter", in.AccountID, s.mistakeCounter, "/mistakes/counter", q)
	})

	mcp.AddTool(srv, &mcp.Tool{
		Name:        "get_focus",
		Description: "The owner's focus for the week or the month holding a date (a plain text of what to work on).",
	}, func(ctx context.Context, req *mcp.CallToolRequest, in focusArgs) (*mcp.CallToolResult, any, error) {
		q := url.Values{}
		set(q, "period", in.Period)
		set(q, "date", in.Date)
		return s.read(ctx, req, "get_focus", "", s.getFocus, "/focus", q)
	})

	mcp.AddTool(srv, &mcp.Tool{
		Name:        "get_settings",
		Description: "The journal's time zone, which decides every trading day and every time shown. Nothing else of the settings is readable.",
	}, func(ctx context.Context, req *mcp.CallToolRequest, _ noArgs) (*mcp.CallToolResult, any, error) {
		return s.read(ctx, req, "get_settings", "", s.timeZoneOnly, "/settings", nil)
	})
	return srv
}

// timeZoneOnly answers GET /settings for an agent with the time zone and nothing else.
func (s *Server) timeZoneOnly(c *fiber.Ctx) error {
	st, err := s.q.GetSettings(c.Context())
	if err != nil {
		return err
	}
	return c.JSON(fiber.Map{"timeZone": st.TimeZone})
}

// mcpHandler is the endpoint: a stateless streamable-HTTP MCP server answering in plain JSON. It is mounted behind
// the AgentToken gate (agent_gate.go) and never behind the owner's.
func (s *Server) mcpHandler() fiber.Handler {
	srv := s.mcpServer()
	h := mcp.NewStreamableHTTPHandler(func(*http.Request) *mcp.Server { return srv },
		&mcp.StreamableHTTPOptions{Stateless: true, JSONResponse: true})
	return adaptor.HTTPHandler(h)
}
