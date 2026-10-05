-- +goose Up
-- The Trades list shows the plan answer beside each result (the principle I exception of feature 000 ends here).
-- Two columns are added at the end of the view; no existing column changes.
CREATE OR REPLACE VIEW trade_detail AS
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
       t.updated_at,
       j.plan_followed,
       j.label
  FROM trade t
  JOIN account a ON a.id = t.account_id
  LEFT JOIN trade_judgement j ON j.trade_id = t.id;

-- +goose Down
CREATE OR REPLACE VIEW trade_detail AS
SELECT t.id, t.account_id, a.name AS account_name, a.currency AS account_currency, t.instrument, t.direction, t.size,
       t.entry_price, t.exit_price, t.entry_at, t.exit_at, t.dollars_per_point, t.cost, t.stop_price, t.typed_result,
       t.thesis, t.gross_result, t.net_result, t.risk, t.r_multiple, t.trading_day,
       (t.deleted_at IS NOT NULL)::boolean AS deleted, t.updated_at
  FROM trade t JOIN account a ON a.id = t.account_id;
