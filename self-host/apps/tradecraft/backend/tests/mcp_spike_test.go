package tests

import (
	"context"
	"encoding/json"
	"net"
	"net/http"
	"testing"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"

	"tradecraft/internal/api"
)

// roundTripFunc lets a test put a header on every request of the SDK's client.
type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return f(r) }

// TestMCPSpike is T001: the SDK's own client lists a tool and calls it against a listening server, and the tool
// returns what the owner's own GET /accounts returns.
func TestMCPSpike(t *testing.T) {
	reset(t)
	account(t, "Spike live", "USD", "")
	want := call(t, "GET", "/accounts", nil)
	mustStatus(t, want, 200)

	door := api.New(pool, func() time.Time { return clock }, testSecret)
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	go func() { _ = door.Listener(ln) }()
	defer func() { _ = door.Shutdown() }()

	hc := &http.Client{Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
		r.Header.Set("Authorization", "Bearer "+ownerToken()) // a fresh token per request: the gate refuses a replay
		return http.DefaultTransport.RoundTrip(r)
	})}
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	client := mcp.NewClient(&mcp.Implementation{Name: "spike-client", Version: "0"}, nil)
	session, err := client.Connect(ctx, &mcp.StreamableClientTransport{Endpoint: "http://" + ln.Addr().String() + "/mcp", HTTPClient: hc}, nil)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	defer session.Close()

	tools, err := session.ListTools(ctx, nil)
	if err != nil {
		t.Fatalf("list tools: %v", err)
	}
	if len(tools.Tools) != 1 || tools.Tools[0].Name != "list_accounts" {
		t.Fatalf("tools: %+v", tools.Tools)
	}
	res, err := session.CallTool(ctx, &mcp.CallToolParams{Name: "list_accounts", Arguments: map[string]any{}})
	if err != nil {
		t.Fatalf("call: %v", err)
	}
	if res.IsError || len(res.Content) != 1 {
		t.Fatalf("result: %+v", res)
	}
	text := res.Content[0].(*mcp.TextContent).Text
	var got, exp any
	if err := json.Unmarshal([]byte(text), &got); err != nil {
		t.Fatalf("tool text is not JSON: %v: %s", err, text)
	}
	_ = json.Unmarshal(want.raw, &exp)
	gb, _ := json.Marshal(got)
	eb, _ := json.Marshal(exp)
	if string(gb) != string(eb) {
		t.Fatalf("tool answered %s, the route answers %s", gb, eb)
	}
}
