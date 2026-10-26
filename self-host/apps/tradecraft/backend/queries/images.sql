-- Feature 004: images on trades. The bytes are objects in the bucket (internal/objects); these queries hold the details.

-- name: ListTradeImages :many
SELECT id, trade_id, name, note, content_type, size_bytes, created_at
FROM trade_image
WHERE trade_id = $1
ORDER BY created_at, id;

-- name: GetImageMeta :one
SELECT id, trade_id, name, note, content_type, size_bytes, created_at
FROM trade_image
WHERE id = $1;

-- name: InsertImage :one
INSERT INTO trade_image (trade_id, name, content_type, size_bytes)
VALUES ($1, $2, $3, $4)
RETURNING id, trade_id, name, note, content_type, size_bytes, created_at;

-- name: UpdateImageNote :one
UPDATE trade_image SET note = $2 WHERE id = $1
RETURNING id, trade_id, name, note, content_type, size_bytes, created_at;

-- name: DeleteImage :exec
DELETE FROM trade_image WHERE id = $1;

-- name: CountTradeImages :one
SELECT count(*)::int FROM trade_image WHERE trade_id = $1;

-- name: TradeExistsForImages :one
SELECT id FROM trade WHERE id = $1;

-- name: ImageCountsForTrades :many
SELECT trade_id, count(*)::int AS image_count
FROM trade_image
WHERE trade_id = ANY($1::uuid[])
GROUP BY trade_id;

-- name: ExportImages :many
SELECT id, trade_id, name, note, content_type, size_bytes, created_at
FROM trade_image
ORDER BY created_at, id;
