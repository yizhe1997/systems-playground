// Package timeinput turns what the owner types into an exact instant.
package timeinput

import (
	"errors"
	"strings"
	"time"
)

// ErrNonexistent is returned for a local time that the zone skips (clocks going forward).
var ErrNonexistent = errors.New("That time does not exist on that date in this time zone.")

// ErrFormat is returned for text that is neither an RFC 3339 instant nor a local date and time.
var ErrFormat = errors.New("Enter a date and time, for example Wed 1 Oct 2025 09:41.")

// The ISO styles, and the style the screens show: "Wed 1 Oct 2025 09:41", with or without the weekday.
var localLayouts = []string{
	"2006-01-02T15:04:05", "2006-01-02T15:04", "2006-01-02 15:04:05", "2006-01-02 15:04",
	"Mon 2 Jan 2006 15:04", "2 Jan 2006 15:04",
}

// ErrWeekday is returned when a typed weekday does not belong to the typed date.
var ErrWeekday = errors.New("That weekday does not match the date.")

// Parse reads s as an RFC 3339 instant with an offset (used as given), or as a local date and time with no
// offset, read in loc. A local time that does not exist is refused; one that happens twice (clocks going
// back) uses its first occurrence.
func Parse(s string, loc *time.Location) (time.Time, error) {
	s = strings.TrimSpace(s)
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, nil
	}
	s = strings.Join(strings.Fields(strings.Replace(s, "Sept", "Sep", 1)), " ")
	var wall time.Time
	var err error
	for _, layout := range localLayouts {
		if wall, err = time.Parse(layout, s); err == nil {
			if strings.HasPrefix(layout, "Mon") && wall.Weekday().String()[:3] != s[:3] {
				return time.Time{}, ErrWeekday
			}
			break
		}
	}
	if err != nil {
		return time.Time{}, ErrFormat
	}
	y, mo, d := wall.Date()
	h, mi, sec := wall.Clock()
	t := time.Date(y, mo, d, h, mi, sec, 0, loc)
	// Go picks one side of a gap or overlap. Try the instants around it that show the typed wall clock.
	var first time.Time
	for _, off := range []time.Duration{-2 * time.Hour, -time.Hour, -30 * time.Minute, 0, 30 * time.Minute, time.Hour, 2 * time.Hour} {
		c := t.Add(off).In(loc)
		cy, cmo, cd := c.Date()
		ch, cmi, cs := c.Clock()
		if cy == y && cmo == mo && cd == d && ch == h && cmi == mi && cs == sec && (first.IsZero() || c.Before(first)) {
			first = c
		}
	}
	if first.IsZero() {
		return time.Time{}, ErrNonexistent
	}
	return first, nil
}
