-- name: ListMistakes :many
SELECT id, name, stop_line, stop_period, (retired_at IS NOT NULL)::boolean AS retired, updated_at
  FROM mistake
 WHERE sqlc.arg(include_retired)::boolean OR retired_at IS NULL
 ORDER BY lower(name);

-- name: GetMistake :one
SELECT id, name, stop_line, stop_period, (retired_at IS NOT NULL)::boolean AS retired, updated_at
  FROM mistake WHERE id = sqlc.arg(id)::uuid;

-- The mistake that already has this name (case and spacing ignored), retired or not.
-- name: MistakeByName :one
SELECT id, (retired_at IS NOT NULL)::boolean AS retired
  FROM mistake
 WHERE lower(regexp_replace(btrim(name), '\s+', ' ', 'g')) = lower(sqlc.arg(name)::text);

-- name: InsertMistake :one
INSERT INTO mistake (name, stop_line, stop_period)
VALUES (sqlc.arg(name)::text, sqlc.narg(stop_line)::int, sqlc.narg(stop_period)::text)
RETURNING id;

-- name: UpdateMistake :one
UPDATE mistake
   SET name = sqlc.arg(name)::text,
       stop_line = sqlc.narg(stop_line)::int,
       stop_period = sqlc.narg(stop_period)::text
 WHERE id = sqlc.arg(id)::uuid
   AND (sqlc.narg(expected_updated_at)::timestamptz IS NULL OR updated_at = sqlc.narg(expected_updated_at)::timestamptz)
RETURNING id;

-- name: SetMistakeRetired :one
UPDATE mistake
   SET retired_at = CASE WHEN sqlc.arg(retire)::boolean THEN COALESCE(retired_at, now()) ELSE NULL END
 WHERE id = sqlc.arg(id)::uuid
RETURNING id;

-- name: ClearDayMistakes :exec
DELETE FROM day_mistake WHERE account_id = sqlc.arg(account_id)::uuid AND trading_day = sqlc.arg(day)::date;

-- name: AddDayMistake :exec
INSERT INTO day_mistake (account_id, trading_day, mistake_id)
VALUES (sqlc.arg(account_id)::uuid, sqlc.arg(day)::date, sqlc.arg(mistake_id)::uuid)
ON CONFLICT DO NOTHING;

-- Mistakes already recorded for a day (a retired one stays when it is already there).
-- name: DayMistakeIDs :many
SELECT mistake_id FROM day_mistake WHERE account_id = sqlc.arg(account_id)::uuid AND trading_day = sqlc.arg(day)::date;
