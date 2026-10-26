// Package tests runs the API in process against a real PostgreSQL. It never touches the app's own database:
// TEST_DATABASE_URL points at a server, and the run creates (and drops) its own database on it.
package tests

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http/httptest"
	"net/url"
	"os"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"

	"tradecraft/internal/api"
	"tradecraft/internal/objects"
	"tradecraft/internal/store"
)

// testSecret is the service token secret of the test app; testOwner is the one identity every test is made as.
const (
	testSecret = "tradecraft-test-service-secret-0123456789abcdef"
	testOwner  = "owner@example.com"
)

var (
	pool *pgxpool.Pool
	app  *fiber.App
	// clock is the time the API believes it is; tests move it to probe the "not in the future" rule
	clock = time.Date(2025, 10, 15, 12, 0, 0, 0, time.UTC)
)

// imgStore is the bucket the test app writes images to, so a test can look at what is (and is not) in it.
var imgStore *objects.Store

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
	if _, err := pool.Exec(ctx, "INSERT INTO identity (email) VALUES ($1)", testOwner); err != nil {
		fmt.Println("cannot create the test identity:", err)
		os.Exit(1)
	}
	// the images' bytes go to a real S3 bucket (the test stack's SeaweedFS); the variables are set by docker-compose.override.yml
	imgStore, err = objects.FromEnv()
	if err != nil || imgStore == nil {
		fmt.Println("S3_ENDPOINT and its keys are not set; run ./scripts/test.sh:", err)
		os.Exit(1)
	}
	app = api.New(pool, func() time.Time { return clock }, testSecret, api.WithObjects(imgStore))
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
	resetIdentities(t)
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

// resetIdentities leaves the audit log empty and the one test identity active, pinned to nothing, with no sign-out.
// The tables refuse this in normal operation (triggers), so it runs as a replica session in one transaction.
func resetIdentities(t *testing.T) {
	t.Helper()
	ctx := context.Background()
	tx, err := pool.Begin(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback(ctx)
	for _, q := range []string{
		"SET LOCAL session_replication_role = replica",
		"DELETE FROM audit_entry",
		"DELETE FROM agent_token", // the table refuses this in normal operation; the switch goes back to off
		"UPDATE journal_settings SET agent_access = false",
		"DELETE FROM identity WHERE email <> '" + testOwner + "'",
		"INSERT INTO identity (email) VALUES ('" + testOwner + "') ON CONFLICT DO NOTHING",
		"UPDATE identity SET disabled_at = NULL, provider_sub = NULL, last_sign_in_at = NULL, sessions_valid_after = to_timestamp(0)",
	} {
		if _, err := tx.Exec(ctx, q); err != nil {
			t.Fatal(err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		t.Fatal(err)
	}
}

var tokenCounter atomic.Int64

// signToken signs claims the way the web tier does (HS256), with any secret.
func signToken(secret string, claims map[string]any) string {
	enc := func(v any) string {
		b, _ := json.Marshal(v)
		return base64.RawURLEncoding.EncodeToString(b)
	}
	in := enc(map[string]any{"alg": "HS256", "typ": "JWT"}) + "." + enc(claims)
	m := hmac.New(sha256.New, []byte(secret))
	m.Write([]byte(in))
	return in + "." + base64.RawURLEncoding.EncodeToString(m.Sum(nil))
}

// tokenFor is a service token for an identity: role owner, fresh times, a jti nobody used.
func tokenFor(email string, over map[string]any) string {
	now := time.Now()
	c := map[string]any{
		"sub": email, "role": "owner", "aud": "tradecraft-api",
		"jti": fmt.Sprintf("t-%d-%d", now.UnixNano(), tokenCounter.Add(1)),
		"iat": now.Unix(), "exp": now.Add(60 * time.Second).Unix(),
		"session_at": now.UnixMilli() - 1000, "step_up_at": now.UnixMilli() - 1000,
	}
	for k, v := range over {
		if v == nil {
			delete(c, k)
		} else {
			c[k] = v
		}
	}
	return signToken(testSecret, c)
}

// ownerToken is what every ordinary test request carries.
func ownerToken() string { return tokenFor(testOwner, nil) }

func call(t *testing.T, method, path string, payload any) resp {
	t.Helper()
	return callWith(t, method, path, payload, ownerToken())
}

// callWith sends a request with the given bearer token ("" sends none).
func callWith(t *testing.T, method, path string, payload any, token string) resp {
	t.Helper()
	var rd io.Reader
	if payload != nil {
		b, _ := json.Marshal(payload)
		rd = bytes.NewReader(b)
	}
	req := httptest.NewRequest(method, path, rd)
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
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
