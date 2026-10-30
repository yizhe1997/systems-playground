package analytics

// Definition is the words of one statistic, held once: the API returns it with every figure, the screen shows it, and a
// test checks that docs/domain.md carries the same text (feature 005, FR-017).
type Definition struct {
	Key  string
	Text string
}

// Definitions in the order the statistics are listed.
var Definitions = []Definition{
	{"netResult", "The sum of the net results of the trades in the scope: gross result minus costs, or the typed result when there are no dollars per point. Closed trades only, judged or not."},
	{"winRate", "The number of winning trades (net result above zero) out of the trades counted, as k of n with a percentage rounded half up to a whole number. A trade inside the break-even band, when a band is set, is set aside and not counted. Marked few trades below 10."},
	{"profitFactor", "The sum of the net results of the winning trades divided by the sum of the net results of the losing trades, as a positive number. Not shown when there is no losing trade or fewer than 2 trades. Every trade in the scope counts, judged or not, whatever the break-even band."},
	{"expectancy", "The net result of all the trades divided by their number: what a trade is worth on average. Not shown below 2 trades."},
	{"expectancyR", "The sum of the R multiples of the trades that have one divided by their number. A trade has an R only when a stop was recorded. Not shown when no trade has one or below 2 trades."},
	{"averageWin", "The mean net result of the winning trades (net result above zero). The break-even band is ignored. Not shown when there is no winning trade."},
	{"averageLoss", "The mean net result of the losing trades (net result below zero). The break-even band is ignored. Not shown when there is no losing trade."},
	{"payoffRatio", "The average win divided by the average loss, as a positive number: how much a win is worth compared with a loss. Not shown without a win and a loss."},
	{"largestWin", "The highest net result above zero, with its trading day. Not shown when there is no winning trade."},
	{"largestLoss", "The lowest net result below zero, with its trading day. Not shown when there is no losing trade."},
	{"maxDrawdown", "The largest fall of the running net result from a peak to a later low, in money, with the days of the peak and the trough. The running result starts at 0 and trades are taken in trading-day, then entry-time order. Never a percentage: there is no capital to take one of. Not shown below 2 trades."},
	{"winStreak", "The longest run of consecutive winning trades, in the order of the running result. A trade that is neither a win nor a loss (zero, or inside the break-even band) ends a run. Not shown below 2 trades."},
	{"lossStreak", "The longest run of consecutive losing trades, in the order of the running result. A trade that is neither a win nor a loss (zero, or inside the break-even band) ends a run. Not shown below 2 trades."},
}

// DefinitionText answers the words of a statistic, or "" when the key is unknown.
func DefinitionText(key string) string {
	for _, d := range Definitions {
		if d.Key == key {
			return d.Text
		}
	}
	return ""
}
