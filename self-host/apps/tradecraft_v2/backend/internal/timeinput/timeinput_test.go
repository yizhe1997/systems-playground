package timeinput

import (
	"errors"
	"testing"
	"time"
)

func chicago(t *testing.T) *time.Location {
	loc, err := time.LoadLocation("America/Chicago")
	if err != nil {
		t.Fatal(err)
	}
	return loc
}

func TestParse(t *testing.T) {
	loc := chicago(t)
	cases := []struct {
		name, in string
		want     string // UTC, RFC 3339; "" when an error is wanted
		err      error
	}{
		{"local time", "2025-10-07T09:41:00", "2025-10-07T14:41:00Z", nil},
		{"local time without seconds", "2025-10-07T09:41", "2025-10-07T14:41:00Z", nil},
		{"space instead of T", "2025-10-07 09:41", "2025-10-07T14:41:00Z", nil},
		{"offset is used as given", "2025-10-07T09:41:00+02:00", "2025-10-07T07:41:00Z", nil},
		{"Z is used as given", "2025-10-07T09:41:00Z", "2025-10-07T09:41:00Z", nil},
		{"just after clocks go forward", "2025-03-09T03:30:00", "2025-03-09T08:30:00Z", nil},
		{"hour that does not exist", "2025-03-09T02:30:00", "", ErrNonexistent},
		{"repeated hour uses the first occurrence", "2025-11-02T01:30:00", "2025-11-02T06:30:00Z", nil}, // 01:30 CDT, not 01:30 CST
		{"after the repeated hour", "2025-11-02T02:30:00", "2025-11-02T08:30:00Z", nil},
		{"not a date", "yesterday", "", ErrFormat},
		{"empty", "", "", ErrFormat},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := Parse(c.in, loc)
			if c.err != nil {
				if !errors.Is(err, c.err) {
					t.Fatalf("err = %v, want %v", err, c.err)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if s := got.UTC().Format(time.RFC3339); s != c.want {
				t.Errorf("got %s, want %s", s, c.want)
			}
		})
	}
}

func TestMessage(t *testing.T) {
	if ErrNonexistent.Error() != "That time does not exist on that date in this time zone." {
		t.Error(ErrNonexistent)
	}
}
