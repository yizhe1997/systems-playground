-- +goose Up
-- Feature 003, user stories 2 and 3: agent access. One switch for the whole journal (off until the owner turns it
-- on), named read-only tokens that are only ever revoked, and a label on audit entries so an agent's entry names the
-- token that made it.

ALTER TABLE journal_settings ADD COLUMN agent_access boolean NOT NULL DEFAULT false;

-- A token is a name and the SHA-256 of its value (lower-case hex). The value itself is shown once, at creation, and
-- is never stored. A token is never deleted and a revoke is final.
CREATE TABLE agent_token (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name         text        NOT NULL,
    token_hash   text        NOT NULL UNIQUE,
    created_by   uuid        NOT NULL REFERENCES identity (id) ON DELETE RESTRICT,
    created_at   timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz,
    revoked_at   timestamptz,
    -- 1 to 60 characters after trimming, each run of spaces collapsed to one (the API does that on the way in)
    CONSTRAINT agent_token_name_clean CHECK (
        char_length(name) BETWEEN 1 AND 60
        AND name = regexp_replace(btrim(name), '\s+', ' ', 'g')
    )
);

-- unique ignoring case and surrounding spaces, revoked tokens included
CREATE UNIQUE INDEX agent_token_name_unique ON agent_token (lower(regexp_replace(btrim(name), '\s+', ' ', 'g')));

-- +goose StatementBegin
CREATE FUNCTION agent_token_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at THEN
            RAISE EXCEPTION 'a revoked agent token stays revoked';
        END IF;
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'agent tokens are never deleted';
END $$;
-- +goose StatementEnd

CREATE TRIGGER agent_token_no_unrevoke BEFORE UPDATE ON agent_token
    FOR EACH ROW EXECUTE FUNCTION agent_token_guard();
CREATE TRIGGER agent_token_no_delete BEFORE DELETE ON agent_token
    FOR EACH ROW EXECUTE FUNCTION agent_token_guard();
CREATE TRIGGER agent_token_no_truncate BEFORE TRUNCATE ON agent_token
    FOR EACH STATEMENT EXECUTE FUNCTION agent_token_guard();

-- For an agent entry: the token's name at that moment (a copy, so the entry reads right whatever happens later).
-- Empty for every other entry. Adding a column is not an update of a row, so the append-only trigger is untouched.
ALTER TABLE audit_entry ADD COLUMN actor_label text NOT NULL DEFAULT ''
    CONSTRAINT audit_actor_label_length CHECK (char_length(actor_label) <= 80);

-- +goose Down
ALTER TABLE audit_entry DROP COLUMN actor_label;
DROP TABLE agent_token;
DROP FUNCTION agent_token_guard();
ALTER TABLE journal_settings DROP COLUMN agent_access;
