-- Identities (feature 002). Emails are stored lower case and trimmed; callers normalise before calling these.

-- name: IdentityByEmail :one
SELECT * FROM identity WHERE email = sqlc.arg(email)::text;

-- name: IdentityByID :one
SELECT * FROM identity WHERE id = sqlc.arg(id)::uuid;

-- name: ListIdentities :many
SELECT * FROM identity
 WHERE (sqlc.arg(status)::text = 'all')
    OR (sqlc.arg(status)::text = 'active' AND disabled_at IS NULL)
    OR (sqlc.arg(status)::text = 'disabled' AND disabled_at IS NOT NULL)
 ORDER BY added_at, id;

-- name: IdentityCounts :one
SELECT count(*)::int AS total,
       (count(*) FILTER (WHERE disabled_at IS NULL))::int AS active,
       (count(*) FILTER (WHERE disabled_at IS NOT NULL))::int AS disabled
  FROM identity;

-- name: CreateIdentity :one
INSERT INTO identity (email) VALUES (sqlc.arg(email)::text) RETURNING *;

-- Called on an identity's first accepted sign-in. Conditional on provider_sub IS NULL, so two concurrent first
-- sign-ins cannot both win: the loser sees zero rows affected and must read the identity again and compare.
-- name: PinIdentityProviderSub :execrows
UPDATE identity SET provider_sub = sqlc.arg(provider_sub)::text
 WHERE id = sqlc.arg(id)::uuid AND provider_sub IS NULL;

-- name: TouchIdentitySignIn :exec
UPDATE identity SET last_sign_in_at = now() WHERE id = sqlc.arg(id)::uuid;

-- Serialises every change that can affect how many identities are active, so "is this the last active one" and the
-- disable that follows cannot interleave with another disable. Released at commit or rollback.
-- name: LockIdentityChanges :exec
SELECT pg_advisory_xact_lock(7302);

-- name: DisableIdentity :one
UPDATE identity SET disabled_at = now() WHERE id = sqlc.arg(id)::uuid AND disabled_at IS NULL RETURNING *;

-- Enable never inserts: the email is unique, so a disabled identity's row keeps its address and enabling it is the
-- only way back.
-- name: EnableIdentity :one
UPDATE identity SET disabled_at = NULL WHERE id = sqlc.arg(id)::uuid AND disabled_at IS NOT NULL RETURNING *;

-- Sign-out: every session issued before this moment stops counting. clock_timestamp, so a sign-in a moment later
-- always gets a later time.
-- name: EndIdentitySessions :exec
UPDATE identity SET sessions_valid_after = clock_timestamp() WHERE id = sqlc.arg(id)::uuid;

-- The database clock in unix milliseconds: the time the API gives to sessions and confirmations.
-- name: DatabaseNowMillis :one
SELECT (extract(epoch FROM clock_timestamp()) * 1000)::bigint AS millis;
