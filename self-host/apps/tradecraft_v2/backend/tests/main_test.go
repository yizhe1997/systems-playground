// Package tests runs the API in process against a real PostgreSQL. It never touches the app's own database:
// TEST_DATABASE_URL points at a server, and the run creates (and drops) its own database on it.
package tests

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http/httptest"
	"net/url"
	"os"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"tradecraft/internal/api"
	"tradecraft/internal/store"
)

var (
	pool *pgxpool.Pool
	app  *fiber.App
	// clock is the time the API believes it is; tests move it to probe the "not in the future" rule
	clock = time.Date(2025, 10, 15, 12, 0, 0, 0, time.UTC)
)

func TestMain(m *testing.M) {
	adminURL := os.Getenv("TEST_DATABASE_URL")
	if adminURL == "" {
		fmt.Println("TEST_DATABASE_URL is not set; run ./scripts/test.sh")
		os.Exit(1)
	}
	ctx := context.Background()
	admin, err := pgxpool.New(ctx, adminURL)
	if err != nil {
		fmt.Println("cannot connect:", err)
		os.Exit(1)
	}
	name := fmt.Sprintf("tc2_test_%d", time.Now().UnixNano())
	if _, err := admin.Exec(ctx, "CREATE DATABASE "+name); err != nil {
		fmt.Println("cannot create the test database:", err)
		os.Exit(1)
	}
	u, _ := url.Parse(adminURL)
	u.Path = "/" + name
	if err := store.Migrate(ctx, u.String()); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	pool, err = pgxpool.New(ctx, u.String())
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
	app = api.New(pool, func() time.Time { return clock })
	code := m.Run()
	pool.Close()
	_, _ = admin.Exec(ctx, "DROP DATABASE "+name+" WITH (FORCE)")
	admin.Close()
	os.Exit(code)
}

// reset empties the journal and puts the settings and the clock back, so every test starts alone.
func reset(t *testing.T) {
	t.Helper()
	clock = time.Date(2025, 10, 15, 12, 0, 0, 0, time.UTC)
	if _, err := pool.Exec(context.Background(),
		`TRUNCATE trade, account, focus CASCADE;
		 UPDATE journal_settings SET time_zone = 'America/Chicago';
		 TRUNCATE mistake CASCADE;
		 INSERT INTO mistake (name) VALUES ('Chased entry'), ('Moved stop'), ('Oversized'), ('Ignored checklist'), ('Traded outside plan')`); err != nil {
		t.Fatal(err)
	}
}

type resp struct {
	status int
	raw    []byte
	body   map[string]any
	list   []map[string]any
}

func call(t *testing.T, method, path string, payload any) resp {
	t.Helper()
	var rd io.Reader
	if payload != nil {
		b, _ := json.Marshal(payload)
		rd = bytes.NewReader(b)
	}
	req := httptest.NewRequest(method, path, rd)
	req.Header.Set("Content-Type", "application/json")
	res, err := app.Test(req, -1)
	if err != nil {
		t.Fatal(err)
	}
	raw, _ := io.ReadAll(res.Body)
	r := resp{status: res.StatusCode, raw: raw}
	_ = json.Unmarshal(raw, &r.body)
	_ = json.Unmarshal(raw, &r.list)
	return r
}

func (r resp) str(key string) string {
	if v, ok := r.body[key]; ok && v != nil {
		return fmt.Sprint(v)
	}
	return ""
}

// fields returns the field -> message pairs of an error answer.
func (r resp) fields() map[string]string {
	out := map[string]string{}
	fs, _ := r.body["fields"].([]any)
	for _, f := range fs {
		m := f.(map[string]any)
		out[fmt.Sprint(m["field"])] = fmt.Sprint(m["message"])
	}
	return out
}

func mustStatus(t *testing.T, r resp, want int) {
	t.Helper()
	if r.status != want {
		t.Fatalf("status %d, want %d: %s", r.status, want, r.raw)
	}
}

// account creates an account and returns its id.
func account(t *testing.T, name, currency, dayStart string) string {
	t.Helper()
	in := map[string]any{"name": name, "currency": currency}
	if dayStart != "" {
		in["tradingDayStart"] = dayStart
	}
	r := call(t, "POST", "/accounts", in)
	mustStatus(t, r, 201)
	return r.str("id")
}

// tradeA is the worked example: gross 100.00, net 95.40, risk 400.00, R 0.2385.
func tradeA(accountID string) map[string]any {
	return map[string]any{
		"accountId": accountID, "instrument": "NQ", "direction": "long", "size": "2",
		"entryPrice": "21450.00", "entryAt": "2025-10-07T09:41:00", "exitPrice": "21452.50", "exitAt": "2025-10-07T09:58:00",
		"dollarsPerPoint": "20", "cost": "4.60", "stopPrice": "21440.00",
	}
}

// trade logs a trade and returns the answer.
func trade(t *testing.T, in map[string]any) resp {
	t.Helper()
	r := call(t, "POST", "/trades", in)
	mustStatus(t, r, 201)
	return r
}

func TestHealth(t *testing.T) {
	r := call(t, "GET", "/health", nil)
	mustStatus(t, r, 200)
}
