-- +goose Up
CREATE TABLE account (
    id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name              text        NOT NULL,
    currency          text        NOT NULL,
    trading_day_start time,
    archived_at       timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    -- 1 to 80 characters; no leading, trailing or repeated spaces (the API collapses them on save)
    CONSTRAINT account_name_clean CHECK (
        char_length(name) BETWEEN 1 AND 80
        AND name = regexp_replace(btrim(name), '\s+', ' ', 'g')
    ),
    -- the API checks the code against the active ISO 4217 list; the database holds the shape
    CONSTRAINT account_currency_shape CHECK (currency ~ '^[A-Z]{3}$'),
    -- 00:00 would put every trade on the next day
    CONSTRAINT account_day_start_not_midnight CHECK (trading_day_start IS NULL OR trading_day_start <> TIME '00:00')
);

-- unique ignoring case and surrounding spaces, archived accounts included
CREATE UNIQUE INDEX account_name_unique ON account (lower(regexp_replace(btrim(name), '\s+', ' ', 'g')));

-- the version token for concurrent edits moves on every update
-- +goose StatementBegin
CREATE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at := clock_timestamp();
    RETURN NEW;
END $$;
-- +goose StatementEnd

CREATE TRIGGER account_touch BEFORE UPDATE ON account
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- +goose Down
DROP TABLE account;
DROP FUNCTION touch_updated_at();
