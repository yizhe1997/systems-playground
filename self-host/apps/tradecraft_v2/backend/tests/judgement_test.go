package tests

import "testing"

func mistakeID(t *testing.T, name string) string {
	t.Helper()
	return scalar(t, `(SELECT id FROM mistake WHERE name = $1)`, name)
}

func getJudgement(t *testing.T, id string) resp {
	t.Helper()
	r := call(t, "GET", "/trades/"+id+"/judgement", nil)
	mustStatus(t, r, 200)
	return r
}

func putJudgement(t *testing.T, id string, in map[string]any) resp {
	t.Helper()
	return call(t, "PUT", "/trades/"+id+"/judgement", in)
}

// Scenario E: valid loss needs the plan answer yes; changing the answer clears the label.
func TestScenarioEValidLossAndThePlanAnswer(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	j := getJudgement(t, s.l1)
	if j.body["planFollowed"] != nil || j.body["label"] != nil || j.body["updatedAt"] != nil {
		t.Fatalf("a trade nobody judged: %s", j.raw)
	}
	if figure(j, "validLoss", "available") != false || figure(j, "validLoss", "reason") != "Not available: you answered that the plan was not followed." {
		t.Errorf("valid loss before any answer: %v", j.body["validLoss"])
	}

	// plan no: valid loss refused with the wireframe reason
	r := putJudgement(t, s.l1, map[string]any{"planFollowed": "no", "label": "valid_loss"})
	mustStatus(t, r, 422)
	wantStr(t, "reason", r.fields()["label"], "Not available: you answered that the plan was not followed.")
	// plan yes: saved
	r = putJudgement(t, s.l1, map[string]any{"planFollowed": "yes", "label": "valid_loss"})
	mustStatus(t, r, 200)
	wantStr(t, "label", r.str("label"), "valid_loss")
	if figure(r, "validLoss", "available") != true {
		t.Errorf("valid loss should be available now: %v", r.body["validLoss"])
	}
	// changing the answer to partly (the request no longer carries the label) clears it
	r = putJudgement(t, s.l1, map[string]any{"planFollowed": "partly", "expectedUpdatedAt": r.str("updatedAt")})
	mustStatus(t, r, 200)
	if r.body["label"] != nil {
		t.Errorf("the label survived the new answer: %s", r.raw)
	}
	wantStr(t, "plan answer kept", r.str("planFollowed"), "partly")
	// and a request that still carries it is refused
	mustStatus(t, putJudgement(t, s.l1, map[string]any{"planFollowed": "partly", "label": "valid_loss", "expectedUpdatedAt": r.str("updatedAt")}), 422)
}

// Scenario F: valid loss on a win is refused; a loss that becomes a win loses the label.
func TestScenarioFValidLossNeedsALoss(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	r := putJudgement(t, s.w, map[string]any{"planFollowed": "yes", "label": "valid_loss"})
	mustStatus(t, r, 422)
	wantStr(t, "reason", r.fields()["label"], "Not available: this trade is not a loss.")
	mustStatus(t, putJudgement(t, s.w, map[string]any{"planFollowed": "yes"}), 200)

	mustStatus(t, putJudgement(t, s.l1, map[string]any{"planFollowed": "yes", "label": "valid_loss"}), 200)
	g := call(t, "GET", "/trades/"+s.l1, nil)
	in := sampleTrade(s.acct, "2025-10-01T10:14", "2025-10-01T10:31", "21500.00", "21502.00")
	in["expectedUpdatedAt"] = g.str("updatedAt")
	mustStatus(t, call(t, "PUT", "/trades/"+s.l1, in), 200)
	j := getJudgement(t, s.l1)
	if j.body["label"] != nil || j.str("planFollowed") != "yes" || j.body["isWin"] != true {
		t.Errorf("after the edit: %s", j.raw)
	}
}

// Scenario G: a win can be flagged a mistake, and then it is a profitable mistake, not a clean win.
func TestScenarioGAWinFlaggedAsAMistake(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	chased := mistakeID(t, "Chased entry")
	r := putJudgement(t, s.w, map[string]any{"planFollowed": "no", "label": "mistake", "mistakeIds": []string{chased}})
	mustStatus(t, r, 200)
	wantStr(t, "label", r.str("label"), "mistake")
	day := getDay(t, s.acct, "2025-10-01")
	if num(figure(day, "stats", "mistakes", "count")) != 1 {
		t.Errorf("mistakes on the day: %v", figure(day, "stats", "mistakes"))
	}
	w := day.body["trades"].([]any)[0].(map[string]any)
	j := w["judgement"].(map[string]any)
	if j["label"] != "mistake" || j["planFollowed"] != "no" || len(j["mistakes"].([]any)) != 1 {
		t.Errorf("the winning trade: %v", j)
	}
	// the net result is still a win: the figures show a winning trade that broke the plan
	if num(figure(day, "stats", "winRate", "wins")) != 1 {
		t.Errorf("wins: %v", figure(day, "stats", "winRate"))
	}
}

func TestBreakEvenCanBeAMistakeButNotAValidLoss(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "")
	be := trade(t, sampleTrade(acct, "2025-10-01T09:00", "2025-10-01T09:30", "100", "100")).str("id")
	mustStatus(t, putJudgement(t, be, map[string]any{"planFollowed": "yes", "label": "valid_loss"}), 422)
	mustStatus(t, putJudgement(t, be, map[string]any{"planFollowed": "no", "label": "mistake"}), 200)
}

