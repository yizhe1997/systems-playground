package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"testing"
	"time"
)

const testSecret = "0123456789abcdef0123456789abcdef-test"

func sign(t *testing.T, secret string, header map[string]any, c map[string]any) string {
	t.Helper()
	enc := func(v any) string {
		b, err := json.Marshal(v)
		if err != nil {
			t.Fatal(err)
		}
		return base64.RawURLEncoding.EncodeToString(b)
	}
	in := enc(header) + "." + enc(c)
	m := hmac.New(sha256.New, []byte(secret))
	m.Write([]byte(in))
	return in + "." + base64.RawURLEncoding.EncodeToString(m.Sum(nil))
}

func claims(now time.Time, over map[string]any) map[string]any {
	c := map[string]any{"sub": "a@b.co", "role": "owner", "aud": Audience, "jti": "j1",
		"iat": now.Unix(), "exp": now.Add(60 * time.Second).Unix()}
	for k, v := range over {
		c[k] = v
	}
	return c
}

var hs256 = map[string]any{"alg": "HS256", "typ": "JWT"}

func TestVerify(t *testing.T) {
	now := time.Unix(1_800_000_000, 0)
	cases := []struct {
		name  string
		token string
		want  error
	}{
		{"good", sign(t, testSecret, hs256, claims(now, nil)), nil},
		{"bad signature", sign(t, "another-secret-another-secret-123456", hs256, claims(now, nil)), ErrBadSignature},
		{"expired", sign(t, testSecret, hs256, claims(now, map[string]any{"exp": now.Add(-time.Second).Unix(), "iat": now.Add(-time.Minute).Unix()})), ErrExpired},
		{"wrong audience", sign(t, testSecret, hs256, claims(now, map[string]any{"aud": "other"})), ErrWrongAudience},
		{"lifetime too long", sign(t, testSecret, hs256, claims(now, map[string]any{"exp": now.Add(time.Hour).Unix()})), ErrLifetime},
		{"issued in the future", sign(t, testSecret, hs256, claims(now, map[string]any{"iat": now.Add(time.Minute).Unix(), "exp": now.Add(2 * time.Minute).Unix()})), ErrLifetime},
		{"no jti", sign(t, testSecret, hs256, claims(now, map[string]any{"jti": ""})), ErrMalformed},
		{"alg none", sign(t, testSecret, map[string]any{"alg": "none"}, claims(now, nil)), ErrMalformed},
		{"malformed", "not.a.token.at.all", ErrMalformed},
		{"two parts", "a.b", ErrMalformed},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, err := Verify(c.token, testSecret, now)
			if err != c.want {
				t.Fatalf("got %v, want %v", err, c.want)
			}
		})
	}
}

func TestReplayGuard(t *testing.T) {
	g := newReplayGuard()
	now := time.Unix(1_800_000_000, 0)
	if !g.firstUse("a", now.Add(time.Minute).Unix(), now) {
		t.Fatal("first use refused")
	}
	if g.firstUse("a", now.Add(time.Minute).Unix(), now) {
		t.Fatal("replay accepted")
	}
	later := now.Add(2 * time.Minute)
	if !g.firstUse("b", later.Add(time.Minute).Unix(), later) {
		t.Fatal("new id refused after pruning")
	}
}

func TestEnvAndSecrets(t *testing.T) {
	if e, err := EnvironmentFrom(""); err != nil || e != Production {
		t.Fatalf("unset must be production, got %q %v", e, err)
	}
	if _, err := EnvironmentFrom("staging"); err == nil {
		t.Fatal("unknown environment accepted")
	}
	if RefuseDevSecret(Production, "x") == nil {
		t.Fatal("production with the development secret must be refused")
	}
	if RefuseDevSecret(Production, "") != nil || RefuseDevSecret(Local, "x") != nil || RefuseDevSecret(Test, "x") != nil {
		t.Fatal("only production with the secret set may be refused")
	}
	if CheckSecret("X", "") == nil || CheckSecret("X", "short") == nil || CheckSecret("X", testSecret) != nil {
		t.Fatal("secret length check wrong")
	}
}
