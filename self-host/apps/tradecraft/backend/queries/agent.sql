-- Agent access (feature 003): the switch and the tokens. A token's value is never stored, only its SHA-256 as hex.

-- name: AgentAccessForUpdate :one
SELECT agent_access FROM journal_settings WHERE id = 1 FOR UPDATE;

-- name: GetAgentAccess :one
SELECT agent_access FROM journal_settings WHERE id = 1;

-- name: SetAgentAccess :exec
UPDATE journal_settings SET agent_access = sqlc.arg(enabled)::boolean WHERE id = 1;

-- name: ListAgentTokens :many
SELECT id, name, created_at, last_used_at, revoked_at
  FROM agent_token
 ORDER BY created_at DESC, id;

-- name: InsertAgentToken :one
INSERT INTO agent_token (name, token_hash, created_by)
VALUES (sqlc.arg(name)::text, sqlc.arg(token_hash)::text, sqlc.arg(created_by)::uuid)
RETURNING id, name, created_at, last_used_at, revoked_at;

-- Locks the row for the revoke.
-- name: AgentTokenForRevoke :one
SELECT id, name, created_at, last_used_at, revoked_at
  FROM agent_token WHERE id = sqlc.arg(id)::uuid FOR UPDATE;

-- name: RevokeAgentToken :one
UPDATE agent_token SET revoked_at = now()
 WHERE id = sqlc.arg(id)::uuid AND revoked_at IS NULL
RETURNING id, name, created_at, last_used_at, revoked_at;

-- The gate's lookup: a presented value is hashed and found by its hash, with its creator's state.
-- name: AgentTokenByHash :one
SELECT t.id, t.name, t.created_by, t.revoked_at, (i.disabled_at IS NOT NULL)::boolean AS creator_disabled
  FROM agent_token t JOIN identity i ON i.id = t.created_by
 WHERE t.token_hash = sqlc.arg(token_hash)::text;

-- name: TouchAgentToken :exec
UPDATE agent_token SET last_used_at = now() WHERE id = sqlc.arg(id)::uuid;
