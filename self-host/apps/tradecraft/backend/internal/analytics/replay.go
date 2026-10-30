package analytics

import (
	"sort"

	"github.com/shopspring/decimal"
)

// ReplayLine is one line of Rule replay. Key is followed, notFollowed (the edge leak), notJudged, actual or without.
type ReplayLine struct {
	Key       string `json:"key"`
	Trades    int    `json:"trades"`
	NetResult string `json:"netResult"`
}

// Replay is what the period looks like without the trades where the plan was not followed. The lines add up:
// followed + notFollowed + notJudged = actual, and without = actual minus the edge leak (the not-judged trades stay in).
type Replay struct {
	Judged int          `json:"judged"`
	Of     int          `json:"of"`
	Lines  []ReplayLine `json:"lines"`
}

// ReplayOf splits the trades by plan answer: Yes is followed, No or Partly is not followed (Partly never counts as
// following the plan), no answer is not judged yet. A trade not judged is never placed on a side by guess.
func ReplayOf(rows []Row) Replay {
	var followed, notFollowed, notJudged, actual decimal.Decimal
	var nf, nn, nj int
	for _, r := range rows {
		actual = actual.Add(r.Net)
		switch r.Plan {
		case PlanYes:
			followed = followed.Add(r.Net)
			nf++
		case PlanNo, PlanPartly:
			notFollowed = notFollowed.Add(r.Net)
			nn++
		default:
			notJudged = notJudged.Add(r.Net)
			nj++
		}
	}
	return Replay{
		Judged: nf + nn, Of: len(rows),
		Lines: []ReplayLine{
			{"followed", nf, money(followed)},
			{"notFollowed", nn, money(notFollowed)},
			{"notJudged", nj, money(notJudged)},
			{"actual", len(rows), money(actual)},
			{"without", len(rows) - nn, money(actual.Sub(notFollowed))},
		},
	}
}

// MistakeCost is what the trades that carry one mistake came to in the scope. A trade with two mistakes appears under
// both, so the rows do not add up. Records is the mistake's record count for the period (the Mistakes counter's rule:
// each tag on a trade and each whole-day record).
type MistakeCost struct {
	MistakeID string `json:"mistakeId"`
	Name      string `json:"name"`
	Trades    int    `json:"trades"`
	NetResult string `json:"netResult"`
	Plan      Plan   `json:"plan"`
	Records   int    `json:"records"`
}

// MistakeCosts lists, for each mistake carried by at least one trade of the block, its trades, their net result and
// plan figure and its records. dayRecords are the whole-day records of the scope by account and mistake id.
func MistakeCosts(rows []Row, dayRecords map[string]map[string]int) []MistakeCost {
	type acc struct {
		name string
		rows []Row
	}
	by := map[string]*acc{}
	accounts := map[string]bool{}
	for _, r := range rows {
		accounts[r.AccountID] = true
		for i, id := range r.MistakeIDs {
			a := by[id]
			if a == nil {
				name := id
				if i < len(r.MistakeNames) {
					name = r.MistakeNames[i]
				}
				a = &acc{name: name}
				by[id] = a
			}
			a.rows = append(a.rows, r)
		}
	}
	out := []MistakeCost{}
	for id, a := range by {
		sum := decimal.Zero
		for _, r := range a.rows {
			sum = sum.Add(r.Net)
		}
		records := len(a.rows) // one record per tag on a trade
		for acct := range accounts {
			records += dayRecords[acct][id]
		}
		out = append(out, MistakeCost{MistakeID: id, Name: a.name, Trades: len(a.rows), NetResult: money(sum), Plan: PlanOf(a.rows), Records: records})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out
}
