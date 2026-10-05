package api

import (
	"regexp"
	"strings"

	"github.com/shopspring/decimal"
)

const (
	msgNotANumber = "Enter a number with a point for decimals, for example 21450.25."
	msgPlaces     = "At most 8 decimal places."
	msgTooLarge   = "That number is too large."
)

var decimalText = regexp.MustCompile(`^-?[0-9]+(\.[0-9]+)?$`)

// parseDecimal reads a typed number: digits with at most one point, optionally a leading minus. Exact
// decimals only; the value is used to validate, and the typed text is what goes to the database.
// The second result is a plain message, or "" when the text is fine. The text is returned trimmed.
func parseDecimal(s string) (decimal.Decimal, string, string) {
	s = strings.TrimSpace(s)
	if !decimalText.MatchString(s) {
		return decimal.Zero, "", msgNotANumber
	}
	whole, frac, _ := strings.Cut(strings.TrimPrefix(s, "-"), ".")
	if len(frac) > 8 {
		return decimal.Zero, "", msgPlaces
	}
	if len(strings.TrimLeft(whole, "0")) > 16 { // numeric(24,8) holds 16 digits before the point
		return decimal.Zero, "", msgTooLarge
	}
	d, err := decimal.NewFromString(s)
	if err != nil {
		return decimal.Zero, "", msgNotANumber
	}
	return d, s, ""
}

// outDecimal writes a stored decimal the way the API sends it: exact, with trailing zeros dropped
// (they carry no meaning and nothing may depend on them). "" and a nil pointer stay empty.
func outDecimal(s string) string {
	if s == "" {
		return ""
	}
	d, err := decimal.NewFromString(s)
	if err != nil {
		return s
	}
	return d.String()
}

func outDecimalPtr(s *string) *string {
	if s == nil {
		return nil
	}
	v := outDecimal(*s)
	return &v
}
