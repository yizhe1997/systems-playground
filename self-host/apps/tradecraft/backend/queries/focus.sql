-- name: GetFocus :one
SELECT body, updated_at FROM focus
 WHERE period = sqlc.arg(period)::text AND period_start = sqlc.arg(period_start)::date;

-- name: DayMistakes :many
SELECT m.id, m.name
  FROM day_mistake dm JOIN mistake m ON m.id = dm.mistake_id
 WHERE dm.account_id = sqlc.arg(account_id)::uuid AND dm.trading_day = sqlc.arg(day)::date
 ORDER BY m.name;

-- Creates the focus of a period, or replaces it when the caller's version token matches (a missing token never matches
-- an existing row): no row back means "changed elsewhere".
-- name: SaveFocus :one
INSERT INTO focus (period, period_start, body)
VALUES (sqlc.arg(period)::text, sqlc.arg(period_start)::date, sqlc.arg(body)::text)
ON CONFLICT (period, period_start) DO UPDATE SET body = EXCLUDED.body
 WHERE focus.updated_at = sqlc.narg(expected_updated_at)::timestamptz
RETURNING updated_at;

-- name: ClearFocus :execrows
DELETE FROM focus
 WHERE period = sqlc.arg(period)::text AND period_start = sqlc.arg(period_start)::date
   AND (sqlc.narg(expected_updated_at)::timestamptz IS NULL OR updated_at = sqlc.narg(expected_updated_at)::timestamptz);
