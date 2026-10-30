// Package analytics makes the figures of Home and Analytics (feature 005) from the rows of the scope: one row per live
// trade. It knows nothing of HTTP or SQL, uses exact decimals for every sum, ratio and comparison, and never produces a
// float. A figure that cannot be computed is null with its reason, never zero (constitution III).
package analytics

import (
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/shopspring/decimal"
)

// Plan answers as stored.
const (
	PlanYes    = "yes"
	PlanPartly = "partly"
	PlanNo     = "no"
)

// Row is one live trade of the scope. Rows come in trading-day, entry-time, id order.
type Row struct {
	TradeID         string
	AccountID       string
	AccountName     string
	Currency        string
	AccountArchived bool
	AccountKind     string
	Day             time.Time // the trading day (a date)
	EntryAt         time.Time
	Hour            int // hour of entry in the journal time zone
	Weekday         int // ISO weekday of the trading day, 1 (Monday) to 7
	Instrument      string
	Direction       string
	Net             decimal.Decimal
	R               *decimal.Decimal // nil when the trade has no risk
	Plan            string           // "", PlanYes, PlanPartly or PlanNo ("" = not judged yet)
	MistakeIDs      []string
	MistakeNames    []string
}

// Params are the options of a computation.
type Params struct {
	Band decimal.Decimal // break-even band, 0 = none
}

var bandText = regexp.MustCompile(`^[0-9]+(\.[0-9]{1,8})?$`)

// ParseBand reads the break-even band: an amount of at least 0 with at most 8 decimals. Empty means no band. The second
// result is a plain message, or "" when the text is fine.
func ParseBand(s string) (decimal.Decimal, string) {
	s = strings.TrimSpace(s)
	if s == "" {
		return decimal.Zero, ""
	}
	if !bandText.MatchString(s) {
		return decimal.Zero, "Enter the band as an amount of at least 0 with at most 8 decimals, for example 40.00."
	}
	d, err := decimal.NewFromString(s)
	if err != nil {
		return decimal.Zero, "Enter the band as an amount of at least 0 with at most 8 decimals, for example 40.00."
	}
	if len(strings.TrimLeft(strings.SplitN(s, ".", 2)[0], "0")) > 16 {
		return decimal.Zero, "That number is too large."
	}
	return d, ""
}

// Plan is "plan followed X of Y" for a set of trades: the parts add up to Of.
type Plan struct {
	Followed    int `json:"followed"`
	Partly      int `json:"partly"`
	NotFollowed int `json:"notFollowed"`
	NotJudged   int `json:"notJudged"`
	Of          int `json:"of"`
}

// PlanOf counts the plan answers of rows.
func PlanOf(rows []Row) Plan {
	var p Plan
	for _, r := range rows {
		switch r.Plan {
		case PlanYes:
			p.Followed++
		case PlanPartly:
			p.Partly++
		case PlanNo:
			p.NotFollowed++
		default:
			p.NotJudged++
		}
	}
	p.Of = len(rows)
	return p
}

// money writes an exact decimal the way the API sends it: trailing zeros dropped.
func money(d decimal.Decimal) string { return d.String() }

// ratio writes a computed ratio to six decimals (the display rounds it to two).
func ratio(d decimal.Decimal) string { return d.Round(6).String() }

func strPtr(s string) *string { return &s }

func plural(n int, one, many string) string {
	if n == 1 {
		return one
	}
	return many
}

func needs(n int) string { return fmt.Sprintf("needs at least 2 trades, has %d", n) }
