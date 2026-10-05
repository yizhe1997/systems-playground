package tests

import "testing"

func counter(t *testing.T, query string) resp {
	t.Helper()
	r := call(t, "GET", "/mistakes/counter?"+query, nil)
	mustStatus(t, r, 200)
	return r
}

// counterRow finds the row of a mistake in a counter answer (nil when it is not listed).
func counterRow(r resp, id string) map[string]any {
	for _, x := range r.body["rows"].([]any) {
		if row := x.(map[string]any); row["mistakeId"] == id {
			return row
		}
	}
	return nil
}

func cell(row map[string]any, which, key string) int { return num(row[which].(map[string]any)[key]) }

func setDayMistakes(t *testing.T, acct, date string, ids ...string) resp {
	t.Helper()
	if ids == nil {
		ids = []string{}
	}
	return call(t, "PUT", "/reviews/day-mistakes", map[string]any{"accountId": acct, "date": date, "mistakeIds": ids})
}

// Scenario H: tags and day records each count once; the same mistake on a trade and on its day is two records.
func TestScenarioHRecordsCountOnce(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	other := account(t, "Practice", "USD", "")
	moved := mistakeID(t, "Moved stop")
	mustStatus(t, putJudgement(t, s.l1, map[string]any{"planFollowed": "no", "label": "mistake", "mistakeIds": []string{moved}}), 200)
	mustStatus(t, putJudgement(t, s.l2, map[string]any{"planFollowed": "no", "label": "mistake", "mistakeIds": []string{moved}}), 200)
	d := setDayMistakes(t, s.acct, "2025-10-01", moved, moved) // a duplicate id is one record
	mustStatus(t, d, 200)
	if dm := d.body["dayMistakes"].([]any); len(dm) != 1 {
		t.Fatalf("day records: %s", d.raw)
	}
	// a second account, one tag
	t3 := trade(t, sampleTrade(other, "2025-10-02T09:00", "2025-10-02T09:30", "100", "99")).str("id")
	mustStatus(t, putJudgement(t, t3, map[string]any{"planFollowed": "no", "label": "mistake", "mistakeIds": []string{moved}}), 200)

	r := counter(t, "period=week&date=2025-10-01")
	row := counterRow(r, moved)
	if cell(row, "week", "onTrades") != 3 || cell(row, "week", "onDays") != 1 || cell(row, "week", "total") != 4 {
		t.Errorf("week cell: %v", row["week"])
	}
	accts := row["accounts"].([]any)
	if len(accts) != 2 || accts[0].(map[string]any)["name"] != "Funded 50K" || num(accts[0].(map[string]any)["count"]) != 3 || num(accts[1].(map[string]any)["count"]) != 1 {
		t.Errorf("split by account (Funded: 2 tags + 1 day record; Practice: 1 tag): %v", accts)
	}
	// filtered to one account
	one := counter(t, "period=week&date=2025-10-01&accountId="+other)
	if cell(counterRow(one, moved), "week", "total") != 1 {
		t.Errorf("one account: %v", counterRow(one, moved))
	}
	// a soft-deleted trade is not counted, and comes back on restore
	mustStatus(t, call(t, "DELETE", "/trades/"+s.l1, nil), 200)
	if cell(counterRow(counter(t, "period=week&date=2025-10-01"), moved), "week", "total") != 3 {
		t.Error("a deleted trade still counts")
	}
	mustStatus(t, call(t, "POST", "/trades/"+s.l1+"/restore", nil), 200)
	if cell(counterRow(counter(t, "period=week&date=2025-10-01"), moved), "week", "total") != 4 {
		t.Error("restore did not bring the count back")
	}
	// clearing the day records
	mustStatus(t, setDayMistakes(t, s.acct, "2025-10-01"), 200)
	if cell(counterRow(counter(t, "period=week&date=2025-10-01"), moved), "week", "onDays") != 0 {
		t.Error("day record not cleared")
	}
	// a retired or unknown mistake is refused for a new record
	exec(t, `UPDATE mistake SET retired_at = now() WHERE name = 'Oversized'`)
	mustStatus(t, setDayMistakes(t, s.acct, "2025-10-01", mistakeID(t, "Oversized")), 422)
	mustStatus(t, setDayMistakes(t, s.acct, "2025-10-01", "00000000-0000-0000-0000-000000000000"), 422)
	mustStatus(t, setDayMistakes(t, "00000000-0000-0000-0000-000000000000", "2025-10-01"), 404)
}

