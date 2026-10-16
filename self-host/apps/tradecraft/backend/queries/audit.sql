-- The audit log (feature 002). One append-only table: nothing here updates or deletes an entry, and the database
-- refuses it as well.

-- name: InsertAuditEntry :exec
INSERT INTO audit_entry (actor_kind, identity_id, kind, subject, changed_fields, actor_label)
VALUES (sqlc.arg(actor_kind)::text, sqlc.narg(identity_id)::uuid, sqlc.arg(kind)::text,
        sqlc.arg(subject)::text, sqlc.arg(changed_fields)::text[], sqlc.arg(actor_label)::text);

-- Newest first. The identity filter is an identity id, or 'none' for entries with no signed-in identity. The period
-- is given as instants (the start of the first day and the start of the day after the last, in the journal zone).
-- name: ListAudit :many
SELECT a.id, a.at, a.actor_kind, a.kind, a.subject, a.changed_fields, a.actor_label, i.email AS identity_email
  FROM audit_entry a LEFT JOIN identity i ON i.id = a.identity_id
 WHERE (sqlc.narg(identity)::text IS NULL
        OR (sqlc.narg(identity)::text = 'none' AND a.identity_id IS NULL)
        OR a.identity_id::text = sqlc.narg(identity)::text)
   AND (sqlc.narg(kind)::text IS NULL OR a.kind = sqlc.narg(kind)::text)
   AND (sqlc.narg(from_at)::timestamptz IS NULL OR a.at >= sqlc.narg(from_at)::timestamptz)
   AND (sqlc.narg(to_at)::timestamptz IS NULL OR a.at < sqlc.narg(to_at)::timestamptz)
 ORDER BY a.at DESC, a.id DESC
 LIMIT sqlc.arg(row_limit)::int OFFSET sqlc.arg(row_offset)::int;

-- name: CountAudit :one
SELECT count(*)::int AS total
  FROM audit_entry a
 WHERE (sqlc.narg(identity)::text IS NULL
        OR (sqlc.narg(identity)::text = 'none' AND a.identity_id IS NULL)
        OR a.identity_id::text = sqlc.narg(identity)::text)
   AND (sqlc.narg(kind)::text IS NULL OR a.kind = sqlc.narg(kind)::text)
   AND (sqlc.narg(from_at)::timestamptz IS NULL OR a.at >= sqlc.narg(from_at)::timestamptz)
   AND (sqlc.narg(to_at)::timestamptz IS NULL OR a.at < sqlc.narg(to_at)::timestamptz);

-- The export: identities without their provider subject, and every entry.
-- name: ExportIdentities :many
SELECT id, email, provider, added_at, last_sign_in_at, disabled_at FROM identity ORDER BY added_at, id;

-- name: ExportAuditEntries :many
SELECT a.id, a.at, a.actor_kind, i.email AS identity_email, a.kind, a.subject, a.changed_fields, a.actor_label
  FROM audit_entry a LEFT JOIN identity i ON i.id = a.identity_id
 ORDER BY a.at, a.id;
