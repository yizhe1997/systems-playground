-- Everything, deleted trades included (the deleted flag is a column). Oldest exit first.
-- name: ExportTrades :many
SELECT * FROM trade_detail ORDER BY exit_at, id;

-- name: ExportDailyReviews :many
SELECT r.account_id, a.name AS account_name, r.trading_day, r.did_well, r.could_improve, r.next_focus,
       r.mental_grade, r.technical_grade, r.reviewed_at, r.edited_at, r.updated_at
  FROM daily_review r JOIN account a ON a.id = r.account_id
 ORDER BY r.trading_day, a.name;

-- name: ExportFocuses :many
SELECT period, period_start, body, updated_at FROM focus ORDER BY period, period_start;

-- name: ExportWeeklyMarks :many
SELECT w.account_id, a.name AS account_name, w.week_start, w.reviewed_at
  FROM weekly_review_mark w JOIN account a ON a.id = w.account_id
 ORDER BY w.week_start, a.name;

-- name: ExportDayMistakes :many
SELECT dm.account_id, a.name AS account_name, dm.trading_day, m.id AS mistake_id, m.name AS mistake
  FROM day_mistake dm JOIN account a ON a.id = dm.account_id JOIN mistake m ON m.id = dm.mistake_id
 ORDER BY dm.trading_day, a.name, m.name;

-- The mistake names tagged on each trade, deleted trades included.
-- name: ExportTradeMistakes :many
SELECT tm.trade_id, m.name AS mistake FROM trade_mistake tm JOIN mistake m ON m.id = tm.mistake_id ORDER BY tm.trade_id, m.name;
