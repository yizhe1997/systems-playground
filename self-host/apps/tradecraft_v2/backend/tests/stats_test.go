package tests

import "testing"

// The sample day of quickstart.md: net +45.00; plan followed 2 of 3 (1 not followed, 0 partly); mistakes 1;
// valid losses 1 of 2 losing trades; win rate 1 of 3.
func TestSampleDayFigures(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	judgeSample(t, s)
	rows := dayStats(t, s.acct, "2025-10-01", "2025-10-01")
	if len(rows) != 1 {
		t.Fatalf("%d rows", len(rows))
	}
	wantRow(t, "1 Oct", rows[0], dayRow{Trades: 3, Net: "45", Followed: 2, NotFollowed: 1, Tags: 1, ValidLosses: 1, Losses: 2, Wins: 1})
}

func TestUnjudgedTradesAreCountedSeparately(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	judge(t, s.w, "yes", "")
	// L1 and L2 are not judged yet
	rows := dayStats(t, s.acct, "2025-10-01", "2025-10-01")
	wantRow(t, "unjudged", rows[0], dayRow{Trades: 3, Net: "45", Followed: 1, NotJudged: 2, Losses: 2, Wins: 1})
	// the parts add up to the whole
	r := rows[0]
	if r.Followed+r.Partly+r.NotFollowed+r.NotJudged != r.Trades {
		t.Errorf("parts do not add up: %+v", r)
	}
}

func TestPartlyIsNeverFollowed(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	judge(t, s.w, "partly", "")
	judge(t, s.l1, "yes", "")
	judge(t, s.l2, "no", "")
	wantRow(t, "partly", dayStats(t, s.acct, "2025-10-01", "2025-10-01")[0],
		dayRow{Trades: 3, Net: "45", Followed: 1, Partly: 1, NotFollowed: 1, Losses: 2, Wins: 1})
}

func TestBreakEvenIsNeitherWinNorLoss(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "")
	be := trade(t, sampleTrade(acct, "2025-10-01T09:00", "2025-10-01T09:30", "100", "100"))
	wantNum(t, "net", be.str("netResult"), "0")
	judge(t, be.str("id"), "yes", "mistake")
	wantRow(t, "break-even", dayStats(t, acct, "2025-10-01", "2025-10-01")[0], dayRow{Trades: 1, Net: "0", Followed: 1})
}

func TestEmptyDayAndEmptyWeekHaveNoNumbers(t *testing.T) {
	reset(t)
	acct := account(t, "A", "USD", "")
	if rows := dayStats(t, acct, "2025-10-01", "2025-10-01"); len(rows) != 0 {
		t.Errorf("a day with nothing returned %d rows", len(rows))
	}
	// a week with nothing: one row of zeros, and the net result is null (a dash, not zero)
	wantRow(t, "empty week", periodStats(t, acct, "2025-09-29", "2025-10-05"), dayRow{})
}

func TestWeekIsTheSumOfItsDays(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	judgeSample(t, s)
	mon := trade(t, sampleTrade(s.acct, "2025-09-29T09:00", "2025-09-29T09:30", "21000.00", "21006.00")) // +120
	judge(t, mon.str("id"), "yes", "")
	week := periodStats(t, s.acct, "2025-09-29", "2025-10-05")
	wantRow(t, "week", week, dayRow{Trades: 4, Net: "165", Followed: 3, NotFollowed: 1, Tags: 1, ValidLosses: 1, Losses: 2, Wins: 2})
	var sum dayRow
	for _, d := range dayStats(t, s.acct, "2025-09-29", "2025-10-05") {
		sum.Trades += d.Trades
		sum.Followed += d.Followed
		sum.Tags += d.Tags
	}
	if sum.Trades != week.Trades || sum.Followed != week.Followed || sum.Tags != week.Tags {
		t.Errorf("week %+v differs from the sum of its days %+v", week, sum)
	}
}

func TestSoftDeletedTradesNeverCount(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	judgeSample(t, s)
	mustStatus(t, call(t, "DELETE", "/trades/"+s.l2, nil), 200)
	// L2 carried the only mistake tag and a "no" answer
	wantRow(t, "after delete", dayStats(t, s.acct, "2025-10-01", "2025-10-01")[0],
		dayRow{Trades: 2, Net: "175", Followed: 2, ValidLosses: 1, Losses: 1, Wins: 1})
	mustStatus(t, call(t, "POST", "/trades/"+s.l2+"/restore", nil), 200)
	wantRow(t, "after restore", dayStats(t, s.acct, "2025-10-01", "2025-10-01")[0],
		dayRow{Trades: 3, Net: "45", Followed: 2, NotFollowed: 1, Tags: 1, ValidLosses: 1, Losses: 2, Wins: 1})
}

