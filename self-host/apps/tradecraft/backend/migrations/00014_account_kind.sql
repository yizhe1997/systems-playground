-- +goose Up
-- Feature 003: an account has a kind, Live or Backtest. What the kind means lives where the rules already live:
-- "Missing" is decided only by day_state and week_state, and the all-accounts counter only by mistake_counts, so
-- changing them here makes every screen and every agent read follow (research.md sections 2 and 3).
ALTER TABLE account ADD COLUMN kind text NOT NULL DEFAULT 'live'
    CONSTRAINT account_kind_known CHECK (kind IN ('live', 'backtest'));

-- Daily state: reviewed, draft, missing (the day has ended, it has a live trade, nothing saved), today (the same on the
-- current trading day), or null (a day with no trades and no saved review). A day of a backtest account with trades
-- and no saved review is null as well: never missing, never today. A saved review still gives draft or reviewed.
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION day_state(acct uuid, d date) RETURNS text LANGUAGE sql STABLE AS $$
    SELECT CASE
        WHEN r.reviewed_at IS NOT NULL THEN 'reviewed'
        WHEN r.account_id IS NOT NULL THEN 'draft'
        WHEN a.kind = 'backtest' THEN NULL
        WHEN EXISTS (SELECT 1 FROM trade t WHERE t.account_id = acct AND t.trading_day = d AND t.deleted_at IS NULL) THEN
            CASE WHEN d < account_today(acct) THEN 'missing'
                 WHEN d = account_today(acct) THEN 'today'
            END
    END
      FROM (SELECT 1) one
      LEFT JOIN daily_review r ON r.account_id = acct AND r.trading_day = d
      LEFT JOIN account a ON a.id = acct
$$;
-- +goose StatementEnd

-- Weekly state: reviewed (a mark exists), missing (the week has ended, a day has a live trade, no mark), else
-- not_reviewed. The current week is never missing, and a backtest account's week is never missing.
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION week_state(acct uuid, ws date) RETURNS text LANGUAGE sql STABLE AS $$
    SELECT CASE
        WHEN EXISTS (SELECT 1 FROM weekly_review_mark w WHERE w.account_id = acct AND w.week_start = ws) THEN 'reviewed'
        WHEN ws + 6 < account_today(acct)
         AND NOT EXISTS (SELECT 1 FROM account a WHERE a.id = acct AND a.kind = 'backtest')
         AND EXISTS (SELECT 1 FROM trade t WHERE t.account_id = acct AND t.deleted_at IS NULL
                                           AND t.trading_day BETWEEN ws AND ws + 6) THEN 'missing'
        ELSE 'not_reviewed'
    END
$$;
-- +goose StatementEnd

-- Each record counts once: a tag on a live trade, and a whole-day record. With an account given, that account
-- whatever its kind. acct null means every Live account (a backtest counts only when chosen on its own).
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION mistake_counts(from_day date, to_day date, acct uuid)
RETURNS TABLE (mistake_id uuid, account_id uuid, on_trades int, on_days int)
LANGUAGE sql STABLE AS $$
    SELECT x.mistake_id, x.account_id, sum(x.on_trades)::int, sum(x.on_days)::int
      FROM (
        SELECT tm.mistake_id, t.account_id, 1 AS on_trades, 0 AS on_days
          FROM trade_mistake tm
          JOIN trade t ON t.id = tm.trade_id
         WHERE t.deleted_at IS NULL
           AND t.trading_day BETWEEN from_day AND to_day
           AND (t.account_id = acct
                OR (acct IS NULL AND EXISTS (SELECT 1 FROM account a WHERE a.id = t.account_id AND a.kind = 'live')))
        UNION ALL
        SELECT dm.mistake_id, dm.account_id, 0, 1
          FROM day_mistake dm
         WHERE dm.trading_day BETWEEN from_day AND to_day
           AND (dm.account_id = acct
                OR (acct IS NULL AND EXISTS (SELECT 1 FROM account a WHERE a.id = dm.account_id AND a.kind = 'live')))
      ) x
     GROUP BY x.mistake_id, x.account_id
$$;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
CREATE OR REPLACE FUNCTION mistake_counts(from_day date, to_day date, acct uuid)
RETURNS TABLE (mistake_id uuid, account_id uuid, on_trades int, on_days int)
LANGUAGE sql STABLE AS $$
    SELECT x.mistake_id, x.account_id, sum(x.on_trades)::int, sum(x.on_days)::int
      FROM (
        SELECT tm.mistake_id, t.account_id, 1 AS on_trades, 0 AS on_days
          FROM trade_mistake tm
          JOIN trade t ON t.id = tm.trade_id
         WHERE t.deleted_at IS NULL
           AND t.trading_day BETWEEN from_day AND to_day
           AND (acct IS NULL OR t.account_id = acct)
        UNION ALL
        SELECT dm.mistake_id, dm.account_id, 0, 1
          FROM day_mistake dm
         WHERE dm.trading_day BETWEEN from_day AND to_day
           AND (acct IS NULL OR dm.account_id = acct)
      ) x
     GROUP BY x.mistake_id, x.account_id
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION week_state(acct uuid, ws date) RETURNS text LANGUAGE sql STABLE AS $$
    SELECT CASE
        WHEN EXISTS (SELECT 1 FROM weekly_review_mark w WHERE w.account_id = acct AND w.week_start = ws) THEN 'reviewed'
        WHEN ws + 6 < account_today(acct)
         AND EXISTS (SELECT 1 FROM trade t WHERE t.account_id = acct AND t.deleted_at IS NULL
                                           AND t.trading_day BETWEEN ws AND ws + 6) THEN 'missing'
        ELSE 'not_reviewed'
    END
$$;
-- +goose StatementEnd

-- +goose StatementBegin
CREATE OR REPLACE FUNCTION day_state(acct uuid, d date) RETURNS text LANGUAGE sql STABLE AS $$
    SELECT CASE
        WHEN r.reviewed_at IS NOT NULL THEN 'reviewed'
        WHEN r.account_id IS NOT NULL THEN 'draft'
        WHEN EXISTS (SELECT 1 FROM trade t WHERE t.account_id = acct AND t.trading_day = d AND t.deleted_at IS NULL) THEN
            CASE WHEN d < account_today(acct) THEN 'missing'
                 WHEN d = account_today(acct) THEN 'today'
            END
    END
      FROM (SELECT 1) one
      LEFT JOIN daily_review r ON r.account_id = acct AND r.trading_day = d
$$;
-- +goose StatementEnd

ALTER TABLE account DROP COLUMN kind;
