-- +goose Up
-- 1. A trade's trading day follows its exit, its account's day start and the journal time zone.
-- +goose StatementBegin
CREATE FUNCTION trade_set_trading_day() RETURNS trigger LANGUAGE plpgsql AS $$
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

-- 2. Changing an account's day start recomputes that account's trades (deleted ones and archived accounts included).
-- +goose StatementBegin
CREATE FUNCTION account_recompute_days() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE trade t
       SET trading_day = trading_day(t.exit_at, (SELECT time_zone FROM journal_settings WHERE id = 1), NEW.trading_day_start)
     WHERE t.account_id = NEW.id;
    RETURN NULL;
END $$;
-- +goose StatementEnd

CREATE TRIGGER account_day_start_changed AFTER UPDATE OF trading_day_start ON account
    FOR EACH ROW WHEN (OLD.trading_day_start IS DISTINCT FROM NEW.trading_day_start)
    EXECUTE FUNCTION account_recompute_days();

-- 3. Changing the journal time zone recomputes every trade.
-- +goose StatementBegin
CREATE FUNCTION settings_recompute_days() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE trade t
       SET trading_day = trading_day(t.exit_at, NEW.time_zone, a.trading_day_start)
      FROM account a
     WHERE a.id = t.account_id;
    RETURN NULL;
END $$;
-- +goose StatementEnd

CREATE TRIGGER settings_time_zone_changed AFTER UPDATE OF time_zone ON journal_settings
    FOR EACH ROW WHEN (OLD.time_zone IS DISTINCT FROM NEW.time_zone)
    EXECUTE FUNCTION settings_recompute_days();

-- +goose Down
DROP TRIGGER settings_time_zone_changed ON journal_settings;
DROP FUNCTION settings_recompute_days();
DROP TRIGGER account_day_start_changed ON account;
DROP FUNCTION account_recompute_days();
DROP TRIGGER trade_trading_day ON trade;
DROP FUNCTION trade_set_trading_day();
