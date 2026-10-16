package api

import "fmt"

// The wording of feature 001's refusals and reasons, in one place (screens.md and the contract use these words).
const (
	msgPlanNotFollowed = "Not available: you answered that the plan was not followed."
	msgNotALoss        = "Not available: this trade is not a loss."
	msgDayNotYet       = "This day has not happened yet."
	msgWeekNotYet      = "This week has not started yet."
	msgStopLineMin     = "Stop line must be 1 or more."
	msgStopLineMax     = "Stop line must be 999 or less."
	msgNoTrades        = "no trades"
)

func msgTooLong(over int) string {
	if over == 1 {
		return "Too long: 1 character over. Shorten it to save."
	}
	return fmt.Sprintf("Too long: %d characters over. Shorten it to save.", over)
}

func msgMistakeUsed(name string) string {
	return "A mistake named " + name + " already exists. Names are not case sensitive."
}
