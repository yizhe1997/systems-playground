package auth

import (
	"errors"
	"fmt"
	"strings"
)

// Environment says how this copy of the app is meant to run. Unset means production, so a forgotten setting
// fails closed.
type Environment string

const (
	Production Environment = "production"
	Local      Environment = "local"
	Test       Environment = "test"
)

// EnvironmentFrom reads TRADECRAFT_ENV.
func EnvironmentFrom(v string) (Environment, error) {
	switch strings.TrimSpace(v) {
	case "", "production":
		return Production, nil
	case "local":
		return Local, nil
	case "test":
		return Test, nil
	}
	return "", fmt.Errorf("TRADECRAFT_ENV must be production, local or test")
}

// MinSecretBytes is the shortest secret either tier accepts (an HS256 key should be at least its output size).
const MinSecretBytes = 32

// CheckSecret refuses a missing or short secret. The message names the variable, never its value.
func CheckSecret(name, value string) error {
	if value == "" {
		return fmt.Errorf("%s is not set. See .env.example", name)
	}
	if len(value) < MinSecretBytes {
		return fmt.Errorf("%s is shorter than %d bytes", name, MinSecretBytes)
	}
	return nil
}

// RefuseDevSecret is the production refusal of FR-020: the development session secret must not be present when
// the app runs as production. An empty value counts as not set.
func RefuseDevSecret(env Environment, devSecret string) error {
	if env == Production && devSecret != "" {
		return errors.New("DEV_SESSION_SECRET is set while TRADECRAFT_ENV is production: refusing to start. " +
			"Remove it, or set TRADECRAFT_ENV to local for local work")
	}
	return nil
}
