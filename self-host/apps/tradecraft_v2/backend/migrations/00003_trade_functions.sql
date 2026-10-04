-- +goose Up
-- The only definitions of the trading rules (docs/domain.md). Everything else calls these.

-- +goose StatementBegin
CREATE FUNCTION trade_gross(direction text, size numeric, entry numeric, exit_price numeric, dollars_per_point numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE
        WHEN dollars_per_point IS NULL THEN NULL
        WHEN direction = 'long'  THEN (exit_price - entry) * size * dollars_per_point
        WHEN direction = 'short' THEN (entry - exit_price) * size * dollars_per_point
    END
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE FUNCTION trade_net(gross numeric, cost numeric, typed_result numeric, dollars_per_point numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE WHEN dollars_per_point IS NULL THEN typed_result ELSE gross - cost END
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE FUNCTION trade_risk(size numeric, entry numeric, stop numeric, dollars_per_point numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
    SELECT NULLIF(abs(entry - stop) * size * dollars_per_point, 0)
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE FUNCTION trade_r(net numeric, risk numeric)
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$
    SELECT round(net / risk, 6)
$$;
-- +goose StatementEnd

-- Trading day: the exit in the journal zone; with a day start S, add (24 h - S) to the local time first.
-- STABLE, not IMMUTABLE: the zone database can change. Used in triggers only, never in a generated column.
-- +goose StatementBegin
CREATE FUNCTION trading_day(exit_at timestamptz, time_zone text, day_start time)
RETURNS date LANGUAGE sql STABLE AS $$
    SELECT (
        (exit_at AT TIME ZONE time_zone)
        + CASE WHEN day_start IS NULL THEN interval '0' ELSE interval '24 hours' - day_start::interval END
    )::date
$$;
-- +goose StatementEnd

-- +goose Down
DROP FUNCTION trading_day(timestamptz, text, time);
DROP FUNCTION trade_r(numeric, numeric);
DROP FUNCTION trade_risk(numeric, numeric, numeric, numeric);
DROP FUNCTION trade_net(numeric, numeric, numeric, numeric);
DROP FUNCTION trade_gross(text, numeric, numeric, numeric, numeric);
