-- +goose Up
-- How the owner judged a trade. One row per trade, created on the first save.
CREATE TABLE trade_judgement (
    trade_id      uuid        PRIMARY KEY REFERENCES trade (id),
    plan_followed text        CHECK (plan_followed IN ('yes', 'partly', 'no')),
    label         text        CHECK (label IN ('valid_loss', 'mistake')),
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),
    -- a loss cannot be a valid loss unless the plan was followed (clarify 2026-10-03)
    CONSTRAINT valid_loss_needs_plan_yes CHECK (label IS DISTINCT FROM 'valid_loss' OR coalesce(plan_followed = 'yes', false))
);

CREATE TRIGGER trade_judgement_touch BEFORE UPDATE ON trade_judgement
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- A mistake tagged on a trade (at most once per trade).
CREATE TABLE trade_mistake (
    trade_id   uuid NOT NULL REFERENCES trade (id),
    mistake_id uuid NOT NULL REFERENCES mistake (id),
    PRIMARY KEY (trade_id, mistake_id)
);

-- A mistake recorded once for a whole trading day (not tied to one trade).
CREATE TABLE day_mistake (
    account_id  uuid NOT NULL REFERENCES account (id),
    trading_day date NOT NULL,
    mistake_id  uuid NOT NULL REFERENCES mistake (id),
    PRIMARY KEY (account_id, trading_day, mistake_id)
);

-- +goose Down
DROP TABLE day_mistake;
DROP TABLE trade_mistake;
DROP TABLE trade_judgement;
