-- +goose Up
CREATE TABLE journal_settings (
    id         smallint    PRIMARY KEY CHECK (id = 1),
    time_zone  text        NOT NULL DEFAULT 'America/Chicago',
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- A CHECK cannot look at the zone list, so a trigger refuses a name the database does not know
-- (AT TIME ZONE raises "time zone ... not recognized").
-- +goose StatementBegin
CREATE FUNCTION journal_settings_check_zone() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    PERFORM now() AT TIME ZONE NEW.time_zone;
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END $$;
-- +goose StatementEnd

CREATE TRIGGER journal_settings_zone BEFORE INSERT OR UPDATE ON journal_settings
    FOR EACH ROW EXECUTE FUNCTION journal_settings_check_zone();

INSERT INTO journal_settings (id) VALUES (1);

-- +goose Down
DROP TABLE journal_settings;
DROP FUNCTION journal_settings_check_zone();
