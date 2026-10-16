package tests

import "testing"

// Scenario O: the export carries every record feature 001 makes, and the feature 000 fields are unchanged.
func TestScenarioOExportCarriesTheReviewRecords(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	moved, over := mistakeID(t, "Moved stop"), mistakeID(t, "Oversized")
	mustStatus(t, call(t, "PUT", "/mistakes/"+moved, map[string]any{"name": "Moved stop", "stopLine": 3, "stopPeriod": "week"}), 200)
	mustStatus(t, putJudgement(t, s.l1, map[string]any{"planFollowed": "no", "label": "mistake", "mistakeIds": []string{moved, over}}), 200)
	mustStatus(t, putJudgement(t, s.l2, map[string]any{"planFollowed": "yes", "label": "valid_loss"}), 200)
	mustStatus(t, setDayMistakes(t, s.acct, "2025-10-01", moved), 200)
	mustStatus(t, saveDay(t, map[string]any{"accountId": s.acct, "date": "2025-10-01", "didWell": "Waited", "mentalGrade": 4, "markReviewed": true}), 200)
	mustStatus(t, putFocus(t, "week", "2025-10-01", "A+ only"), 200)
	mustStatus(t, markWeek(t, s.acct, "2025-10-01"), 200)
	mustStatus(t, call(t, "POST", "/mistakes/"+over+"/retire", nil), 200)
	mustStatus(t, call(t, "DELETE", "/trades/"+s.w, nil), 200)

	r := call(t, "GET", "/export", nil)
	mustStatus(t, r, 200)
	list := func(key string) []any { return r.body[key].([]any) }

	// the feature 000 parts are all there: three trades (one deleted), money as strings
	trades := list("trades")
	if len(trades) != 3 || len(list("accounts")) != 1 {
		t.Fatalf("%d trades, %d accounts", len(trades), len(list("accounts")))
	}
	for _, x := range trades {
		m := x.(map[string]any)
		for _, k := range []string{"size", "entryPrice", "exitPrice", "cost", "netResult", "grossResult"} {
			if _, ok := m[k].(string); !ok {
				t.Errorf("trade %v: %s is not a string: %v", m["id"], k, m[k])
			}
		}
		j := m["judgement"].(map[string]any)
		switch m["id"] {
		case s.l1:
			if j["planFollowed"] != "no" || j["label"] != "mistake" || len(j["mistakes"].([]any)) != 2 {
				t.Errorf("L1 judgement: %v", j)
			}
		case s.l2:
			if j["label"] != "valid_loss" || len(j["mistakes"].([]any)) != 0 {
				t.Errorf("L2 judgement: %v", j)
			}
		case s.w:
			if m["deleted"] != true || j["planFollowed"] != nil || j["mistakes"] == nil {
				t.Errorf("W: %v", m)
			}
		}
	}
	// the mistake list: all five, the retired one marked, the stop line kept
	ms := list("mistakes")
	if len(ms) != 5 {
		t.Fatalf("mistakes: %d", len(ms))
	}
	for _, x := range ms {
		m := x.(map[string]any)
		if m["name"] == "Oversized" && m["retired"] != true || m["name"] == "Moved stop" && (num(m["stopLine"]) != 3 || m["stopPeriod"] != "week") {
			t.Errorf("mistake: %v", m)
		}
	}
	if d := list("dailyReviews"); len(d) != 1 || d[0].(map[string]any)["didWell"] != "Waited" || num(d[0].(map[string]any)["mentalGrade"]) != 4 || d[0].(map[string]any)["reviewedAt"] == nil {
		t.Errorf("daily reviews: %v", list("dailyReviews"))
	}
	if f := list("focuses"); len(f) != 1 || f[0].(map[string]any)["body"] != "A+ only" || f[0].(map[string]any)["periodStart"] != "2025-09-29" {
		t.Errorf("focuses: %v", f)
	}
	if w := list("weeklyMarks"); len(w) != 1 || w[0].(map[string]any)["weekStart"] != "2025-09-29" {
		t.Errorf("weekly marks: %v", w)
	}
	if dm := list("dayMistakes"); len(dm) != 1 || dm[0].(map[string]any)["mistake"] != "Moved stop" {
		t.Errorf("day mistakes: %v", dm)
	}
	// counts equal the screens: the tags and the day record are the counter's records
	row := counterRow(counter(t, "period=week&date=2025-10-01"), moved)
	if cell(row, "week", "total") != 2 {
		t.Errorf("counter: %v", row)
	}
	// an empty journal exports empty lists, not nulls
	reset(t)
	e := call(t, "GET", "/export", nil)
	for _, k := range []string{"trades", "dailyReviews", "focuses", "weeklyMarks", "dayMistakes"} {
		if _, ok := e.body[k].([]any); !ok {
			t.Errorf("%s is not a list on an empty journal: %v", k, e.body[k])
		}
	}
}
