package analytics

import (
	"fmt"
	"strconv"

	"github.com/shopspring/decimal"
)

// fewBelow is the sample under which a rate or ratio is marked "few trades".
const fewBelow = 10

// Statistic is one figure of the performance table. Value is null, with a Reason, when it cannot be computed (never
// zero). N is the number of trades it was made of and Plan is the plan figure of those same trades.
type Statistic struct {
	Key           string            `json:"key"`
	Label         string            `json:"label"`
	Value         *string           `json:"value"`
	Wins          *int              `json:"wins,omitempty"`
	Counted       *int              `json:"counted,omitempty"`
	SetAside      *int              `json:"setAside,omitempty"`
	Percent       *int              `json:"percent,omitempty"`
	Day           *string           `json:"day,omitempty"`
	PeakDay       *string           `json:"peakDay,omitempty"`
	TroughDay     *string           `json:"troughDay,omitempty"`
	Peak          *string           `json:"peak,omitempty"`
	Trough        *string           `json:"trough,omitempty"`
	From          *string           `json:"from,omitempty"`
	To            *string           `json:"to,omitempty"`
	N             int               `json:"n"`
	Plan          Plan              `json:"plan"`
	Reason        *string           `json:"reason"`
	Few           bool              `json:"few"`
	DefinitionKey string            `json:"definitionKey"`
	Definition    string            `json:"definition"`
	Detail        map[string]string `json:"detail,omitempty"`
}

func day(r Row) string { return r.Day.Format("2006-01-02") }

// setAside reports whether the break-even band sets the trade aside from the win rate and the streaks.
func setAside(r Row, band decimal.Decimal) bool {
	return band.IsPositive() && r.Net.Abs().LessThanOrEqual(band)
}

func isWin(r Row, band decimal.Decimal) bool  { return !setAside(r, band) && r.Net.IsPositive() }
func isLoss(r Row, band decimal.Decimal) bool { return !setAside(r, band) && r.Net.IsNegative() }

func newStat(key, label string, n int, plan Plan) Statistic {
	return Statistic{Key: key, Label: label, N: n, Plan: plan, DefinitionKey: key, Definition: DefinitionText(key)}
}

func (s *Statistic) dash(reason string) { s.Value, s.Reason = nil, strPtr(reason) }

// Statistics makes the performance table of one block (one currency): the rows are its trades in order.
func Statistics(rows []Row, p Params) []Statistic {
	n := len(rows)
	all := PlanOf(rows)
	var wins, losses, withR, counted []Row // wins and losses are strict (band ignored); counted are the trades not set aside
	total, won, lost, rSum := decimal.Zero, decimal.Zero, decimal.Zero, decimal.Zero
	for _, r := range rows {
		total = total.Add(r.Net)
		switch {
		case r.Net.IsPositive():
			wins = append(wins, r)
			won = won.Add(r.Net)
		case r.Net.IsNegative():
			losses = append(losses, r)
			lost = lost.Add(r.Net)
		}
		if r.R != nil {
			withR = append(withR, r)
			rSum = rSum.Add(*r.R)
		}
		if !setAside(r, p.Band) {
			counted = append(counted, r)
		}
	}
	out := make([]Statistic, 0, 13)

	net := newStat("netResult", "Net result", n, all)
	net.Value = strPtr(money(total))
	out = append(out, net)

	// win rate: k wins of the counted trades
	wr := newStat("winRate", "Win rate", len(counted), PlanOf(counted))
	k := 0
	for _, r := range counted {
		if r.Net.IsPositive() {
			k++
		}
	}
	aside := n - len(counted)
	wr.Wins, wr.Counted, wr.SetAside = &k, intPtr(len(counted)), &aside
	if len(counted) == 0 {
		if n == 0 {
			wr.dash("no trades")
		} else {
			wr.dash("every trade is inside the break-even band")
		}
	} else {
		pc := (200*k + len(counted)) / (2 * len(counted)) // 100 k / n, rounded half up
		wr.Percent = &pc
		wr.Value = strPtr(strconv.Itoa(pc))
		wr.Few = len(counted) < fewBelow
	}
	out = append(out, wr)

	pf := newStat("profitFactor", "Profit factor", n, all)
	pf.Few = n < fewBelow
	switch {
	case n == 0:
		pf.dash("no trades")
	case len(losses) == 0:
		pf.dash("no losing trades")
	case n < 2:
		pf.dash(needs(n))
	default:
		pf.Value = strPtr(ratio(won.Div(lost.Abs())))
		pf.Detail = map[string]string{"won": money(won), "lost": money(lost.Abs())}
	}
	out = append(out, pf)

	ex := newStat("expectancy", "Expectancy", n, all)
	ex.Few = n < fewBelow
	if n < 2 {
		ex.dash(needs(n))
	} else {
		ex.Value = strPtr(ratio(total.Div(decimal.NewFromInt(int64(n)))))
	}
	out = append(out, ex)

	er := newStat("expectancyR", "Expectancy in R", len(withR), PlanOf(withR))
	er.Few = len(withR) < fewBelow
	switch {
	case n == 0:
		er.dash("no trades")
	case len(withR) == 0:
		er.dash(fmt.Sprintf("no stop recorded on %d of %d trades", n, n))
	case n < 2:
		er.dash(needs(n))
	default:
		er.Value = strPtr(ratio(rSum.Div(decimal.NewFromInt(int64(len(withR))))))
		er.Detail = map[string]string{"withR": strconv.Itoa(len(withR)), "of": strconv.Itoa(n)}
	}
	out = append(out, er)

	aw := newStat("averageWin", "Average win", len(wins), PlanOf(wins))
	aw.Few = len(wins) < fewBelow
	var avgWin, avgLoss decimal.Decimal
	if len(wins) == 0 {
		aw.dash("no winning trades")
	} else {
		avgWin = won.Div(decimal.NewFromInt(int64(len(wins))))
		aw.Value = strPtr(ratio(avgWin))
	}
	out = append(out, aw)

	al := newStat("averageLoss", "Average loss", len(losses), PlanOf(losses))
	al.Few = len(losses) < fewBelow
	if len(losses) == 0 {
		al.dash("no losing trades")
	} else {
		avgLoss = lost.Div(decimal.NewFromInt(int64(len(losses))))
		al.Value = strPtr(ratio(avgLoss))
	}
	out = append(out, al)

	po := newStat("payoffRatio", "Payoff ratio", n, all)
	po.Few = n < fewBelow
	if len(wins) == 0 || len(losses) == 0 {
		po.dash("needs a win and a loss")
	} else {
		po.Value = strPtr(ratio(avgWin.Div(avgLoss.Abs())))
	}
	out = append(out, po)

	out = append(out, largest(rows, "largestWin", "Largest win", func(a, b decimal.Decimal) bool { return a.GreaterThan(b) }, func(d decimal.Decimal) bool { return d.IsPositive() }, "no winning trades"))
	out = append(out, largest(rows, "largestLoss", "Largest loss", func(a, b decimal.Decimal) bool { return a.LessThan(b) }, func(d decimal.Decimal) bool { return d.IsNegative() }, "no losing trades"))
	out = append(out, drawdown(rows, all))
	out = append(out, streak(rows, p, all, "winStreak", "Longest winning streak", isWin, "no winning trades"))
	out = append(out, streak(rows, p, all, "lossStreak", "Longest losing streak", isLoss, "no losing trades"))
	return out
}

