-- Everything, deleted trades included (the deleted flag is a column). Oldest exit first.
-- name: ExportTrades :many
SELECT * FROM trade_detail ORDER BY exit_at, id;
