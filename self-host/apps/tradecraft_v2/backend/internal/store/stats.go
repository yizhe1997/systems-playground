package store

import (
	"context"
	"time"
)

// sqlc cannot read the columns of the table-returning SQL functions (day_stats, period_stats), so the two queries
// that call them are written by hand here. The figures themselves are still defined only in migration 00010.

// Stats are the figures of a day or of a week; NetResult is nil when there are no trades.
type Stats struct {
	Trades      int32
	NetResult   *string
	Followed    int32
	Partly      int32
	NotFollowed int32
	NotJudged   int32
	MistakeTags int32
	ValidLosses int32
	Losses      int32
	Wins        int32
	WinPercent  *int32 // 100 * wins / trades rounded half up; nil when there are no trades
}

// PeriodStats sums the figures of an account over a range of trading days (one day, or a week).
func (q *Queries) PeriodStats(ctx context.Context, accountID string, from, to time.Time) (Stats, error) {
	var s Stats
	err := q.db.QueryRow(ctx, `
		SELECT trades, net_result::text, followed, partly, not_followed, not_judged, mistake_tags, valid_losses, losses, wins,
		       CASE WHEN trades > 0 THEN floor(100.0 * wins / trades + 0.5)::int END
		  FROM period_stats($1::uuid, $2::date, $3::date)`, accountID, from, to).
		Scan(&s.Trades, &s.NetResult, &s.Followed, &s.Partly, &s.NotFollowed, &s.NotJudged, &s.MistakeTags, &s.ValidLosses, &s.Losses, &s.Wins, &s.WinPercent)
	return s, err
}

// ListedDay is a day worth listing in the Reviews screen, with its figures and state ("" when it has none).
type ListedDay struct {
	Day   time.Time
	Stats Stats
	State string
}

// ListDays returns every day of the range that has live trades, a whole-day mistake record, or a saved review,
// newest first.
func (q *Queries) ListDays(ctx context.Context, accountID string, from, to time.Time) ([]ListedDay, error) {
	rows, err := q.db.Query(ctx, `
		WITH s AS (SELECT * FROM day_stats($1::uuid, $2::date, $3::date)),
		     r AS (SELECT trading_day FROM daily_review WHERE account_id = $1::uuid AND trading_day BETWEEN $2::date AND $3::date),
		     d AS (SELECT trading_day FROM s UNION SELECT trading_day FROM r)
		SELECT d.trading_day::date, coalesce(s.trades, 0), s.net_result::text, coalesce(s.followed, 0), coalesce(s.partly, 0),
		       coalesce(s.not_followed, 0), coalesce(s.not_judged, 0), coalesce(s.mistake_tags, 0),
		       coalesce(s.valid_losses, 0), coalesce(s.losses, 0), coalesce(s.wins, 0),
		       coalesce(day_state($1::uuid, d.trading_day), '')
		  FROM d LEFT JOIN s ON s.trading_day = d.trading_day
		 ORDER BY d.trading_day DESC`, accountID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []ListedDay
	for rows.Next() {
		var d ListedDay
		if err := rows.Scan(&d.Day, &d.Stats.Trades, &d.Stats.NetResult, &d.Stats.Followed, &d.Stats.Partly, &d.Stats.NotFollowed,
			&d.Stats.NotJudged, &d.Stats.MistakeTags, &d.Stats.ValidLosses, &d.Stats.Losses, &d.Stats.Wins, &d.State); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// MistakeCount is how many records of one mistake a range holds (tags on live trades plus whole-day records).
type MistakeCount struct {
	MistakeID string
	Name      string
	Count     int32
}

// MistakeBreakdown lists the mistakes of an account over a range, most frequent first.
func (q *Queries) MistakeBreakdown(ctx context.Context, accountID string, from, to time.Time) ([]MistakeCount, error) {
	rows, err := q.db.Query(ctx, `
		SELECT m.id::text, m.name, sum(c.on_trades + c.on_days)::int
		  FROM mistake_counts($2::date, $3::date, $1::uuid) c JOIN mistake m ON m.id = c.mistake_id
		 GROUP BY m.id, m.name
		 ORDER BY 3 DESC, m.name`, accountID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []MistakeCount
	for rows.Next() {
		var c MistakeCount
		if err := rows.Scan(&c.MistakeID, &c.Name, &c.Count); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}