func TestJudgementTagsAreReplacedAndValidated(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	chased, moved := mistakeID(t, "Chased entry"), mistakeID(t, "Moved stop")
	r := putJudgement(t, s.l2, map[string]any{"planFollowed": "no", "label": "mistake", "mistakeIds": []string{chased, moved, chased}})
	mustStatus(t, r, 200)
	if len(r.body["mistakeIds"].([]any)) != 2 {
		t.Errorf("tags: %v", r.body["mistakeIds"])
	}
	r = putJudgement(t, s.l2, map[string]any{"planFollowed": "no", "label": "mistake", "mistakeIds": []string{moved}, "expectedUpdatedAt": r.str("updatedAt")})
	mustStatus(t, r, 200)
	if len(r.body["mistakeIds"].([]any)) != 1 {
		t.Errorf("tags after the replace: %v", r.body["mistakeIds"])
	}
	// an unknown id and a retired mistake are refused as new tags; a retired one already on the trade may stay
	cur := r.str("updatedAt")
	bad := putJudgement(t, s.l2, map[string]any{"planFollowed": "no", "mistakeIds": []string{"00000000-0000-0000-0000-000000000000"}, "expectedUpdatedAt": cur})
	mustStatus(t, bad, 422)
	wantStr(t, "message", bad.fields()["mistakeIds"], "Choose mistakes from the list.")
	exec(t, `UPDATE mistake SET retired_at = now() WHERE name = 'Oversized'`)
	mustStatus(t, putJudgement(t, s.l2, map[string]any{"planFollowed": "no", "mistakeIds": []string{mistakeID(t, "Oversized")}, "expectedUpdatedAt": cur}), 422)
	exec(t, `UPDATE mistake SET retired_at = now() WHERE name = 'Moved stop'`)
	mustStatus(t, putJudgement(t, s.l2, map[string]any{"planFollowed": "partly", "mistakeIds": []string{moved}, "expectedUpdatedAt": cur}), 200)
}

func TestJudgementValidationAndNotFound(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	mustStatus(t, putJudgement(t, s.w, map[string]any{"planFollowed": "sometimes"}), 422)
	mustStatus(t, putJudgement(t, s.w, map[string]any{"label": "great"}), 422)
	mustStatus(t, putJudgement(t, s.w, map[string]any{}), 200) // clearing everything is allowed
	zero := "00000000-0000-0000-0000-000000000000"
	mustStatus(t, call(t, "GET", "/trades/"+zero+"/judgement", nil), 404)
	mustStatus(t, putJudgement(t, zero, map[string]any{"planFollowed": "yes"}), 404)
	// a deleted trade cannot be judged until it is restored
	mustStatus(t, call(t, "DELETE", "/trades/"+s.w, nil), 200)
	mustStatus(t, putJudgement(t, s.w, map[string]any{"planFollowed": "yes"}), 404)
	mustStatus(t, call(t, "POST", "/trades/"+s.w+"/restore", nil), 200)
	mustStatus(t, putJudgement(t, s.w, map[string]any{"planFollowed": "yes", "expectedUpdatedAt": getJudgement(t, s.w).str("updatedAt")}), 200)
}

func TestOutOfDateJudgementIsRefused(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	first := putJudgement(t, s.w, map[string]any{"planFollowed": "yes"})
	mustStatus(t, first, 200)
	mustStatus(t, putJudgement(t, s.w, map[string]any{"planFollowed": "partly", "expectedUpdatedAt": first.str("updatedAt")}), 200)
	stale := putJudgement(t, s.w, map[string]any{"planFollowed": "no", "expectedUpdatedAt": first.str("updatedAt")})
	mustStatus(t, stale, 409)
	wantStr(t, "message", stale.str("message"), "This judgement was changed elsewhere. Reload to see the latest version.")
	// a first save from a copy that never saw the row is refused too
	mustStatus(t, putJudgement(t, s.w, map[string]any{"planFollowed": "no"}), 409)
	wantStr(t, "kept", getJudgement(t, s.w).str("planFollowed"), "partly")
}

// Scenario P: the trade list carries the plan answer and the label for the Plan column.
func TestScenarioPTradesCarryThePlanAnswer(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	mustStatus(t, putJudgement(t, s.l1, map[string]any{"planFollowed": "yes", "label": "valid_loss"}), 200)
	l := call(t, "GET", "/trades?"+"accountId="+s.acct, nil)
	mustStatus(t, l, 200)
	seen := map[string][2]any{}
	for _, tr := range l.list {
		seen[tr["id"].(string)] = [2]any{tr["planFollowed"], tr["label"]}
	}
	if seen[s.l1] != [2]any{"yes", "valid_loss"} {
		t.Errorf("L1: %v", seen[s.l1])
	}
	if seen[s.w] != [2]any{nil, nil} {
		t.Errorf("W is not judged yet: %v", seen[s.w])
	}
	one := call(t, "GET", "/trades/"+s.l1, nil)
	wantStr(t, "by id", one.str("planFollowed"), "yes")
	// the export carries them too
	ex := call(t, "GET", "/export", nil)
	found := false
	for _, x := range ex.body["trades"].([]any) {
		if x.(map[string]any)["id"] == s.l1 && x.(map[string]any)["label"] == "valid_loss" {
			found = true
		}
	}
	if !found {
		t.Error("the export lacks the label")
	}
}
