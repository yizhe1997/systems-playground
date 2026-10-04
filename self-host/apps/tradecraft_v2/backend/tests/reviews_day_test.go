package tests

import (
	"net/url"
	"strings"
	"testing"
)

func getDay(t *testing.T, acct, date string) resp {
	t.Helper()
	r := call(t, "GET", "/reviews/day?"+url.Values{"accountId": {acct}, "date": {date}}.Encode(), nil)
	mustStatus(t, r, 200)
	return r
}

func saveDay(t *testing.T, in map[string]any) resp {
	t.Helper()
	return call(t, "PUT", "/reviews/day", in)
}

func figure(r resp, path ...string) any {
	var cur any = r.body
	for _, p := range path {
		m, ok := cur.(map[string]any)
		if !ok {
			return nil
		}
		cur = m[p]
	}
	return cur
}

func num(v any) int {
	f, _ := v.(float64)
	return int(f)
}

// Scenario A: the figures of the sample day.
func TestScenarioAFigures(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	judgeSample(t, s)
	r := getDay(t, s.acct, "2025-10-01")
	wantNum(t, "net result", r.body["stats"].(map[string]any)["netResult"].(string), "45")
	wantStr(t, "currency", r.str("currency"), "USD")
	pf := figure(r, "stats", "planFollowed").(map[string]any)
	if num(pf["followed"]) != 2 || num(pf["notFollowed"]) != 1 || num(pf["partly"]) != 0 || num(pf["notJudged"]) != 0 || num(pf["of"]) != 3 {
		t.Errorf("plan followed: %v", pf)
	}
	if num(figure(r, "stats", "mistakes", "count")) != 1 {
		t.Errorf("mistakes: %v", figure(r, "stats", "mistakes"))
	}
	by := figure(r, "stats", "mistakes", "byMistake").([]any)
	if len(by) != 1 || by[0].(map[string]any)["name"] != "Chased entry" {
		t.Errorf("by mistake: %v", by)
	}
	if num(figure(r, "stats", "validLosses", "count")) != 1 || num(figure(r, "stats", "validLosses", "losingTrades")) != 2 {
		t.Errorf("valid losses: %v", figure(r, "stats", "validLosses"))
	}
	if num(figure(r, "stats", "winRate", "wins")) != 1 || num(figure(r, "stats", "winRate", "trades")) != 3 || num(figure(r, "stats", "winRate", "percent")) != 33 {
		t.Errorf("win rate: %v", figure(r, "stats", "winRate"))
	}
	if r.body["state"] != "missing" {
		t.Errorf("state %v, want missing (the day has ended and nothing is saved)", r.body["state"])
	}
	trades := r.body["trades"].([]any)
	if len(trades) != 3 {
		t.Fatalf("%d trades", len(trades))
	}
	last := trades[2].(map[string]any)
	if j := last["judgement"].(map[string]any); j["planFollowed"] != "no" || j["label"] != "mistake" || len(j["mistakes"].([]any)) != 1 {
		t.Errorf("judgement of L2: %v", j)
	}
	if reasons := last["reasons"].(map[string]any); reasons["risk"] != "no stop recorded" {
		t.Errorf("risk reason: %v", reasons)
	}
	// neighbours
	wantStr(t, "previous", r.str("previousDate"), "2025-09-30")
	wantStr(t, "next", r.str("nextDate"), "2025-10-02")
}

func TestUnjudgedDayShowsNotJudgedYet(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	judge(t, s.w, "yes", "")
	r := getDay(t, s.acct, "2025-10-01")
	pf := figure(r, "stats", "planFollowed").(map[string]any)
	if num(pf["followed"]) != 1 || num(pf["notJudged"]) != 2 || num(pf["of"]) != 3 {
		t.Errorf("plan followed: %v", pf)
	}
}

func TestEmptyDayHasDashesWithReasons(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "")
	r := getDay(t, acct, "2025-10-01")
	if r.body["state"] != nil {
		t.Errorf("state %v, want none", r.body["state"])
	}
	if figure(r, "stats", "netResult") != nil || figure(r, "stats", "winRate", "percent") != nil {
		t.Errorf("figures on an empty day: %v", figure(r, "stats"))
	}
	reasons := figure(r, "stats", "reasons").(map[string]any)
	if reasons["netResult"] != "no trades" || reasons["winRate"] != "no trades" {
		t.Errorf("reasons: %v", reasons)
	}
	if len(r.body["trades"].([]any)) != 0 {
		t.Error("trades on an empty day")
	}
	// R: the third question works on an empty day, and the review is then a draft
	s := saveDay(t, map[string]any{"accountId": acct, "date": "2025-10-01", "nextFocus": "Wait for the close."})
	mustStatus(t, s, 200)
	wantStr(t, "state", s.str("state"), "draft")
}

