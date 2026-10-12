package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"tradecraft/internal/api"
)

// Feature 003, user story 3: an agent reads the journal, read-only, through the Model Context Protocol. These tests
// use the SDK's own client against a listening server, as a real agent would.

// door is a second instance of the API on a loopback port, so the SDK's client can talk to it over HTTP.
type door struct{ url string }

func startDoor(t *testing.T) *door {
	t.Helper()
	d := api.New(pool, func() time.Time { return clock }, testSecret)
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	go func() { _ = d.Listener(ln) }()
	t.Cleanup(func() { _ = d.Shutdown() })
	return &door{url: "http://" + ln.Addr().String() + "/mcp"}
}

type headerRT struct{ token string }

func (h headerRT) RoundTrip(r *http.Request) (*http.Response, error) {
	if h.token != "" {
		r.Header.Set("Authorization", "Bearer "+h.token)
	}
	return http.DefaultTransport.RoundTrip(r)
}

// connect opens an MCP session as an agent holding token.
func (d *door) connect(t *testing.T, token string) *mcp.ClientSession {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	t.Cleanup(cancel)
	client := mcp.NewClient(&mcp.Implementation{Name: "test-agent", Version: "0"}, nil)
	s, err := client.Connect(ctx, &mcp.StreamableClientTransport{Endpoint: d.url, HTTPClient: &http.Client{Transport: headerRT{token}}}, nil)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	t.Cleanup(func() { _ = s.Close() })
	return s
}

