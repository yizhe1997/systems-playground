-- +goose Up
-- The only definitions of the figures a review shows (docs/domain.md). A day, a week and the mistake counter all
-- use these, so they cannot disagree. Everything counts live trades only: a soft-deleted trade is never counted.

-- +goose StatementBegin
CREATE FUNCTION week_start(d date) RETURNS date LANGUAGE sql IMMUTABLE AS $$
    SELECT date_trunc('week', d::timestamp)::date
$$;
-- +goose StatementEnd

-- "Today" belongs to the account: the trading day of the current moment (an account with a 17:00 start is already on
-- tomorrow's trading day at 17:30).
-- +goose StatementBegin
CREATE FUNCTION account_today(acct uuid) RETURNS date LANGUAGE sql STABLE AS $$
    SELECT trading_day(now(),
                       (SELECT time_zone FROM journal_settings WHERE id = 1),
                       (SELECT trading_day_start FROM account WHERE id = acct))
$$;
-- +goose StatementEnd

-- Live trades with their judgement. A win is a net result above zero, a loss below zero; break-even is neither.
CREATE VIEW judged_trade AS
SELECT t.id,
       t.account_id,
       t.trading_day,
       t.net_result,
       j.plan_followed,
       j.label,
       (t.net_result > 0) AS is_win,
       (t.net_result < 0) AS is_loss,
       (SELECT count(*) FROM trade_mistake tm WHERE tm.trade_id = t.id)::int AS mistake_tags
  FROM trade t
  LEFT JOIN trade_judgement j ON j.trade_id = t.id
 WHERE t.deleted_at IS NULL;

-- One row per trading day that has live trades or a whole-day mistake record.
-- +goose StatementBegin
CREATE FUNCTION day_stats(acct uuid, from_day date, to_day date)
RETURNS TABLE (trading_day date, trades int, net_result numeric, followed int, partly int, not_followed int,
               not_judged int, mistake_tags int, valid_losses int, losses int, wins int)
LANGUAGE sql STABLE AS $$
    WITH t AS (
        SELECT jt.trading_day AS day,
               count(*)::int AS trades,
               sum(jt.net_result) AS net_result,
               count(*) FILTER (WHERE jt.plan_followed = 'yes')::int AS followed,
               count(*) FILTER (WHERE jt.plan_followed = 'partly')::int AS partly,
               count(*) FILTER (WHERE jt.plan_followed = 'no')::int AS not_followed,
               count(*) FILTER (WHERE jt.plan_followed IS NULL)::int AS not_judged,
               coalesce(sum(jt.mistake_tags), 0)::int AS mistake_tags,
               count(*) FILTER (WHERE jt.label = 'valid_loss')::int AS valid_losses,
               count(*) FILTER (WHERE jt.is_loss)::int AS losses,
               count(*) FILTER (WHERE jt.is_win)::int AS wins
          FROM judged_trade jt
         WHERE jt.account_id = acct AND jt.trading_day BETWEEN from_day AND to_day
         GROUP BY jt.trading_day
    ), m AS (
        SELECT dm.trading_day AS day, count(*)::int AS records
          FROM day_mistake dm
         WHERE dm.account_id = acct AND dm.trading_day BETWEEN from_day AND to_day
         GROUP BY dm.trading_day
    )
    SELECT coalesce(t.day, m.day),
           coalesce(t.trades, 0),
           t.net_result,
           coalesce(t.followed, 0),
           coalesce(t.partly, 0),
           coalesce(t.not_followed, 0),
           coalesce(t.not_judged, 0),
           coalesce(t.mistake_tags, 0) + coalesce(m.records, 0),
           coalesce(t.valid_losses, 0),
           coalesce(t.losses, 0),
           coalesce(t.wins, 0)
      FROM t FULL JOIN m ON m.day = t.day
$$;
-- +goose StatementEnd

-- The same figures summed over a range (a week): always exactly one row; net_result is null when there are no trades.
-- +goose StatementBegin
CREATE FUNCTION period_stats(acct uuid, from_day date, to_day date)
RETURNS TABLE (trades int, net_result numeric, followed int, partly int, not_followed int, not_judged int,
               mistake_tags int, valid_losses int, losses int, wins int)
LANGUAGE sql STABLE AS $$
    SELECT coalesce(sum(s.trades), 0)::int,
           sum(s.net_result),
           coalesce(sum(s.followed), 0)::int,
           coalesce(sum(s.partly), 0)::int,
           coalesce(sum(s.not_followed), 0)::int,
           coalesce(sum(s.not_judged), 0)::int,
           coalesce(sum(s.mistake_tags), 0)::int,
           coalesce(sum(s.valid_losses), 0)::int,
           coalesce(sum(s.losses), 0)::int,
           coalesce(sum(s.wins), 0)::int
      FROM day_stats(acct, from_day, to_day) s
$$;
-- +goose StatementEnd

-- Each record counts once: a tag on a live trade, and a whole-day record. acct null means all accounts.
-- +goose StatementBegin
CREATE FUNCTION mistake_counts(from_day date, to_day date, acct uuid)
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

-- Daily state: reviewed, draft, missing (the day has ended, it has a live trade, nothing saved), today (the same on the
-- current trading day), or null (a day with no trades and no saved review).
-- +goose StatementBegin
CREATE FUNCTION day_state(acct uuid, d date) RETURNS text LANGUAGE sql STABLE AS $$
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

-- Weekly state: reviewed (a mark exists), missing (the week has ended, a day has a live trade, no mark), else not_reviewed.
-- The current week is never missing.
-- +goose StatementBegin
CREATE FUNCTION week_state(acct uuid, ws date) RETURNS text LANGUAGE sql STABLE AS $$
    SELECT CASE
        WHEN EXISTS (SELECT 1 FROM weekly_review_mark w WHERE w.account_id = acct AND w.week_start = ws) THEN 'reviewed'
        WHEN ws + 6 < account_today(acct)
         AND EXISTS (SELECT 1 FROM trade t WHERE t.account_id = acct AND t.deleted_at IS NULL
                                           AND t.trading_day BETWEEN ws AND ws + 6) THEN 'missing'
        ELSE 'not_reviewed'
    END
$$;
-- +goose StatementEnd

-- +goose Down
DROP FUNCTION week_state(uuid, date);
DROP FUNCTION day_state(uuid, date);
DROP FUNCTION mistake_counts(date, date, uuid);
DROP FUNCTION period_stats(uuid, date, date);
DROP FUNCTION day_stats(uuid, date, date);
DROP VIEW judged_trade;
DROP FUNCTION account_today(uuid);
DROP FUNCTION week_start(date);
