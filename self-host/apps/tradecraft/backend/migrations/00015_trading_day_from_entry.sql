-- +goose Up
-- Feature 003, user story 4: a trade belongs to the day it was ENTERED, not the day it was exited (owner's decision,
-- 2026-10-11). The rule is the same as before, applied to the entry: the journal zone, then the account's day start.
-- The SQL function trading_day(...) is a pure function of an instant; its first parameter is still named exit_at
-- (Postgres will not rename a parameter with CREATE OR REPLACE, and nothing reads the name).
COMMENT ON FUNCTION trading_day(timestamptz, text, time) IS
    'Takes the instant to place (the entry time) and the journal zone; with a day start S, adds 24 hours minus S first.';

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION trade_set_trading_day() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.trading_day := trading_day(
        NEW.entry_at,
        (SELECT time_zone FROM journal_settings WHERE id = 1),
        (SELECT trading_day_start FROM account WHERE id = NEW.account_id));
    RETURN NEW;
END $$;
-- +goose StatementEnd

DROP TRIGGER trade_trading_day ON trade;
CREATE TRIGGER trade_trading_day BEFORE INSERT OR UPDATE OF entry_at, account_id ON trade
    FOR EACH ROW EXECUTE FUNCTION trade_set_trading_day();

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION account_recompute_days() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE trade t
       SET trading_day = trading_day(t.entry_at, (SELECT time_zone FROM journal_settings WHERE id = 1), NEW.trading_day_start)
     WHERE t.account_id = NEW.id;
    RETURN NULL;
END $$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION settings_recompute_days() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE trade t
       SET trading_day = trading_day(t.entry_at, NEW.time_zone, a.trading_day_start)
      FROM account a
     WHERE a.id = t.account_id;
    RETURN NULL;
END $$;
-- +goose StatementEnd

-- Once, now: every existing trade (deleted ones and archived accounts included) takes the day of its entry. No
-- price, time, cost or result is touched.
UPDATE trade t
   SET trading_day = trading_day(t.entry_at, (SELECT time_zone FROM journal_settings WHERE id = 1), a.trading_day_start)
  FROM account a
 WHERE a.id = t.account_id;

-- +goose Down
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION settings_recompute_days() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE trade t
       SET trading_day = trading_day(t.exit_at, NEW.time_zone, a.trading_day_start)
      FROM account a
     WHERE a.id = t.account_id;
    RETURN NULL;
END $$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION account_recompute_days() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE trade t
       SET trading_day = trading_day(t.exit_at, (SELECT time_zone FROM journal_settings WHERE id = 1), NEW.trading_day_start)
     WHERE t.account_id = NEW.id;
    RETURN NULL;
END $$;
-- +goose StatementEnd

DROP TRIGGER trade_trading_day ON trade;
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION trade_set_trading_day() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.trading_day := trading_day(
        NEW.exit_at,
        (SELECT time_zone FROM journal_settings WHERE id = 1),
        (SELECT trading_day_start FROM account WHERE id = NEW.account_id));
    RETURN NEW;
END $$;
-- +goose StatementEnd
CREATE TRIGGER trade_trading_day BEFORE INSERT OR UPDATE OF exit_at, account_id ON trade
    FOR EACH ROW EXECUTE FUNCTION trade_set_trading_day();

COMMENT ON FUNCTION trading_day(timestamptz, text, time) IS NULL;

UPDATE trade t
   SET trading_day = trading_day(t.exit_at, (SELECT time_zone FROM journal_settings WHERE id = 1), a.trading_day_start)
  FROM account a
 WHERE a.id = t.account_id;
