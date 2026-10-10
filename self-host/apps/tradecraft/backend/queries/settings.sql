-- name: GetSettings :one
SELECT time_zone, updated_at FROM journal_settings WHERE id = 1;

-- name: UpdateSettings :one
UPDATE journal_settings SET time_zone = sqlc.arg(time_zone)::text WHERE id = 1
RETURNING time_zone, updated_at;

-- name: SettingsForUpdate :one
SELECT time_zone FROM journal_settings WHERE id = 1 FOR UPDATE;
