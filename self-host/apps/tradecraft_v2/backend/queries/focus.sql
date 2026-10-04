-- name: GetFocus :one
SELECT body, updated_at FROM focus
 WHERE period = sqlc.arg(period)::text AND period_start = sqlc.arg(period_start)::date;

-- name: DayMistakes :many
SELECT m.id, m.name
  FROM day_mistake dm JOIN mistake m ON m.id = dm.mistake_id
 WHERE dm.account_id = sqlc.arg(account_id)::uuid AND dm.trading_day = sqlc.arg(day)::date
 ORDER BY m.name;