func TestDayLevelMistakesCountOncePerRecord(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	judgeSample(t, s) // Chased entry tagged on L2
	// the same mistake recorded for the whole day is a second record
	exec(t, `INSERT INTO day_mistake (account_id, trading_day, mistake_id) SELECT $1, '2025-10-01', id FROM mistake WHERE name = 'Chased entry'`, s.acct)
	exec(t, `INSERT INTO day_mistake (account_id, trading_day, mistake_id) SELECT $1, '2025-10-01', id FROM mistake WHERE name = 'Oversized'`, s.acct)
	if got := dayStats(t, s.acct, "2025-10-01", "2025-10-01")[0].Tags; got != 3 {
		t.Errorf("mistakes = %d, want 3 (one tag and two whole-day records)", got)
	}
	// a whole-day record on a day with no trades still appears, with zero trades
	exec(t, `INSERT INTO day_mistake (account_id, trading_day, mistake_id) SELECT $1, '2025-10-02', id FROM mistake WHERE name = 'Moved stop'`, s.acct)
	rows := dayStats(t, s.acct, "2025-10-02", "2025-10-02")
	if len(rows) != 1 || rows[0].Trades != 0 || rows[0].Tags != 1 || rows[0].Net != "" {
		t.Errorf("whole-day record on an empty day: %+v", rows)
	}
	// the same record twice is impossible (one per mistake per day)
	if _, err := pool.Exec(contextBG(), `INSERT INTO day_mistake (account_id, trading_day, mistake_id) SELECT $1, '2025-10-02', id FROM mistake WHERE name = 'Moved stop'`, s.acct); err == nil {
		t.Error("a second record for the same mistake and day was accepted")
	}
}

type countRow struct {
	Name           string
	Account        string
	OnTrades, OnDays int
}

func counts(t *testing.T, from, to, acct string) map[string]countRow {
	t.Helper()
	var a any
	if acct != "" {
		a = acct
	}
	rows, err := pool.Query(contextBG(), `
		SELECT m.name, a.name, c.on_trades, c.on_days
		  FROM mistake_counts($1::date, $2::date, $3::uuid) c
		  JOIN mistake m ON m.id = c.mistake_id JOIN account a ON a.id = c.account_id`, from, to, a)
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	out := map[string]countRow{}
	for rows.Next() {
		var r countRow
		if err := rows.Scan(&r.Name, &r.Account, &r.OnTrades, &r.OnDays); err != nil {
			t.Fatal(err)
		}
		out[r.Name+"|"+r.Account] = r
	}
	return out
}

func TestMistakeCountsSplitByAccountAndKind(t *testing.T) {
	reset(t)
	s := sampleDay(t)
	judgeSample(t, s) // Chased entry x1 on a trade of Funded 50K
	other := account(t, "Practice", "USD", "")
	p := trade(t, sampleTrade(other, "2025-10-02T09:00", "2025-10-02T09:30", "100", "99"))
	judge(t, p.str("id"), "no", "mistake", "Chased entry")
	exec(t, `INSERT INTO day_mistake (account_id, trading_day, mistake_id) SELECT $1, '2025-10-02', id FROM mistake WHERE name = 'Chased entry'`, other)

	all := counts(t, "2025-09-29", "2025-10-05", "")
	if r := all["Chased entry|Funded 50K"]; r.OnTrades != 1 || r.OnDays != 0 {
		t.Errorf("Funded: %+v", r)
	}
	if r := all["Chased entry|Practice"]; r.OnTrades != 1 || r.OnDays != 1 {
		t.Errorf("Practice: %+v (one tag and one whole-day record are two records)", r)
	}
	one := counts(t, "2025-09-29", "2025-10-05", other)
	if len(one) != 1 {
		t.Errorf("one account: %v", one)
	}
	// outside the period nothing counts; a deleted trade does not count and comes back on restore
	if got := counts(t, "2025-10-06", "2025-10-12", ""); len(got) != 0 {
		t.Errorf("next week: %v", got)
	}
	mustStatus(t, call(t, "DELETE", "/trades/"+s.l2, nil), 200)
	if r := counts(t, "2025-09-29", "2025-10-05", "")["Chased entry|Funded 50K"]; r.OnTrades != 0 {
		t.Errorf("deleted trade still counted: %+v", r)
	}
	mustStatus(t, call(t, "POST", "/trades/"+s.l2+"/restore", nil), 200)
	if r := counts(t, "2025-09-29", "2025-10-05", "")["Chased entry|Funded 50K"]; r.OnTrades != 1 {
		t.Errorf("restored trade not counted: %+v", r)
	}
}
