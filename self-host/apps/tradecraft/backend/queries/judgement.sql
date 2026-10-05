-- name: GetJudgement :one
SELECT plan_followed, label, updated_at FROM trade_judgement WHERE trade_id = sqlc.arg(trade_id)::uuid;

-- A live trade as the judge drawer and the day list show it.
-- name: GetDayTrade :one
SELECT d.id, d.account_id, d.instrument, d.direction, d.size, d.entry_at, d.exit_at, d.account_currency AS currency,
       d.net_result, d.risk, d.r_multiple, d.stop_price, d.dollars_per_point, t.thesis,
       j.plan_followed, j.label,
       coalesce((SELECT array_agg(m.name ORDER BY m.name) FROM trade_mistake tm JOIN mistake m ON m.id = tm.mistake_id
                  WHERE tm.trade_id = d.id), '{}')::text[] AS mistakes,
       (d.net_result < 0)::boolean AS is_loss,
       (d.net_result > 0)::boolean AS is_win
  FROM trade_detail d
  JOIN trade t ON t.id = d.id
  LEFT JOIN trade_judgement j ON j.trade_id = d.id
 WHERE d.id = sqlc.arg(id)::uuid AND NOT d.deleted;

-- Creates the judgement on the first save. An existing row is updated only when the caller's version token matches
-- (a missing token never matches an existing row): no row back means "changed elsewhere".
-- name: SaveJudgement :one
INSERT INTO trade_judgement (trade_id, plan_followed, label)
VALUES (sqlc.arg(trade_id)::uuid, sqlc.narg(plan_followed)::text, sqlc.narg(label)::text)
ON CONFLICT (trade_id) DO UPDATE
   SET plan_followed = EXCLUDED.plan_followed, label = EXCLUDED.label
 WHERE trade_judgement.updated_at = sqlc.narg(expected_updated_at)::timestamptz
RETURNING updated_at;

-- name: JudgementTagIDs :many
SELECT mistake_id FROM trade_mistake WHERE trade_id = sqlc.arg(trade_id)::uuid ORDER BY mistake_id;

-- name: CountUsableMistakes :one
SELECT count(*)::int AS usable FROM mistake WHERE id = ANY(sqlc.arg(ids)::uuid[]) AND retired_at IS NULL;

-- name: ClearTradeTags :exec
DELETE FROM trade_mistake WHERE trade_id = sqlc.arg(trade_id)::uuid;

-- name: AddTradeTag :exec
INSERT INTO trade_mistake (trade_id, mistake_id) VALUES (sqlc.arg(trade_id)::uuid, sqlc.arg(mistake_id)::uuid)
ON CONFLICT DO NOTHING;
