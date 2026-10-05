-- The day start travels as 'HH:MM' text; the empty string means none.

-- name: ListAccounts :many
SELECT id, name, currency, COALESCE(to_char(trading_day_start, 'HH24:MI'), '')::text AS trading_day_start,
       (archived_at IS NOT NULL)::boolean AS archived, updated_at
  FROM account
 WHERE sqlc.arg(include_archived)::boolean OR archived_at IS NULL
 ORDER BY lower(name), id;

-- name: GetAccount :one
SELECT id, name, currency, COALESCE(to_char(trading_day_start, 'HH24:MI'), '')::text AS trading_day_start,
       (archived_at IS NOT NULL)::boolean AS archived, updated_at
  FROM account WHERE id = sqlc.arg(id)::uuid;

-- name: InsertAccount :one
INSERT INTO account (name, currency, trading_day_start)
VALUES (sqlc.arg(name)::text, sqlc.arg(currency)::text, NULLIF(sqlc.arg(trading_day_start)::text, '')::time)
RETURNING id;

-- name: UpdateAccount :one
UPDATE account
   SET name = sqlc.arg(name)::text,
       currency = sqlc.arg(currency)::text,
       trading_day_start = NULLIF(sqlc.arg(trading_day_start)::text, '')::time
 WHERE id = sqlc.arg(id)::uuid
   AND (sqlc.narg(expected_updated_at)::timestamptz IS NULL OR updated_at = sqlc.narg(expected_updated_at)::timestamptz)
RETURNING id;

-- name: ArchiveAccount :one
UPDATE account SET archived_at = COALESCE(archived_at, now()) WHERE id = sqlc.arg(id)::uuid RETURNING id;

-- name: RestoreAccount :one
UPDATE account SET archived_at = NULL WHERE id = sqlc.arg(id)::uuid RETURNING id;
