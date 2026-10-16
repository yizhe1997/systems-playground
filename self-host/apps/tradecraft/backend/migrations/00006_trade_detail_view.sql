-- +goose Up
-- One shape for every read of a trade: the trade, its account's name and currency, and the stored figures.
-- Numbers stay numeric here; the queries layer decides how they travel.
CREATE VIEW trade_detail AS
SELECT t.id,
       t.account_id,
       a.name       AS account_name,
       a.currency   AS account_currency,
       t.instrument,
       t.direction,
       t.size,
       t.entry_price,
       t.exit_price,
       t.entry_at,
       t.exit_at,
       t.dollars_per_point,
       t.cost,
       t.stop_price,
       t.typed_result,
       t.thesis,
       t.gross_result,
       t.net_result,
       t.risk,
       t.r_multiple,
       t.trading_day,
       (t.deleted_at IS NOT NULL)::boolean AS deleted,
       t.updated_at
  FROM trade t
  JOIN account a ON a.id = t.account_id;

-- +goose Down
DROP VIEW trade_detail;
