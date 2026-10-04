-- name: ListTrades :many
SELECT * FROM trade_detail
 WHERE deleted = sqlc.arg(deleted)::boolean
   AND (sqlc.narg(account_id)::uuid IS NULL OR account_id = sqlc.narg(account_id)::uuid)
   AND (sqlc.narg(from_day)::date IS NULL OR trading_day >= sqlc.narg(from_day)::date)
   AND (sqlc.narg(to_day)::date IS NULL OR trading_day <= sqlc.narg(to_day)::date)
 ORDER BY exit_at DESC, id DESC;

-- name: GetTrade :one
SELECT * FROM trade_detail WHERE id = sqlc.arg(id)::uuid;

-- name: InsertTrade :one
INSERT INTO trade (account_id, instrument, direction, size, entry_price, exit_price, entry_at, exit_at,
                   dollars_per_point, cost, stop_price, typed_result, thesis)
VALUES (sqlc.arg(account_id)::uuid, sqlc.arg(instrument)::text, sqlc.arg(direction)::text,
        sqlc.arg(size)::numeric, sqlc.arg(entry_price)::numeric, sqlc.arg(exit_price)::numeric,
        sqlc.arg(entry_at)::timestamptz, sqlc.arg(exit_at)::timestamptz,
        sqlc.narg(dollars_per_point)::numeric, sqlc.arg(cost)::numeric, sqlc.narg(stop_price)::numeric,
        sqlc.narg(typed_result)::numeric, sqlc.narg(thesis)::text)
RETURNING id;

-- name: UpdateTrade :one
UPDATE trade
   SET account_id = sqlc.arg(account_id)::uuid,
       instrument = sqlc.arg(instrument)::text,
       direction = sqlc.arg(direction)::text,
       size = sqlc.arg(size)::numeric,
       entry_price = sqlc.arg(entry_price)::numeric,
       exit_price = sqlc.arg(exit_price)::numeric,
       entry_at = sqlc.arg(entry_at)::timestamptz,
       exit_at = sqlc.arg(exit_at)::timestamptz,
       dollars_per_point = sqlc.narg(dollars_per_point)::numeric,
       cost = sqlc.arg(cost)::numeric,
       stop_price = sqlc.narg(stop_price)::numeric,
       typed_result = sqlc.narg(typed_result)::numeric,
       thesis = sqlc.narg(thesis)::text
 WHERE id = sqlc.arg(id)::uuid
   AND (sqlc.narg(expected_updated_at)::timestamptz IS NULL OR updated_at = sqlc.narg(expected_updated_at)::timestamptz)
RETURNING id;

-- name: SoftDeleteTrade :one
UPDATE trade SET deleted_at = COALESCE(deleted_at, now()) WHERE id = sqlc.arg(id)::uuid RETURNING id;

-- name: RestoreTrade :one
UPDATE trade SET deleted_at = NULL WHERE id = sqlc.arg(id)::uuid RETURNING id;

-- The preview calls the same SQL functions as the stored columns. Inputs are already parsed; a value that
-- could not be read arrives as null and the matching figure comes back null.
-- name: PreviewTrade :one
WITH g AS (
    SELECT trade_gross(sqlc.narg(direction)::text, sqlc.narg(size)::numeric, sqlc.narg(entry_price)::numeric,
                       sqlc.narg(exit_price)::numeric, sqlc.narg(dollars_per_point)::numeric) AS gross
), n AS (
    SELECT g.gross,
           trade_net(g.gross, sqlc.narg(cost)::numeric, sqlc.narg(typed_result)::numeric,
                     sqlc.narg(dollars_per_point)::numeric) AS net
      FROM g
), r AS (
    SELECT trade_risk(sqlc.narg(size)::numeric, sqlc.narg(entry_price)::numeric, sqlc.narg(stop_price)::numeric,
                      sqlc.narg(dollars_per_point)::numeric) AS risk
)
SELECT COALESCE(n.gross::text, '')::text AS gross_result,
       COALESCE(n.net::text, '')::text AS net_result,
       COALESCE(r.risk::text, '')::text AS risk,
       COALESCE(trade_r(n.net, r.risk)::text, '')::text AS r_multiple,
       COALESCE((CASE WHEN sqlc.narg(exit_at)::timestamptz IS NULL OR sqlc.narg(account_id)::uuid IS NULL THEN NULL
            ELSE trading_day(sqlc.narg(exit_at)::timestamptz,
                             (SELECT time_zone FROM journal_settings WHERE id = 1),
                             (SELECT trading_day_start FROM account WHERE id = sqlc.narg(account_id)::uuid))
       END)::text, '')::text AS trading_day
  FROM n, r;