// Scenario B: save a draft; scenario C: yesterday's focus.
func TestScenarioBAndCDraftAndYesterdaysFocus(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	r := saveDay(t, map[string]any{
		"accountId": s.acct, "date": "2025-10-01",
		"didWell": "Waited for the close.", "couldImprove": "Entered early.", "nextFocus": "Wait for the candle close before entering.",
		"mentalGrade": 4, "technicalGrade": 5,
	})
	mustStatus(t, r, 200)
	wantStr(t, "state", r.str("state"), "draft")
	if r.body["reviewedAt"] != nil || r.str("updatedAt") == "" {
		t.Errorf("a draft has no reviewedAt and has a version token: %s", r.raw)
	}
	wantStr(t, "didWell", figure(r, "answers", "didWell").(string), "Waited for the close.")
	if num(r.body["mentalGrade"]) != 4 || num(r.body["technicalGrade"]) != 5 {
		t.Errorf("grades: %s", r.raw)
	}

	// the next day carries it, labelled with its date
	next := getDay(t, s.acct, "2025-10-02")
	y := figure(next, "focus", "yesterday").(map[string]any)
	wantStr(t, "yesterday date", y["date"].(string), "2025-10-01")
	wantStr(t, "yesterday text", y["body"].(string), "Wait for the candle close before entering.")
	// days later it is still the nearest earlier one, labelled with its own date
	later := getDay(t, s.acct, "2025-10-06")
	wantStr(t, "nearest earlier", figure(later, "focus", "yesterday").(map[string]any)["date"].(string), "2025-10-01")
	// the first day has nothing earlier; another account has nothing at all
	if figure(getDay(t, s.acct, "2025-10-01"), "focus", "yesterday") != nil {
		t.Error("the first day shows an earlier focus")
	}
	other := account(t, "Practice", "USD", "")
	if figure(getDay(t, other, "2025-10-06"), "focus", "yesterday") != nil {
		t.Error("another account shows this account's focus")
	}
	// an earlier review with an empty answer is skipped
	saveDay(t, map[string]any{"accountId": s.acct, "date": "2025-10-03", "didWell": "x", "nextFocus": ""})
	wantStr(t, "empty answers are skipped", figure(getDay(t, s.acct, "2025-10-06"), "focus", "yesterday").(map[string]any)["date"].(string), "2025-10-01")
}

// Scenario D: reviewed, edited, and trades changed afterwards.
func TestScenarioDReviewedAndTradesChanged(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	first := saveDay(t, map[string]any{"accountId": s.acct, "date": "2025-10-01", "didWell": "ok", "markReviewed": true})
	mustStatus(t, first, 200)
	wantStr(t, "state", first.str("state"), "reviewed")
	if first.str("reviewedAt") == "" || first.body["editedAt"] != nil {
		t.Errorf("reviewed once, not yet edited: %s", first.raw)
	}
	if num(first.body["tradesChangedAfterReview"]) != 0 {
		t.Errorf("trades changed straight after review: %v", first.body["tradesChangedAfterReview"])
	}
	// a trade is edited through the 000 API
	w := call(t, "GET", "/trades/"+s.w, nil)
	in := sampleTrade(s.acct, "2025-10-01T09:41", "2025-10-01T09:58", "21450.00", "21466.00")
	in["expectedUpdatedAt"] = w.str("updatedAt")
	mustStatus(t, call(t, "PUT", "/trades/"+s.w, in), 200)
	if got := num(getDay(t, s.acct, "2025-10-01").body["tradesChangedAfterReview"]); got != 1 {
		t.Errorf("after an edit: %d, want 1", got)
	}
	// a soft delete counts too, and a new trade
	mustStatus(t, call(t, "DELETE", "/trades/"+s.l2, nil), 200)
	trade(t, sampleTrade(s.acct, "2025-10-01T11:00", "2025-10-01T11:10", "100", "101"))
	if got := num(getDay(t, s.acct, "2025-10-01").body["tradesChangedAfterReview"]); got != 3 {
		t.Errorf("after edit, delete and add: %d, want 3", got)
	}
	// the review stays editable; a further save sets editedAt and keeps reviewedAt
	cur := getDay(t, s.acct, "2025-10-01")
	again := saveDay(t, map[string]any{"accountId": s.acct, "date": "2025-10-01", "didWell": "ok, edited", "expectedUpdatedAt": cur.str("updatedAt")})
	mustStatus(t, again, 200)
	wantStr(t, "still reviewed", again.str("state"), "reviewed")
	if again.str("editedAt") == "" || again.str("reviewedAt") != first.str("reviewedAt") {
		t.Errorf("editedAt must be set and reviewedAt kept: %s", again.raw)
	}
}

