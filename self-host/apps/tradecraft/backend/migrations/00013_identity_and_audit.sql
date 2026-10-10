-- +goose Up

-- Identity: one email address that counts as the owner. Never deleted. There is no owner column anywhere else:
-- the app has one owner and every identity is that person (specs/002-sign-in-and-audit-log/data-model.md).
CREATE TABLE identity (
    id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    email                text        NOT NULL,
    provider             text        NOT NULL DEFAULT 'google',
    -- the provider's stable account identifier, set once at the first accepted sign-in and never changed after
    provider_sub         text,
    added_at             timestamptz NOT NULL DEFAULT now(),
    last_sign_in_at      timestamptz,
    disabled_at          timestamptz,
    -- sign-out sets this; a session issued earlier no longer counts
    sessions_valid_after timestamptz NOT NULL DEFAULT to_timestamp(0),
    -- stored already normalised: the application trims and lower-cases before every compare and insert
    CONSTRAINT identity_email_clean CHECK (
        email = lower(btrim(email))
        AND char_length(email) <= 254
        AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    ),
    CONSTRAINT identity_email_unique UNIQUE (email)
);

-- +goose StatementBegin
CREATE FUNCTION identity_refuse_removal() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'identities are never deleted';
END $$;
-- +goose StatementEnd

CREATE TRIGGER identity_no_delete BEFORE DELETE ON identity
    FOR EACH ROW EXECUTE FUNCTION identity_refuse_removal();
CREATE TRIGGER identity_no_truncate BEFORE TRUNCATE ON identity
    FOR EACH STATEMENT EXECUTE FUNCTION identity_refuse_removal();

-- Audit entry: one appended record of one sensitive action. Never edited, never deleted. It holds no money, no
-- notes or review text, no address and no secret (the subject and the field names are chosen by code).
CREATE TABLE audit_entry (
    id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    at             timestamptz NOT NULL DEFAULT clock_timestamp(),
    -- owner: a signed-in person; agent: reserved for the agent features (it acts for an identity);
    -- system: no signed-in identity (a refused sign-in, the start-up recovery)
    actor_kind     text        NOT NULL,
    identity_id    uuid        REFERENCES identity (id) ON DELETE RESTRICT,
    kind           text        NOT NULL,
    subject        text        NOT NULL DEFAULT '',
    changed_fields text[]      NOT NULL DEFAULT '{}',
    CONSTRAINT audit_actor_kind CHECK (actor_kind IN ('owner', 'agent', 'system')),
    CONSTRAINT audit_actor_identity CHECK (actor_kind = 'system' OR identity_id IS NOT NULL),
    CONSTRAINT audit_kind_shape CHECK (kind ~ '^[a-z][a-z_]*$'),
    CONSTRAINT audit_subject_length CHECK (char_length(subject) <= 254)
);

CREATE INDEX audit_entry_at_idx ON audit_entry (at DESC, id DESC);
CREATE INDEX audit_entry_identity_idx ON audit_entry (identity_id, at DESC);
CREATE INDEX audit_entry_kind_idx ON audit_entry (kind, at DESC);

-- +goose StatementBegin
CREATE FUNCTION audit_entry_refuse_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'audit entries cannot be changed or removed';
END $$;
-- +goose StatementEnd

CREATE TRIGGER audit_entry_no_change BEFORE UPDATE OR DELETE ON audit_entry
    FOR EACH ROW EXECUTE FUNCTION audit_entry_refuse_change();
CREATE TRIGGER audit_entry_no_truncate BEFORE TRUNCATE ON audit_entry
    FOR EACH STATEMENT EXECUTE FUNCTION audit_entry_refuse_change();

-- +goose Down
DROP TABLE audit_entry;
DROP FUNCTION audit_entry_refuse_change();
DROP TABLE identity;
DROP FUNCTION identity_refuse_removal();
