package tests

import "testing"

// The rules the database holds whoever writes (data-model.md).

func TestValidLossNeedsPlanYes(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	for _, plan := range []string{"no", "partly", ""} {
		if _, err := pool.Exec(contextBG(), `INSERT INTO trade_judgement (trade_id, plan_followed, label) VALUES ($1, NULLIF($2, ''), 'valid_loss')`, s.l1, plan); err == nil {
			t.Errorf("valid_loss was accepted with plan %q", plan)
		}
	}
	judge(t, s.l1, "yes", "valid_loss") // allowed
	// answering something else afterwards, with the label still set, is refused as well
	if _, err := pool.Exec(contextBG(), `UPDATE trade_judgement SET plan_followed = 'partly' WHERE trade_id = $1`, s.l1); err == nil {
		t.Error("changing the answer under a valid_loss label was accepted")
	}
	if _, err := pool.Exec(contextBG(), `INSERT INTO trade_judgement (trade_id, plan_followed) VALUES ($1, 'sometimes')`, s.w); err == nil {
		t.Error("an unknown plan answer was accepted")
	}
}

func TestValidLossIsClearedWhenALossBecomesAWin(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	judge(t, s.l1, "yes", "valid_loss")
	if got := scalar(t, `(SELECT label FROM trade_judgement WHERE trade_id = $1)`, s.l1); got != "valid_loss" {
		t.Fatalf("before the edit: %q", got)
	}
	// edit L1 through the trade API so that it wins: exit above entry
	r := call(t, "GET", "/trades/"+s.l1, nil)
	in := sampleTrade(s.acct, "2025-10-01T10:14", "2025-10-01T10:31", "21500.00", "21501.00")
	in["expectedUpdatedAt"] = r.str("updatedAt")
	mustStatus(t, call(t, "PUT", "/trades/"+s.l1, in), 200)
	if got := scalar(t, `(SELECT label FROM trade_judgement WHERE trade_id = $1)`, s.l1); got != "" {
		t.Errorf("the valid-loss label survived the edit: %q", got)
	}
	// the plan answer is kept: only the label is cleared
	if got := scalar(t, `(SELECT plan_followed FROM trade_judgement WHERE trade_id = $1)`, s.l1); got != "yes" {
		t.Errorf("the plan answer was lost: %q", got)
	}
}

func TestJudgementKeptThroughDeleteAndRestore(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	judgeSample(t, s)
	mustStatus(t, call(t, "DELETE", "/trades/"+s.l2, nil), 200)
	mustStatus(t, call(t, "POST", "/trades/"+s.l2+"/restore", nil), 200)
	if got := scalar(t, `(SELECT plan_followed || '/' || label FROM trade_judgement WHERE trade_id = $1)`, s.l2); got != "no/mistake" {
		t.Errorf("judgement after restore: %q", got)
	}
	if got := scalar(t, `(SELECT count(*) FROM trade_mistake WHERE trade_id = $1)`, s.l2); got != "1" {
		t.Errorf("tags after restore: %s", got)
	}
}

func TestATradeCarriesAMistakeOnce(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	judge(t, s.l2, "no", "mistake", "Chased entry")
	if _, err := pool.Exec(contextBG(), `INSERT INTO trade_mistake (trade_id, mistake_id) SELECT $1, id FROM mistake WHERE name = 'Chased entry'`, s.l2); err == nil {
		t.Error("the same mistake was tagged twice on one trade")
	}
}

func TestMistakeRules(t *testing.T) {
	reset(t)
	// the five starters are there once
	if got := scalar(t, `(SELECT count(*) FROM mistake)`); got != "5" {
		t.Errorf("starter mistakes: %s", got)
	}
	bad := map[string]string{
		"stop line 0":                 `INSERT INTO mistake (name, stop_line, stop_period) VALUES ('X', 0, 'week')`,
		"stop line 1000":              `INSERT INTO mistake (name, stop_line, stop_period) VALUES ('X', 1000, 'week')`,
		"stop line without a period":  `INSERT INTO mistake (name, stop_line) VALUES ('X', 3)`,
		"period without a stop line":  `INSERT INTO mistake (name, stop_period) VALUES ('X', 'week')`,
		"unknown period":              `INSERT INTO mistake (name, stop_line, stop_period) VALUES ('X', 3, 'year')`,
		"empty name":                  `INSERT INTO mistake (name) VALUES ('')`,
		"name over 60":                `INSERT INTO mistake (name) VALUES (repeat('a', 61))`,
		"name with a double space":    `INSERT INTO mistake (name) VALUES ('a  b')`,
		"name already used, any case": `INSERT INTO mistake (name) VALUES ('MOVED STOP')`,
	}
	for name, q := range bad {
		if _, err := pool.Exec(contextBG(), q); err == nil {
			t.Errorf("%s was accepted", name)
		}
	}
	exec(t, `INSERT INTO mistake (name, stop_line, stop_period) VALUES ('Averaged down', 999, 'month')`)
	// a retired mistake keeps its name taken
	exec(t, `UPDATE mistake SET retired_at = now() WHERE name = 'Averaged down'`)
	if _, err := pool.Exec(contextBG(), `INSERT INTO mistake (name) VALUES ('averaged DOWN')`); err == nil {
		t.Error("the name of a retired mistake was reused")
	}
}

func TestReviewAndFocusRules(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "")
	bad := map[string]string{
		"grade 0":             `INSERT INTO daily_review (account_id, trading_day, mental_grade) VALUES ($1, '2025-10-01', 0)`,
		"grade 6":             `INSERT INTO daily_review (account_id, trading_day, technical_grade) VALUES ($1, '2025-10-01', 6)`,
		"answer over 2000":    `INSERT INTO daily_review (account_id, trading_day, did_well) VALUES ($1, '2025-10-01', repeat('x', 2001))`,
		"focus empty":         `INSERT INTO focus (period, period_start, body) VALUES ('week', '2025-09-29', '')`,
		"focus over 280":      `INSERT INTO focus (period, period_start, body) VALUES ('week', '2025-09-29', repeat('x', 281))`,
		"week not a Monday":   `INSERT INTO focus (period, period_start, body) VALUES ('week', '2025-10-01', 'x')`,
		"month not the first": `INSERT INTO focus (period, period_start, body) VALUES ('month', '2025-10-02', 'x')`,
		"unknown period":      `INSERT INTO focus (period, period_start, body) VALUES ('year', '2025-01-01', 'x')`,
	}
	for name, q := range bad {
		var err error
		if name[:5] == "focus" || name[:4] == "week" || name[:5] == "month" || name[:7] == "unknown" {
			_, err = pool.Exec(contextBG(), q)
		} else {
			_, err = pool.Exec(contextBG(), q, acct)
		}
		if err == nil {
			t.Errorf("%s was accepted", name)
		}
	}
	exec(t, `INSERT INTO focus (period, period_start, body) VALUES ('week', '2025-09-29', repeat('x', 280)), ('month', '2025-10-01', 'Grade every trade')`)
	exec(t, `INSERT INTO daily_review (account_id, trading_day, mental_grade, technical_grade, did_well) VALUES ($1, '2025-10-01', 1, 5, repeat('x', 2000))`, acct)
}
