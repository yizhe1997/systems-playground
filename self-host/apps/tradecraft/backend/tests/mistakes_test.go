package tests

import (
	"strings"
	"testing"
)

func mistakeNames(t *testing.T, query string) []string {
	t.Helper()
	r := call(t, "GET", "/mistakes"+query, nil)
	mustStatus(t, r, 200)
	var out []string
	for _, m := range r.list {
		out = append(out, m["name"].(string))
	}
	return out
}

func has(list []string, name string) bool {
	for _, n := range list {
		if n == name {
			return true
		}
	}
	return false
}

func TestStarterMistakesAndAdding(t *testing.T) {
	reset(t)
	names := mistakeNames(t, "")
	if len(names) != 5 || names[0] != "Chased entry" {
		t.Fatalf("starters: %v", names)
	}
	r := call(t, "POST", "/mistakes", map[string]any{"name": "  Averaged   down "})
	mustStatus(t, r, 201)
	wantStr(t, "name collapsed", r.str("name"), "Averaged down")
	// the same name in other letters is refused with the wireframe wording
	r = call(t, "POST", "/mistakes", map[string]any{"name": "averaged DOWN"})
	mustStatus(t, r, 422)
	wantStr(t, "message", r.fields()["name"], "A mistake named averaged DOWN already exists. Names are not case sensitive.")
	mustStatus(t, call(t, "POST", "/mistakes", map[string]any{"name": ""}), 422)
	r = call(t, "POST", "/mistakes", map[string]any{"name": strings.Repeat("x", 61)})
	mustStatus(t, r, 422)
	mustStatus(t, call(t, "POST", "/mistakes", map[string]any{"name": strings.Repeat("x", 60)}), 201)
}

// Scenario J: rename, retire and restore keep history; adding a retired name brings it back.
func TestScenarioJRenameRetireRestore(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	moved, over := mistakeID(t, "Moved stop"), mistakeID(t, "Oversized")
	mustStatus(t, putJudgement(t, s.l1, map[string]any{"planFollowed": "no", "label": "mistake", "mistakeIds": []string{moved, over}}), 200)

	m := call(t, "GET", "/mistakes", nil)
	var movedRow map[string]any
	for _, x := range m.list {
		if x["id"] == moved {
			movedRow = x
		}
	}
	// rename to a name in use (a retired one included) is refused
	r := call(t, "PUT", "/mistakes/"+moved, map[string]any{"name": "chased entry"})
	mustStatus(t, r, 422)
	wantStr(t, "message", r.fields()["name"], "A mistake named chased entry already exists. Names are not case sensitive.")
	r = call(t, "PUT", "/mistakes/"+moved, map[string]any{"name": "Moved the stop", "expectedUpdatedAt": movedRow["updatedAt"]})
	mustStatus(t, r, 200)
	// a copy that did not see the rename is refused
	mustStatus(t, call(t, "PUT", "/mistakes/"+moved, map[string]any{"name": "Again", "expectedUpdatedAt": movedRow["updatedAt"]}), 409)

	// retire: gone from the list and from new tags, kept on the old trade
	r = call(t, "POST", "/mistakes/"+over+"/retire", nil)
	mustStatus(t, r, 200)
	if r.body["retired"] != true {
		t.Errorf("retired: %s", r.raw)
	}
	if has(mistakeNames(t, ""), "Oversized") || !has(mistakeNames(t, "?includeRetired=true"), "Oversized") {
		t.Error("Oversized should be hidden by default and listed with includeRetired")
	}
	if j := getJudgement(t, s.l1); len(j.body["mistakeIds"].([]any)) != 2 {
		t.Errorf("old tags: %s", j.raw)
	}
	mustStatus(t, putJudgement(t, s.l2, map[string]any{"planFollowed": "no", "label": "mistake", "mistakeIds": []string{over}}), 422)
	if names := dayTagNames(t, s.acct); !has(names, "Moved the stop") || !has(names, "Oversized") {
		t.Errorf("history under the new name: %v", names)
	}

	// adding the retired name brings the same mistake back; so does restore
	r = call(t, "POST", "/mistakes", map[string]any{"name": "oversized"})
	mustStatus(t, r, 201)
	wantStr(t, "same mistake", r.str("id"), over)
	if r.body["retired"] != false {
		t.Errorf("not restored: %s", r.raw)
	}
	mustStatus(t, call(t, "POST", "/mistakes/"+over+"/retire", nil), 200)
	mustStatus(t, call(t, "POST", "/mistakes/"+over+"/restore", nil), 200)
	if !has(mistakeNames(t, ""), "Oversized") {
		t.Error("restore did not bring it back")
	}
	zero := "00000000-0000-0000-0000-000000000000"
	mustStatus(t, call(t, "POST", "/mistakes/"+zero+"/retire", nil), 404)
	mustStatus(t, call(t, "PUT", "/mistakes/"+zero, map[string]any{"name": "x"}), 404)
}

// dayTagNames reads the names of the mistakes tagged on the sample day's trades.
func dayTagNames(t *testing.T, acct string) []string {
	t.Helper()
	var out []string
	for _, tr := range getDay(t, acct, "2025-10-01").body["trades"].([]any) {
		for _, n := range tr.(map[string]any)["judgement"].(map[string]any)["mistakes"].([]any) {
			out = append(out, n.(string))
		}
	}
	return out
}

// Scenario I (part): the stop line rules.
func TestStopLineRules(t *testing.T) {
	reset(t)
	moved := mistakeID(t, "Moved stop")
	put := func(in map[string]any) resp {
		in["name"] = "Moved stop"
		return call(t, "PUT", "/mistakes/"+moved, in)
	}
	r := put(map[string]any{"stopLine": 0, "stopPeriod": "week"})
	mustStatus(t, r, 422)
	wantStr(t, "min", r.fields()["stopLine"], "Stop line must be 1 or more.")
	r = put(map[string]any{"stopLine": -1, "stopPeriod": "week"})
	wantStr(t, "negative", r.fields()["stopLine"], "Stop line must be 1 or more.")
	r = put(map[string]any{"stopLine": 1000, "stopPeriod": "week"})
	mustStatus(t, r, 422)
	wantStr(t, "max", r.fields()["stopLine"], "Stop line must be 999 or less.")
	mustStatus(t, put(map[string]any{"stopLine": 4}), 422)                       // a line needs its period
	mustStatus(t, put(map[string]any{"stopPeriod": "week"}), 422)                // and a period its line
	mustStatus(t, put(map[string]any{"stopLine": 4, "stopPeriod": "year"}), 422) // week or month only
	r = put(map[string]any{"stopLine": 999, "stopPeriod": "month"})
	mustStatus(t, r, 200)
	if num(r.body["stopLine"]) != 999 || r.str("stopPeriod") != "month" {
		t.Errorf("saved: %s", r.raw)
	}
	r = put(map[string]any{}) // both absent removes it
	mustStatus(t, r, 200)
	if r.body["stopLine"] != nil || r.body["stopPeriod"] != nil {
		t.Errorf("removed: %s", r.raw)
	}
}
