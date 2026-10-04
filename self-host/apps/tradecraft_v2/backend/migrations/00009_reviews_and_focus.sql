-- +goose Up
-- One row per account and trading day, created when anything is first saved. The state (Missing, Draft,
-- Reviewed, today) is derived, never stored.
CREATE TABLE daily_review (
    account_id      uuid        NOT NULL REFERENCES account (id),
    trading_day     date        NOT NULL,
    did_well        text        NOT NULL DEFAULT '' CHECK (char_length(did_well) <= 2000),
    could_improve   text        NOT NULL DEFAULT '' CHECK (char_length(could_improve) <= 2000),
    next_focus      text        NOT NULL DEFAULT '' CHECK (char_length(next_focus) <= 2000),
    mental_grade    smallint    CHECK (mental_grade BETWEEN 1 AND 5),
    technical_grade smallint    CHECK (technical_grade BETWEEN 1 AND 5),
    reviewed_at     timestamptz,
    edited_at       timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, trading_day)
);

CREATE TRIGGER daily_review_touch BEFORE UPDATE ON daily_review
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- One focus for a week or a month, the owner's, shown on every account's reviews.
CREATE TABLE focus (
    period       text        NOT NULL CHECK (period IN ('week', 'month')),
    period_start date        NOT NULL,
    body         text        NOT NULL CHECK (char_length(body) BETWEEN 1 AND 280),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (period, period_start),
    -- the Monday of a week, the first of a month
    CONSTRAINT focus_period_start_aligned CHECK (
        (period = 'week'  AND period_start = date_trunc('week',  period_start::timestamp)::date)
     OR (period = 'month' AND period_start = date_trunc('month', period_start::timestamp)::date)
    )
);

CREATE TRIGGER focus_touch BEFORE UPDATE ON focus
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- The only thing a weekly review stores: that it was marked, and when.
CREATE TABLE weekly_review_mark (
    account_id  uuid        NOT NULL REFERENCES account (id),
    week_start  date        NOT NULL CHECK (week_start = date_trunc('week', week_start::timestamp)::date),
    reviewed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (account_id, week_start)
);

-- +goose Down
DROP TABLE weekly_review_mark;
DROP TABLE focus;
DROP TABLE daily_review;