func intPtr(i int) *int { return &i }

// largest finds the best (or worst) trade; the earlier one wins a tie.
func largest(rows []Row, key, label string, better func(a, b decimal.Decimal) bool, qualifies func(decimal.Decimal) bool, none string) Statistic {
	var best *Row
	for i := range rows {
		r := &rows[i]
		if !qualifies(r.Net) {
			continue
		}
		if best == nil || better(r.Net, best.Net) {
			best = r
		}
	}
	if best == nil {
		s := newStat(key, label, 0, Plan{})
		s.dash(none)
		return s
	}
	s := newStat(key, label, 1, PlanOf([]Row{*best}))
	s.Value = strPtr(money(best.Net))
	s.Day = strPtr(day(*best))
	return s
}

// drawdown is the largest fall of the running net result from a peak. The peak starts at 0 before the first trade.
func drawdown(rows []Row, all Plan) Statistic {
	s := newStat("maxDrawdown", "Maximum drawdown", len(rows), all)
	if len(rows) < 2 {
		s.dash(needs(len(rows)))
		return s
	}
	cum, peak, maxDD := decimal.Zero, decimal.Zero, decimal.Zero
	var peakDay *string // nil = the start, before the first trade
	var ddPeak, ddTrough decimal.Decimal
	var ddPeakDay *string
	ddTroughDay := strPtr(day(rows[0]))
	for _, r := range rows {
		cum = cum.Add(r.Net)
		if cum.GreaterThan(peak) {
			peak = cum
			peakDay = strPtr(day(r))
		}
		if dd := peak.Sub(cum); dd.GreaterThan(maxDD) {
			maxDD, ddPeak, ddTrough, ddPeakDay, ddTroughDay = dd, peak, cum, peakDay, strPtr(day(r))
		}
	}
	if maxDD.IsZero() { // no fall: zero, with the first trade's day for both
		ddPeakDay = strPtr(day(rows[0]))
	}
	s.Value = strPtr(money(maxDD.Neg()))
	s.Peak, s.Trough = strPtr(money(ddPeak)), strPtr(money(ddTrough))
	s.PeakDay, s.TroughDay = ddPeakDay, ddTroughDay
	return s
}

// streak is the longest run of trades that match, in order; a trade that matches neither win nor loss ends a run.
func streak(rows []Row, p Params, all Plan, key, label string, match func(Row, decimal.Decimal) bool, none string) Statistic {
	s := newStat(key, label, len(rows), all)
	if len(rows) < 2 {
		s.dash(needs(len(rows)))
		return s
	}
	best, run := 0, 0
	var bestFrom, bestTo, runFrom string
	for _, r := range rows {
		if match(r, p.Band) {
			if run == 0 {
				runFrom = day(r)
			}
			run++
			if run > best {
				best, bestFrom, bestTo = run, runFrom, day(r)
			}
		} else {
			run = 0
		}
	}
	if best == 0 {
		s.dash(none)
		return s
	}
	s.Value = strPtr(strconv.Itoa(best))
	s.From, s.To = strPtr(bestFrom), strPtr(bestTo)
	return s
}
