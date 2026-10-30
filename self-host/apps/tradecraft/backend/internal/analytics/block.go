package analytics

import (
	"sort"
)

// BlockAccount is an account that has trades in a block.
type BlockAccount struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Kind     string `json:"kind"`
	Archived bool   `json:"archived"`
}

// Block is every figure of one currency of the scope. Nothing is ever added across blocks.
type Block struct {
	Currency    string         `json:"currency"`
	Accounts    []BlockAccount `json:"accounts"`
	Trades      int            `json:"trades"`
	Plan        Plan           `json:"plan"`
	Statistics  []Statistic    `json:"statistics"`
	Curve       []CurvePoint   `json:"curve"`
	Days        []Day          `json:"days"`
	Breakdowns  Breakdowns     `json:"breakdowns"`
	Replay      Replay         `json:"replay"`
	MistakeCost []MistakeCost  `json:"mistakeCost"`
}

// BuildBlocks groups the rows of the scope by currency (ordered by currency code) and makes each block's figures.
// dayRecords are the whole-day mistake records of the scope by account id and mistake id (see MistakeCosts).
func BuildBlocks(rows []Row, p Params, dayRecords map[string]map[string]int) []Block {
	byCur := map[string][]Row{}
	for _, r := range rows {
		byCur[r.Currency] = append(byCur[r.Currency], r)
	}
	curs := make([]string, 0, len(byCur))
	for c := range byCur {
		curs = append(curs, c)
	}
	sort.Strings(curs)
	out := make([]Block, 0, len(curs))
	for _, c := range curs {
		rs := byCur[c]
		out = append(out, Block{
			Currency:    c,
			Accounts:    accountsOf(rs),
			Trades:      len(rs),
			Plan:        PlanOf(rs),
			Statistics:  Statistics(rs, p),
			Curve:       Curve(rs),
			Days:        Days(rs),
			Breakdowns:  BreakdownsOf(rs, p),
			Replay:      ReplayOf(rs),
			MistakeCost: MistakeCosts(rs, dayRecords),
		})
	}
	return out
}

func accountsOf(rows []Row) []BlockAccount {
	seen := map[string]bool{}
	var out []BlockAccount
	for _, r := range rows {
		if seen[r.AccountID] {
			continue
		}
		seen[r.AccountID] = true
		out = append(out, BlockAccount{ID: r.AccountID, Name: r.AccountName, Kind: r.AccountKind, Archived: r.AccountArchived})
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].Name < out[j].Name })
	return out
}
