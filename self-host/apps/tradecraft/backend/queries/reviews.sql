-- name: AccountToday :one
SELECT account_today(sqlc.arg(account_id)::uuid)::date AS today;

-- name: Bounds :one
SELECT week_start(sqlc.arg(day)::date)::date AS week_start,
       (week_start(sqlc.arg(day)::date) + 6)::date AS week_end,
       date_trunc('month', sqlc.arg(day)::date::timestamp)::date AS month_start,
       (date_trunc('month', sqlc.arg(day)::date::timestamp) + interval '1 month - 1 day')::date AS month_end;

-- name: DayState :one
SELECT coalesce(day_state(sqlc.arg(account_id)::uuid, sqlc.arg(day)::date), '')::text AS state;

-- name: WeekState :one
SELECT week_state(sqlc.arg(account_id)::uuid, sqlc.arg(week_start)::date)::text AS state;

-- name: GetDailyReview :one
SELECT account_id, trading_day, did_well, could_improve, next_focus, mental_grade, technical_grade,
       reviewed_at, edited_at, updated_at
  FROM daily_review
 WHERE account_id = sqlc.arg(account_id)::uuid AND trading_day = sqlc.arg(day)::date;

-- Creates the review on the first save. An existing row is updated only when the caller's version token matches
-- (a missing token never matches an existing row): no row back means "changed elsewhere".
-- name: SaveDailyReview :one
INSERT INTO daily_review (account_id, trading_day, did_well, could_improve, next_focus, mental_grade, technical_grade, reviewed_at)
VALUES (sqlc.arg(account_id)::uuid, sqlc.arg(day)::date, sqlc.arg(did_well)::text, sqlc.arg(could_improve)::text,
        sqlc.arg(next_focus)::text, sqlc.narg(mental_grade)::smallint, sqlc.narg(technical_grade)::smallint,
        CASE WHEN sqlc.arg(mark_reviewed)::boolean THEN now() END)
ON CONFLICT (account_id, trading_day) DO UPDATE
   SET did_well = EXCLUDED.did_well,
       could_improve = EXCLUDED.could_improve,
       next_focus = EXCLUDED.next_focus,
       mental_grade = EXCLUDED.mental_grade,
       technical_grade = EXCLUDED.technical_grade,
       edited_at = CASE WHEN daily_review.reviewed_at IS NOT NULL THEN now() ELSE daily_review.edited_at END,
       reviewed_at = CASE WHEN sqlc.arg(mark_reviewed)::boolean THEN coalesce(daily_review.reviewed_at, now())
                          ELSE daily_review.reviewed_at END
 WHERE daily_review.updated_at = sqlc.narg(expected_updated_at)::timestamptz
RETURNING updated_at;

-- The nearest earlier answer to "what will I focus on next session" from the same account.
-- name: YesterdayFocus :one
SELECT trading_day, next_focus
  FROM daily_review
 WHERE account_id = sqlc.arg(account_id)::uuid AND trading_day < sqlc.arg(day)::date AND next_focus <> ''
 ORDER BY trading_day DESC
 LIMIT 1;

-- Trades of the day changed (edited, deleted, or added) after the review was marked reviewed.
-- name: TradesChangedAfter :one
SELECT count(*)::int AS changed
  FROM trade
 WHERE account_id = sqlc.arg(account_id)::uuid AND trading_day = sqlc.arg(day)::date
   AND updated_at > sqlc.arg(after)::timestamptz;

-- The live trades of a day with their judgement and tags.
-- name: DayTrades :many
SELECT d.id, d.instrument, d.direction, d.size, d.entry_at, d.exit_at, d.account_currency AS currency,
       d.net_result, d.risk, d.r_multiple, d.stop_price, d.dollars_per_point, t.thesis,
       j.plan_followed, j.label,
       coalesce((SELECT array_agg(m.name ORDER BY m.name) FROM trade_mistake tm JOIN mistake m ON m.id = tm.mistake_id
                  WHERE tm.trade_id = d.id), '{}')::text[] AS mistakes
  FROM trade_detail d
  JOIN trade t ON t.id = d.id
  LEFT JOIN trade_judgement j ON j.trade_id = d.id
 WHERE d.account_id = sqlc.arg(account_id)::uuid AND d.trading_day = sqlc.arg(day)::date AND NOT d.deleted
 ORDER BY d.exit_at, d.id;

-- The weeks (Monday dates) whose Sunday falls in a month, newest first.
-- name: WeeksEndingIn :many
SELECT (g.d::date - 6)::date AS week_start
  FROM generate_series(sqlc.arg(month_start)::date, sqlc.arg(month_end)::date, interval '1 day') AS g(d)
 WHERE extract(isodow FROM g.d) = 7
 ORDER BY g.d DESC;

-- name: WeekMark :one
SELECT reviewed_at FROM weekly_review_mark
 WHERE account_id = sqlc.arg(account_id)::uuid AND week_start = sqlc.arg(week_start)::date;

-- Days of a month marked for the day picker, and the week states for the week picker.
-- name: CalendarDays :many
SELECT t.trading_day::date AS day, coalesce(day_state(sqlc.arg(account_id)::uuid, t.trading_day) = 'missing', false)::boolean AS missing
  FROM (SELECT DISTINCT trading_day FROM trade
         WHERE account_id = sqlc.arg(account_id)::uuid AND deleted_at IS NULL
           AND trading_day BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date) t
 ORDER BY t.trading_day;

-- The months that have live trades or a saved review for the account (the month list), newest first.
-- name: MonthsWithActivity :many
SELECT to_char(x.trading_day, 'YYYY-MM')::text AS month
  FROM (SELECT trading_day FROM trade WHERE account_id = sqlc.arg(account_id)::uuid AND deleted_at IS NULL
        UNION
        SELECT trading_day FROM daily_review WHERE account_id = sqlc.arg(account_id)::uuid) x
 GROUP BY 1
 ORDER BY 1 DESC;

-- The saved daily reviews of an account over a range (the weekly review reads them, never copies them).
-- name: ReviewsInRange :many
SELECT trading_day, did_well, could_improve, next_focus, mental_grade, technical_grade
  FROM daily_review
 WHERE account_id = sqlc.arg(account_id)::uuid AND trading_day BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date;

-- Marking a week reviewed again changes nothing (the first time stays).
-- name: MarkWeek :exec
INSERT INTO weekly_review_mark (account_id, week_start)
VALUES (sqlc.arg(account_id)::uuid, sqlc.arg(week_start)::date)
ON CONFLICT DO NOTHING;