func TestMarkingReviewedRequiresNothing(t *testing.T) {
	reset(t)
	s := sampleDay(t) // nothing judged, no answers, no grades
	r := saveDay(t, map[string]any{"accountId": s.acct, "date": "2025-10-01", "markReviewed": true})
	mustStatus(t, r, 200)
	wantStr(t, "state", r.str("state"), "reviewed")
}

func TestADayThatHasNotHappenedCannotBeMarkedReviewed(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "")
	r := saveDay(t, map[string]any{"accountId": acct, "date": "2099-01-01", "markReviewed": true})
	mustStatus(t, r, 422)
	wantStr(t, "message", r.fields()["markReviewed"], "This day has not happened yet.")
	// it can still be opened and saved as a draft
	getDay(t, acct, "2099-01-01")
}

func TestReviewValidation(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "")
	for name, in := range map[string]map[string]any{
		"grade 0":     {"accountId": acct, "date": "2025-10-01", "mentalGrade": 0},
		"grade 6":     {"accountId": acct, "date": "2025-10-01", "technicalGrade": 6},
		"long answer": {"accountId": acct, "date": "2025-10-01", "didWell": strings.Repeat("x", 2001)},
		"bad date":    {"accountId": acct, "date": "yesterday"},
	} {
		if r := saveDay(t, in); r.status != 422 {
			t.Errorf("%s: status %d: %s", name, r.status, r.raw)
		}
	}
	mustStatus(t, saveDay(t, map[string]any{"accountId": acct, "date": "2025-10-01", "didWell": strings.Repeat("x", 2000), "mentalGrade": 1, "technicalGrade": 5}), 200)
	mustStatus(t, saveDay(t, map[string]any{"accountId": "00000000-0000-0000-0000-000000000000", "date": "2025-10-01"}), 404)
	mustStatus(t, call(t, "GET", "/reviews/day?accountId=nope&date=2025-10-01", nil), 404)
}

// Scenario Q: a save from an out-of-date copy is refused.
func TestOutOfDateReviewIsRefused(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "")
	first := saveDay(t, map[string]any{"accountId": acct, "date": "2025-10-01", "didWell": "one"})
	mustStatus(t, first, 200)
	mustStatus(t, saveDay(t, map[string]any{"accountId": acct, "date": "2025-10-01", "didWell": "two", "expectedUpdatedAt": first.str("updatedAt")}), 200)
	stale := saveDay(t, map[string]any{"accountId": acct, "date": "2025-10-01", "didWell": "three", "expectedUpdatedAt": first.str("updatedAt")})
	mustStatus(t, stale, 409)
	wantStr(t, "message", stale.str("message"), "This review was changed elsewhere. Reload to see the latest version.")
	// a first save made from a copy that never saw the row is refused as well
	mustStatus(t, saveDay(t, map[string]any{"accountId": acct, "date": "2025-10-01", "didWell": "four"}), 409)
	if got := figure(getDay(t, acct, "2025-10-01"), "answers", "didWell"); got != "two" {
		t.Errorf("a refused save changed the review: %v", got)
	}
}

func TestADayMistakeAndFocusShowOnTheDay(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	exec(t, `INSERT INTO day_mistake (account_id, trading_day, mistake_id) SELECT $1, '2025-10-01', id FROM mistake WHERE name = 'Oversized'`, s.acct)
	exec(t, `INSERT INTO focus (period, period_start, body) VALUES ('week', '2025-09-29', 'A+ setups only.'), ('month', '2025-10-01', 'Grade every trade.')`)
	r := getDay(t, s.acct, "2025-10-01")
	dm := r.body["dayMistakes"].([]any)
	if len(dm) != 1 || dm[0].(map[string]any)["name"] != "Oversized" {
		t.Errorf("day mistakes: %v", dm)
	}
	wk := figure(r, "focus", "week").(map[string]any)
	if wk["body"] != "A+ setups only." || wk["periodStart"] != "2025-09-29" || wk["periodEnd"] != "2025-10-05" {
		t.Errorf("week focus: %v", wk)
	}
	mo := figure(r, "focus", "month").(map[string]any)
	if mo["body"] != "Grade every trade." || mo["periodStart"] != "2025-10-01" || mo["periodEnd"] != "2025-10-31" {
		t.Errorf("month focus: %v", mo)
	}
	// the week of the next Monday has no focus
	none := figure(getDay(t, s.acct, "2025-10-06"), "focus", "week").(map[string]any)
	if none["body"] != nil {
		t.Errorf("next week shows a focus: %v", none)
	}
}
