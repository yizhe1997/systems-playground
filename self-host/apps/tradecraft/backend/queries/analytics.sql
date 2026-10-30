-- Feature 005: Home and Analytics. These queries only read. The figures themselves are made in Go (internal/analytics)
-- from the rows of AnalyticsRows, so every screen and the Trades list agree on which trades are in scope.
--
-- Scope: trades not deleted, with a trading day from from_day to to_day, in the chosen account (any kind) or, with no
-- account chosen, in all Live accounts (archived ones included, Backtest never).

-- One row per trade, in the order the running result and the streaks use.
-- name: AnalyticsRows :many
SELECT t.id AS trade_id,
       a.id AS account_id,
       a.name AS account_name,
       a.currency AS currency,
       (a.archived_at IS NOT NULL)::boolean AS account_archived,
       a.kind AS account_kind,
       t.trading_day::date AS trading_day,
       t.entry_at AS entry_at,
       extract(hour FROM t.entry_at AT TIME ZONE (SELECT s.time_zone FROM journal_settings s LIMIT 1))::smallint AS entry_hour,
       extract(isodow FROM t.trading_day)::smallint AS weekday,
       t.instrument AS instrument,
       t.direction AS direction,
       t.net_result AS net_result,
       t.r_multiple AS r_multiple,
       j.plan_followed AS plan_followed,
       j.label AS label,
       coalesce((SELECT array_agg(m.id::text ORDER BY m.name) FROM trade_mistake tm JOIN mistake m ON m.id = tm.mistake_id
                  WHERE tm.trade_id = t.id), '{}')::text[] AS mistake_ids,
       coalesce((SELECT array_agg(m.name ORDER BY m.name) FROM trade_mistake tm JOIN mistake m ON m.id = tm.mistake_id
                  WHERE tm.trade_id = t.id), '{}')::text[] AS mistake_names
  FROM trade t
  JOIN account a ON a.id = t.account_id
  LEFT JOIN trade_judgement j ON j.trade_id = t.id
 WHERE t.deleted_at IS NULL
   AND t.trading_day BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date
   AND ((sqlc.narg(account_id)::uuid IS NOT NULL AND a.id = sqlc.narg(account_id)::uuid)
        OR (sqlc.narg(account_id)::uuid IS NULL AND a.kind = 'live'))
 ORDER BY t.trading_day, t.entry_at, t.id;

-- Trades of the scope with no period limit: tells an empty period from an empty journal.
-- name: ScopeTradeCount :one
SELECT count(*)::bigint
  FROM trade t
  JOIN account a ON a.id = t.account_id
 WHERE t.deleted_at IS NULL
   AND ((sqlc.narg(account_id)::uuid IS NOT NULL AND a.id = sqlc.narg(account_id)::uuid)
        OR (sqlc.narg(account_id)::uuid IS NULL AND a.kind = 'live'));

-- The whole-day mistake records of the scope by account and mistake: they are added to the tags on the block's trades to
-- make the cost table's "records", which equals the Mistakes counter for the same scope.
-- name: AnalyticsDayRecords :many
SELECT dm.account_id::text AS account_id, dm.mistake_id::text AS mistake_id, count(*)::int AS records
  FROM day_mistake dm
  JOIN account a ON a.id = dm.account_id
 WHERE dm.trading_day BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date
   AND ((sqlc.narg(account_id)::uuid IS NOT NULL AND a.id = sqlc.narg(account_id)::uuid)
        OR (sqlc.narg(account_id)::uuid IS NULL AND a.kind = 'live'))
 GROUP BY dm.account_id, dm.mistake_id;

-- Needs you (Home): what is waiting for the owner in the scope, from the same state rules as the Reviews screens
-- (day_state and week_state), newest first. total is the whole count, the list is capped by the caller.
-- name: NeedsYouMissingDays :many
-- 'missing' as day_state says it, written as joins so it costs one pass, not one function call per day
WITH today AS MATERIALIZED (SELECT id, account_today(id) AS today_day FROM account)
SELECT x.account_id::text AS account_id, x.account_name AS account_name, x.trading_day::date AS trading_day, x.trades::int AS trades,
       (count(*) OVER ())::int AS total
  FROM (
    SELECT g.account_id, g.account_name, g.trading_day, g.trades
      FROM (
        SELECT t.account_id, a.name AS account_name, t.trading_day, count(*) AS trades
          FROM trade t
          JOIN account a ON a.id = t.account_id
         WHERE t.deleted_at IS NULL
           AND t.trading_day BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date
           AND ((sqlc.narg(account_id)::uuid IS NOT NULL AND a.id = sqlc.narg(account_id)::uuid)
                OR (sqlc.narg(account_id)::uuid IS NULL AND a.kind = 'live'))
           AND a.kind <> 'backtest'
         GROUP BY t.account_id, a.name, t.trading_day
      ) g
     WHERE NOT EXISTS (SELECT 1 FROM daily_review r WHERE r.account_id = g.account_id AND r.trading_day = g.trading_day)
       AND g.trading_day < (SELECT today_day FROM today WHERE today.id = g.account_id)
  ) x
 ORDER BY x.trading_day DESC, x.account_name
 LIMIT sqlc.arg(max_rows)::int;

-- name: NeedsYouMissingWeeks :many
WITH today AS MATERIALIZED (SELECT id, account_today(id) AS today_day FROM account)
SELECT x.account_id::text AS account_id, x.account_name AS account_name, x.week_start::date AS week_start,
       (count(*) OVER ())::int AS total
  FROM (
    SELECT g.account_id, g.account_name, g.week_start
      FROM (
        SELECT DISTINCT t.account_id, a.name AS account_name, week_start(t.trading_day) AS week_start
          FROM trade t
          JOIN account a ON a.id = t.account_id
         WHERE t.deleted_at IS NULL
           AND t.trading_day BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date
           AND ((sqlc.narg(account_id)::uuid IS NOT NULL AND a.id = sqlc.narg(account_id)::uuid)
                OR (sqlc.narg(account_id)::uuid IS NULL AND a.kind = 'live'))
           AND a.kind <> 'backtest'
      ) g
     WHERE NOT EXISTS (SELECT 1 FROM weekly_review_mark w WHERE w.account_id = g.account_id AND w.week_start = g.week_start)
       AND g.week_start + 6 < (SELECT today_day FROM today WHERE today.id = g.account_id)
  ) x
 ORDER BY x.week_start DESC, x.account_name
 LIMIT sqlc.arg(max_rows)::int;

-- name: NeedsYouNotJudged :many
SELECT t.id::text AS trade_id, a.id::text AS account_id, a.name AS account_name, t.instrument AS instrument, t.direction AS direction,
       t.entry_at AS entry_at, t.trading_day::date AS trading_day, (count(*) OVER ())::int AS total
  FROM trade t
  JOIN account a ON a.id = t.account_id
  LEFT JOIN trade_judgement j ON j.trade_id = t.id
 WHERE t.deleted_at IS NULL
   AND t.trading_day BETWEEN sqlc.arg(from_day)::date AND sqlc.arg(to_day)::date
   AND ((sqlc.narg(account_id)::uuid IS NOT NULL AND a.id = sqlc.narg(account_id)::uuid)
        OR (sqlc.narg(account_id)::uuid IS NULL AND a.kind = 'live'))
   AND j.plan_followed IS NULL
 ORDER BY t.entry_at DESC, t.id DESC
 LIMIT sqlc.arg(max_rows)::int;
