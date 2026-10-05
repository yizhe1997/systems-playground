-- +goose Up
CREATE TABLE trade (
    id                uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id        uuid          NOT NULL REFERENCES account (id),
    instrument        text          NOT NULL CHECK (char_length(instrument) BETWEEN 1 AND 40),
    direction         text          NOT NULL CHECK (direction IN ('long', 'short')),
    size              numeric(24,8) NOT NULL CHECK (size > 0),
    entry_price       numeric(24,8) NOT NULL CHECK (entry_price > 0),
    exit_price        numeric(24,8) NOT NULL CHECK (exit_price > 0),
    entry_at          timestamptz   NOT NULL,
    exit_at           timestamptz   NOT NULL,
    dollars_per_point numeric(24,8) CHECK (dollars_per_point IS NULL OR dollars_per_point > 0),
    cost              numeric(24,8) NOT NULL DEFAULT 0 CHECK (cost >= 0),
    stop_price        numeric(24,8) CHECK (stop_price IS NULL OR stop_price > 0),
    typed_result      numeric(24,8),
    thesis            text          CHECK (thesis IS NULL OR char_length(thesis) <= 5000),
    deleted_at        timestamptz,
    created_at        timestamptz   NOT NULL DEFAULT now(),
    updated_at        timestamptz   NOT NULL DEFAULT now(),
    -- derived, stored, never typed
    gross_result      numeric GENERATED ALWAYS AS (
                          trade_gross(direction, size, entry_price, exit_price, dollars_per_point)) STORED,
    net_result        numeric GENERATED ALWAYS AS (
                          trade_net(trade_gross(direction, size, entry_price, exit_price, dollars_per_point),
                                    cost, typed_result, dollars_per_point)) STORED,
    risk              numeric GENERATED ALWAYS AS (
                          trade_risk(size, entry_price, stop_price, dollars_per_point)) STORED,
    r_multiple        numeric GENERATED ALWAYS AS (
                          trade_r(trade_net(trade_gross(direction, size, entry_price, exit_price, dollars_per_point),
                                            cost, typed_result, dollars_per_point),
                                  trade_risk(size, entry_price, stop_price, dollars_per_point))) STORED,
    trading_day       date,
    CONSTRAINT trade_exit_not_before_entry CHECK (exit_at >= entry_at),
    -- required when there is no dollars per point, and discarded when there is
    CONSTRAINT trade_typed_result_rule CHECK ((dollars_per_point IS NULL) = (typed_result IS NOT NULL))
);

CREATE INDEX trade_account_day ON trade (account_id, trading_day);
CREATE INDEX trade_day ON trade (trading_day);
CREATE INDEX trade_deleted ON trade (deleted_at);

CREATE TRIGGER trade_touch BEFORE UPDATE ON trade
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- +goose Down
DROP TABLE trade;