// Scenario I: the stop line is read in its own period, for the viewed week or month.
func TestScenarioIStopLine(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	moved := mistakeID(t, "Moved stop")
	mustStatus(t, call(t, "PUT", "/mistakes/"+moved, map[string]any{"name": "Moved stop", "stopLine": 2, "stopPeriod": "week"}), 200)
	mustStatus(t, putJudgement(t, s.l1, map[string]any{"planFollowed": "no", "label": "mistake", "mistakeIds": []string{moved}}), 200)
	row := counterRow(counter(t, "period=week&date=2025-10-01"), moved)
	if row["status"] != "count_only" || row["progress"] != "1 of 2 this week" {
		t.Errorf("one tag: %v %v", row["status"], row["progress"])
	}
	mustStatus(t, putJudgement(t, s.l2, map[string]any{"planFollowed": "no", "label": "mistake", "mistakeIds": []string{moved}}), 200)
	row = counterRow(counter(t, "period=week&date=2025-10-01"), moved)
	if row["status"] != "stop" || row["progress"] != "2 of 2 this week" {
		t.Errorf("at the line: %v %v", row["status"], row["progress"])
	}
	// the month view reads the same week stop line from the week that holds the viewed date
	row = counterRow(counter(t, "period=month&date=2025-10-01"), moved)
	if row["status"] != "stop" || cell(row, "month", "total") != 2 {
		t.Errorf("month view: %v", row)
	}
	// last week shows what happened last week
	row = counterRow(counter(t, "period=week&date=2025-09-24"), moved)
	if row["status"] != "count_only" || row["progress"] != "0 of 2 this week" {
		t.Errorf("last week: %v %v", row["status"], row["progress"])
	}
	// a month line counts the whole month
	mustStatus(t, call(t, "PUT", "/mistakes/"+moved, map[string]any{"name": "Moved stop", "stopLine": 3, "stopPeriod": "month"}), 200)
	row = counterRow(counter(t, "period=week&date=2025-10-01"), moved)
	if row["status"] != "count_only" || row["progress"] != "2 of 3 this month" {
		t.Errorf("month line: %v %v", row["status"], row["progress"])
	}
	// no stop line: count only, no progress
	row = counterRow(counter(t, "period=week&date=2025-10-01"), mistakeID(t, "Chased entry"))
	if row["status"] != "count_only" || row["progress"] != nil || row["stopLine"] != nil {
		t.Errorf("no line: %v", row)
	}
	mustStatus(t, call(t, "GET", "/mistakes/counter?period=year", nil), 422)
	mustStatus(t, call(t, "GET", "/mistakes/counter?period=week&date=nope", nil), 422)
}

// A retired mistake appears only with a count in the period; a week that crosses two months counts whole in the week
// column and only its days of the month in the month column; renaming keeps the counts.
func TestCounterPeriodsAndRetired(t *testing.T) {
	reset(t)
	s := sampleDay(t) // Wed 1 Oct: the week of 29 Sep to 5 Oct crosses September and October
	moved, over := mistakeID(t, "Moved stop"), mistakeID(t, "Oversized")
	mustStatus(t, putJudgement(t, s.l1, map[string]any{"planFollowed": "no", "label": "mistake", "mistakeIds": []string{moved, over}}), 200)
	sep := trade(t, sampleTrade(s.acct, "2025-09-30T09:00", "2025-09-30T09:30", "100", "99")).str("id")
	mustStatus(t, putJudgement(t, sep, map[string]any{"planFollowed": "no", "label": "mistake", "mistakeIds": []string{moved}}), 200)

	// viewing 30 Sep: the week holds both trades, the September month only the 30th
	row := counterRow(counter(t, "period=week&date=2025-09-30"), moved)
	if cell(row, "week", "total") != 2 || cell(row, "month", "total") != 1 {
		t.Errorf("crossing week: week %v month %v", row["week"], row["month"])
	}
	// and viewing 1 Oct: the October column holds only 1 Oct
	row = counterRow(counter(t, "period=week&date=2025-10-01"), moved)
	if cell(row, "week", "total") != 2 || cell(row, "month", "total") != 1 {
		t.Errorf("October: week %v month %v", row["week"], row["month"])
	}

	mustStatus(t, call(t, "POST", "/mistakes/"+over+"/retire", nil), 200)
	if counterRow(counter(t, "period=week&date=2025-10-01"), over) == nil {
		t.Error("a retired mistake with a count must stay in the counter")
	}
	if r := counterRow(counter(t, "period=week&date=2025-10-22"), over); r != nil {
		t.Errorf("a retired mistake without a count must not appear: %v", r)
	}
	mustStatus(t, call(t, "PUT", "/mistakes/"+moved, map[string]any{"name": "Moved the stop"}), 200)
	row = counterRow(counter(t, "period=week&date=2025-10-01"), moved)
	if row["name"] != "Moved the stop" || cell(row, "week", "total") != 2 {
		t.Errorf("after the rename: %v", row)
	}
}
