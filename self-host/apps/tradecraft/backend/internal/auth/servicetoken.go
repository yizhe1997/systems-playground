// Package auth is the API's gate: it verifies the short-lived signed service token the web tier attaches to every
// request and decides, from the database, whether the identity and session it names still count (feature 002,
// constitution IV). The API never trusts a bare shared key or a caller's word about who is asking.
//
// The token is a compact JWT (HS256). Verifying a token this app also mints (in Node, with jose) is an HMAC check
// and a few field comparisons, so the standard library does it without a JWT dependency.
package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

const (
	// Audience is the one audience of every service token.
	Audience = "tradecraft-api"

	RoleOwner  = "owner"  // every ordinary request
	RoleSystem = "system" // the /internal routes, called by web-tier code only

	// MaxLifetime is looser than the 60 s the web tier signs, so ordinary drift never rejects a good token, and
	// tight enough that a token signed with a huge exp is refused instead of being valid for ever.
	MaxLifetime  = 120 * time.Second
	MaxClockSkew = 10 * time.Second

	// StepUpWindow is how recent a Google confirmation must be to change who counts as the owner.
	StepUpWindow = 10 * time.Minute
	// SessionMaxAge is the fixed life of a session, counted from the sign-in or confirmation that started it.
	SessionMaxAge = 8 * time.Hour
)

// Claims is the token's payload. SessionAt and StepUpAt are unix milliseconds given by the API's own database
// clock when it accepted the sign-in or the confirmation; the web tier only carries them.
type Claims struct {
	Sub       string `json:"sub"`
	Role      string `json:"role"`
	Aud       string `json:"aud"`
	Jti       string `json:"jti"`
	Iat       int64  `json:"iat"`
	Exp       int64  `json:"exp"`
	SessionAt int64  `json:"session_at,omitempty"`
	StepUpAt  int64  `json:"step_up_at,omitempty"`
}

var (
	ErrMalformed     = errors.New("servicetoken: malformed")
	ErrBadSignature  = errors.New("servicetoken: bad signature")
	ErrExpired       = errors.New("servicetoken: expired")
	ErrWrongAudience = errors.New("servicetoken: wrong audience")
	ErrLifetime      = errors.New("servicetoken: lifetime out of bounds")
)

// Verify checks a compact HS256 JWT against the secret and the audience at the given time, and returns its claims
// only when the signature, expiry, lifetime bounds and audience all hold. It does not check replay or the role.
func Verify(token, secret string, now time.Time) (Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return Claims{}, ErrMalformed
	}
	header, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return Claims{}, ErrMalformed
	}
	var h struct {
		Alg string `json:"alg"`
	}
	if json.Unmarshal(header, &h) != nil || h.Alg != "HS256" {
		return Claims{}, ErrMalformed
	}
	got, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return Claims{}, ErrMalformed
	}
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(parts[0] + "." + parts[1]))
	if !hmac.Equal(got, mac.Sum(nil)) { // constant time
		return Claims{}, ErrBadSignature
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return Claims{}, ErrMalformed
	}
	var c Claims
	if json.Unmarshal(payload, &c) != nil {
		return Claims{}, ErrMalformed
	}
	if c.Exp == 0 || now.Unix() >= c.Exp {
		return Claims{}, ErrExpired
	}
	if c.Jti == "" || c.Iat == 0 {
		return Claims{}, ErrMalformed
	}
	if c.Iat > now.Add(MaxClockSkew).Unix() || c.Exp-c.Iat > int64(MaxLifetime.Seconds()) {
		return Claims{}, ErrLifetime
	}
	if c.Aud != Audience {
		return Claims{}, ErrWrongAudience
	}
	return c, nil
}