// raw posts one JSON-RPC request with no SDK in between: the status and the body.
func (d *door) raw(t *testing.T, token string, header map[string]string, rpc string) (int, string) {
	t.Helper()
	req, err := http.NewRequest("POST", d.url, strings.NewReader(rpc))
	if err != nil {
		t.Fatal(err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	for k, v := range header {
		req.Header.Set(k, v)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer res.Body.Close()
	b, _ := io.ReadAll(res.Body)
	return res.StatusCode, string(b)
}

const rpcListTools = `{"jsonrpc":"2.0","id":1,"method":"tools/list"}`
const rpcCallAccounts = `{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_accounts","arguments":{}}}`

// call runs one tool and returns the text of its answer.
func callTool(t *testing.T, s *mcp.ClientSession, name string, args map[string]any) (string, bool) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	res, err := s.CallTool(ctx, &mcp.CallToolParams{Name: name, Arguments: args})
	if err != nil {
		t.Fatalf("%s: %v", name, err)
	}
	if len(res.Content) != 1 {
		t.Fatalf("%s: %d content parts", name, len(res.Content))
	}
	return res.Content[0].(*mcp.TextContent).Text, res.IsError
}

// agentWithToken turns agent access on and makes a token as the owner.
func agentWithToken(t *testing.T, name string) string {
	t.Helper()
	turnAgentAccess(t, true)
	return tokenOf(makeToken(t, name))
}

func sameJSON(t *testing.T, what string, got, want []byte) {
	t.Helper()
	var g, w any
	if err := json.Unmarshal(got, &g); err != nil {
		t.Fatalf("%s: tool answer is not JSON: %v: %s", what, err, got)
	}
	if err := json.Unmarshal(want, &w); err != nil {
		t.Fatalf("%s: route answer is not JSON: %v", what, err)
	}
	gb, _ := json.Marshal(g)
	wb, _ := json.Marshal(w)
	if !bytes.Equal(gb, wb) {
		t.Errorf("%s: the tool and the route differ:\n tool  %s\n route %s", what, gb, wb)
	}
}

var wantTools = []string{"get_day", "get_focus", "get_month", "get_settings", "get_week", "list_accounts", "list_mistakes", "list_trades", "mistake_counter"}

func TestToolsAreExactlyTheNineReads(t *testing.T) {
	reset(t)
	token := agentWithToken(t, "Claude Desktop")
	s := startDoor(t).connect(t, token)
	ctx := context.Background()
	res, err := s.ListTools(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	var names []string
	for _, tool := range res.Tools {
		names = append(names, tool.Name)
		if len(tool.Description) < 40 {
			t.Errorf("%s: no description", tool.Name)
		}
		// nothing of the audit log, identities, tokens, the switch or the export (SC-008)
		for _, bad := range []string{"audit", "identit", "token", "agent", "switch", "export", "secret", "settings_"} {
			if strings.Contains(tool.Name, bad) {
				t.Errorf("tool %q looks like something an agent must not have", tool.Name)
			}
		}
	}
	sort.Strings(names)
	if strings.Join(names, ",") != strings.Join(wantTools, ",") {
		t.Fatalf("tools: %v", names)
	}
	// the figures arrive with their definitions and the plan figure (FR-015)
	for _, tool := range res.Tools {
		switch tool.Name {
		case "list_trades", "get_day", "get_week", "get_month":
			for _, must := range []string{"Net result", "Plan followed X of Y", "ENTRY"} {
				if !strings.Contains(tool.Description, must) {
					t.Errorf("%s: description lacks %q", tool.Name, must)
				}
			}
		case "list_mistakes", "mistake_counter":
			if !strings.Contains(tool.Description, "records") {
				t.Errorf("%s: description lacks the definition of a mistake count", tool.Name)
			}
		}
	}
	// a tool that does not exist is an error, and nothing answers
	if _, err := s.CallTool(ctx, &mcp.CallToolParams{Name: "export", Arguments: map[string]any{}}); err == nil {
		t.Error("an export tool answered")
	}
}

// SC-006: for every read, the figures equal the owner's route's for the same scope.
func TestEachToolEqualsTheOwnersRoute(t *testing.T) {
	reset(t)
	s := sampleDay(t) // Funded 50K, 17:00, three trades on Wed 1 Oct 2025
	judgeSample(t, s)
	bt := accountOfKind(t, "NQ ORB backtest 2024", "backtest")
	trade(t, sampleTrade(bt, "2025-10-01T10:14", "2025-10-01T10:31", "21500.00", "21493.75"))
	mustStatus(t, call(t, "PUT", "/focus", map[string]any{"period": "week", "date": "2025-10-01", "body": "Wait for the retest."}), 200)
	sess := startDoor(t).connect(t, agentWithToken(t, "Claude Desktop"))

	route := func(path string) []byte {
		r := call(t, "GET", path, nil)
		mustStatus(t, r, 200)
		return r.raw
	}
	acct, day := s.acct, "2025-10-01"
	same := func(tool string, args map[string]any, path string) {
		t.Helper()
		text, isErr := callTool(t, sess, tool, args)
		if isErr {
			t.Fatalf("%s: tool error: %s", tool, text)
		}
		sameJSON(t, tool, []byte(text), route(path))
	}
	same("list_accounts", map[string]any{}, "/accounts?includeArchived=false")
	same("get_day", map[string]any{"accountId": acct, "date": day}, "/reviews/day?accountId="+acct+"&date="+day)
	same("get_week", map[string]any{"accountId": acct, "date": day}, "/weekly?accountId="+acct+"&date="+day)
	same("get_month", map[string]any{"accountId": acct, "month": "2025-10"}, "/reviews?accountId="+acct+"&month=2025-10")
	same("list_mistakes", map[string]any{}, "/mistakes?includeRetired=false")
	same("mistake_counter", map[string]any{"period": "week", "date": day}, "/mistakes/counter?period=week&date="+day)
	same("get_focus", map[string]any{"period": "week", "date": day}, "/focus?period=week&date="+day)
	same("get_settings", map[string]any{}, "/settings")
	// the same for a backtest account chosen on its own
	same("get_day", map[string]any{"accountId": bt, "date": day}, "/reviews/day?accountId="+bt+"&date="+day)

	// a list carries its total beside the items
	text, _ := callTool(t, sess, "list_trades", map[string]any{"accountId": acct})
	var list struct {
		Total int              `json:"total"`
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal([]byte(text), &list); err != nil {
		t.Fatal(err)
	}
	r := call(t, "GET", "/trades?accountId="+acct+"&limit=50", nil)
	routeItems, _ := json.Marshal(r.list)
	gotItems, _ := json.Marshal(list.Items)
	if list.Total != 3 || string(routeItems) != string(gotItems) {
		t.Errorf("list_trades: total %d\n tool  %s\n route %s", list.Total, gotItems, routeItems)
	}
	// a figure that cannot be computed is a dash with its reason, never a zero (the sample trades have no stop)
	first := list.Items[0]
	if first["rMultiple"] != nil || first["reasons"].(map[string]any)["rMultiple"] == "" {
		t.Errorf("R without a stop: %v", first)
	}
}

func TestListsAreBoundedAndBacktestsAreLeftOutUnlessAsked(t *testing.T) {
	reset(t)
	live := account(t, "Funded 50K", "USD", "")
	bt := accountOfKind(t, "NQ ORB backtest 2024", "backtest")
	for _, a := range []string{live, bt} {
		exec(t, `INSERT INTO trade (account_id, instrument, direction, size, entry_price, exit_price, entry_at, exit_at, dollars_per_point, cost)
		         SELECT $1, 'NQ', 'long', 1, 21000, 21001, TIMESTAMPTZ '2025-09-01 14:00+00' + (n * interval '30 minutes'),
		                TIMESTAMPTZ '2025-09-01 14:10+00' + (n * interval '30 minutes'), 20, 0
		           FROM generate_series(1, 500) n`, a)
	}
	s := startDoor(t).connect(t, agentWithToken(t, "Claude Desktop"))
	type page struct {
		Total int              `json:"total"`
		Items []map[string]any `json:"items"`
	}
	get := func(args map[string]any) page {
		t.Helper()
		text, isErr := callTool(t, s, "list_trades", args)
		if isErr {
			t.Fatalf("%v: %s", args, text)
		}
		var p page
		if err := json.Unmarshal([]byte(text), &p); err != nil {
			t.Fatal(err)
		}
		return p
	}
	// no limit is 50, never all
	p := get(map[string]any{"accountId": live})
	if len(p.Items) != 50 || p.Total != 500 {
		t.Errorf("no limit: %d items of %d", len(p.Items), p.Total)
	}
	// a large limit is 200, and the offset continues
	a := get(map[string]any{"accountId": live, "limit": 1000})
	b := get(map[string]any{"accountId": live, "limit": 1000, "offset": 200})
	if len(a.Items) != 200 || len(b.Items) != 200 || a.Items[199]["id"] == b.Items[0]["id"] || a.Items[0]["id"] == b.Items[0]["id"] {
		t.Errorf("paging: %d then %d items", len(a.Items), len(b.Items))
	}
	// with no account only live accounts; includeBacktests adds the others
	if got := get(map[string]any{}); got.Total != 500 {
		t.Errorf("no account: total %d, want 500 (live only)", got.Total)
	}
	if got := get(map[string]any{"includeBacktests": true}); got.Total != 1000 {
		t.Errorf("with backtests: total %d, want 1000", got.Total)
	}
	if got := get(map[string]any{"accountId": bt}); got.Total != 500 {
		t.Errorf("a backtest account chosen: total %d, want 500", got.Total)
	}
}

// SC-007: with 5,000 trades each read answers in under a second.
func TestEachReadIsFastWithFiveThousandTrades(t *testing.T) {
	reset(t)
	for i := 0; i < 10; i++ {
		account(t, "Scale "+string(rune('A'+i)), "USD", "17:00")
	}
	exec(t, `INSERT INTO trade (account_id, instrument, direction, size, entry_price, exit_price, entry_at, exit_at, dollars_per_point, cost, stop_price)
	         SELECT a.id, 'NQ', CASE WHEN n % 2 = 0 THEN 'long' ELSE 'short' END, 1 + n % 3, 21000 + n % 50, 21000 + (n * 7) % 50,
	                TIMESTAMPTZ '2025-01-01 14:00+00' + (n * interval '37 minutes'),
	                TIMESTAMPTZ '2025-01-01 14:20+00' + (n * interval '37 minutes'), 20, 1.5, 20990
	           FROM generate_series(1, 5000) AS n
	           JOIN (SELECT id, row_number() OVER (ORDER BY name) - 1 AS k FROM account) a ON a.k = n % 10`)
	first := call(t, "GET", "/accounts", nil).list[0]["id"].(string)
	s := startDoor(t).connect(t, agentWithToken(t, "Claude Desktop"))
	for name, args := range map[string]map[string]any{
		"list_trades":     {"limit": 200},
		"get_month":       {"accountId": first, "month": "2025-03"},
		"get_week":        {"accountId": first, "date": "2025-03-12"},
		"mistake_counter": {"period": "month", "date": "2025-03-12"},
		"list_accounts":   {},
	} {
		start := time.Now()
		text, isErr := callTool(t, s, name, args)
		if d := time.Since(start); d > time.Second || isErr {
			t.Errorf("%s: %v (error %v: %.80s), want under 1s", name, d, isErr, text)
		}
	}
}

// A request that carries an Origin header is a web page: refused, with no detail, whatever token it holds.
func TestAWebPageIsRefusedWhateverItHolds(t *testing.T) {
	reset(t)
	token := agentWithToken(t, "Claude Desktop")
	d := startDoor(t)
	status, body := d.raw(t, token, map[string]string{"Origin": "https://evil.example"}, rpcListTools)
	if status != 403 || strings.Contains(body, "tools") {
		t.Errorf("origin: %d %s", status, body)
	}
	if status, _ := d.raw(t, token, nil, rpcListTools); status != 200 {
		t.Errorf("the same token with no Origin: %d", status)
	}
}
