package api

import (
	"regexp"
	"time"
)

const dayLayout = "2006-01-02"

var monthText = regexp.MustCompile(`^[0-9]{4}-(0[1-9]|1[0-2])$`)

// parseDay reads a plain trading day (YYYY-MM-DD) as a date. Which week or month a day belongs to is decided by the
// SQL functions, not here.
func parseDay(s string) (time.Time, bool) {
	t, err := time.Parse(dayLayout, s)
	return t, err == nil
}

// parseMonth reads YYYY-MM as the first day of that month.
func parseMonth(s string) (time.Time, bool) {
	if !monthText.MatchString(s) {
		return time.Time{}, false
	}
	t, err := time.Parse("2006-01", s)
	return t, err == nil
}

func dayText(t time.Time) string            { return t.Format(dayLayout) }
func monthOf(t time.Time) string            { return t.Format("2006-01") }
func plusDays(t time.Time, n int) time.Time { return t.AddDate(0, 0, n) }
