package analytics

import (
	"sort"
	"strconv"

	"github.com/shopspring/decimal"
)

// CurvePoint is the running net result after one trading day.
type CurvePoint struct {
	Day        string `json:"day"`
	Result     string `json:"result"`
	Cumulative string `json:"cumulative"`
}

// Curve is the cumulative net result by trading day: one point per trading day that has trades, in day order.
func Curve(rows []Row) []CurvePoint {
	out := []CurvePoint{}
	cum := decimal.Zero
	for i := 0; i < len(rows); {
		j, res := i, decimal.Zero
		for j < len(rows) && rows[j].Day.Equal(rows[i].Day) {
			res = res.Add(rows[j].Net)
			j++
		}
		cum = cum.Add(res)
		out = append(out, CurvePoint{Day: day(rows[i]), Result: money(res), Cumulative: money(cum)})
		i = j
	}
	return out
}

// Day is one trading day of the calendar and the daily bars.
type Day struct {
	Day           string `json:"day"`
	Trades        int    `json:"trades"`
	Result        string `json:"result"`
	Plan          Plan   `json:"plan"`
	OpenAccountID string `json:"openAccountId"`
}

// Days is one entry per trading day that has trades. OpenAccountID is the account with the most trades that day (ties
// by account name): a daily review belongs to one account.
func Days(rows []Row) []Day {
	out := []Day{}
	for i := 0; i < len(rows); {
		j, res := i, decimal.Zero
		perAcct := map[string]int{}
		names := map[string]string{}
		for j < len(rows) && rows[j].Day.Equal(rows[i].Day) {
			res = res.Add(rows[j].Net)
			perAcct[rows[j].AccountID]++
			names[rows[j].AccountID] = rows[j].AccountName
			j++
		}
		open := ""
		for id, c := range perAcct {
			if open == "" || c > perAcct[open] || (c == perAcct[open] && names[id] < names[open]) {
				open = id
			}
		}
		out = append(out, Day{Day: day(rows[i]), Trades: j - i, Result: money(res), Plan: PlanOf(rows[i:j]), OpenAccountID: open})
		i = j
	}
	return out
}

// BreakdownRow is one line of a breakdown. Key is what filters the Trades list to exactly these trades. NetResult is
// null when there are no trades (a weekday with none): nothing is shown as zero.
type BreakdownRow struct {
	Key       string  `json:"key"`
	Label     string  `json:"label"`
	Trades    int     `json:"trades"`
	NetResult *string `json:"netResult"`
	Wins      int     `json:"wins"`
	Counted   int     `json:"counted"`
	Plan      Plan    `json:"plan"`
	Few       bool    `json:"few"`
}

// Breakdowns are the five slices of the scope.
type Breakdowns struct {
	Weekday    []BreakdownRow `json:"weekday"`
	Hour       []BreakdownRow `json:"hour"`
	Instrument []BreakdownRow `json:"instrument"`
	Direction  []BreakdownRow `json:"direction"`
	Account    []BreakdownRow `json:"account"`
}

var weekdayNames = []string{"", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}

func row(key, label string, rs []Row, p Params) BreakdownRow {
	b := BreakdownRow{Key: key, Label: label, Trades: len(rs), Plan: PlanOf(rs)}
	if len(rs) > 0 {
		sum := decimal.Zero
		for _, r := range rs {
			sum = sum.Add(r.Net)
			if !setAside(r, p.Band) {
				b.Counted++
				if r.Net.IsPositive() {
					b.Wins++
				}
			}
		}
		b.NetResult = strPtr(money(sum))
	}
	b.Few = len(rs) < fewBelow
	return b
}

func hourLabel(h int) string {
	return twoDigits(h) + ":00 to " + twoDigits(h) + ":59"
}

func twoDigits(n int) string {
	if n < 10 {
		return "0" + strconv.Itoa(n)
	}
	return strconv.Itoa(n)
}

// group splits rows by a key and answers the keys in sorted order.
func group(rows []Row, key func(Row) string, less func(a, b string) bool) ([]string, map[string][]Row) {
	m := map[string][]Row{}
	for _, r := range rows {
		k := key(r)
		m[k] = append(m[k], r)
	}
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool { return less(keys[i], keys[j]) })
	return keys, m
}

func numLess(a, b string) bool {
	x, _ := strconv.Atoi(a)
	y, _ := strconv.Atoi(b)
	return x < y
}

// BreakdownsOf makes the five breakdowns. Monday to Friday are always listed ("no trades" when empty), Saturday and
// Sunday only when they have trades; hours, instruments, directions and accounts only when they have trades.
func BreakdownsOf(rows []Row, p Params) Breakdowns {
	var b Breakdowns
	byDay := map[int][]Row{}
	for _, r := range rows {
		byDay[r.Weekday] = append(byDay[r.Weekday], r)
	}
	for wd := 1; wd <= 7; wd++ {
		if wd > 5 && len(byDay[wd]) == 0 {
			continue
		}
		b.Weekday = append(b.Weekday, row(strconv.Itoa(wd), weekdayNames[wd], byDay[wd], p))
	}
	keys, m := group(rows, func(r Row) string { return strconv.Itoa(r.Hour) }, numLess)
	b.Hour = []BreakdownRow{}
	for _, k := range keys {
		h, _ := strconv.Atoi(k)
		b.Hour = append(b.Hour, row(k, hourLabel(h), m[k], p))
	}
	keys, m = group(rows, func(r Row) string { return r.Instrument }, func(a, b string) bool { return a < b })
	b.Instrument = []BreakdownRow{}
	for _, k := range keys {
		b.Instrument = append(b.Instrument, row(k, k, m[k], p))
	}
	keys, m = group(rows, func(r Row) string { return r.Direction }, func(a, b string) bool { return a < b }) // long before short
	b.Direction = []BreakdownRow{}
	for _, k := range keys {
		label := "Long"
		if k == "short" {
			label = "Short"
		}
		b.Direction = append(b.Direction, row(k, label, m[k], p))
	}
	names := map[string]string{}
	for _, r := range rows {
		names[r.AccountID] = r.AccountName
	}
	keys, m = group(rows, func(r Row) string { return r.AccountID }, func(a, b string) bool { return names[a] < names[b] })
	b.Account = []BreakdownRow{}
	for _, k := range keys {
		b.Account = append(b.Account, row(k, names[k], m[k], p))
	}
	return b
}
