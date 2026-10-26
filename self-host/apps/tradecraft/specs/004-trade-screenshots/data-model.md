# Data Model: Trade Screenshots

One migration, `backend/migrations/00017_trade_image.sql`, with a Down step. Nothing existing changes shape.

## Table `trade_image`

| Column | Type | Rules |
|---|---|---|
| `id` | `uuid` | primary key, `gen_random_uuid()` |
| `trade_id` | `uuid` | `NOT NULL`, references `trade (id)`; deleting a trade row (never done by the app, trades are soft-deleted) would delete its images |
| `name` | `text` | `NOT NULL`, 1 to 100 characters, cleaned by the API (no path, no control characters, spaces collapsed); the database repeats the length and no-control-character rule |
| `note` | `text` | `NOT NULL DEFAULT ''`, at most 200 characters, trimmed by the API |
| `content_type` | `text` | `NOT NULL`, one of `image/png`, `image/jpeg`, `image/webp` (a `CHECK`), set by the server from the bytes |
| `size_bytes` | `integer` | `NOT NULL`, `BETWEEN 1 AND 5242880` (the size of the picture in the bucket) |
| (the picture) | object | not a column: an object in the bucket named by `id`, the image exactly as added, stored with its type |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()`, the time it was added |

**Index**: `(trade_id, created_at, id)`, which serves "the images of a trade in the order added" and the per-trade count.

**Order**: images are listed by `created_at`, then `id` (two added in the same instant keep a stable order).

**Not stored**: the original file name beyond the cleaned `name`; a hash; any thumbnail; any total.

**Limits in one place**: the Go constants `maxImageBytes = 5 MiB`, `maxImagesPerTrade = 10`, `maxNoteChars = 200`, `maxNameChars = 100`, `maxSide = 16384`, `maxPixels = 64,000,000`. The API returns the first three with the list of a trade's images so the screens quote them and cannot drift.

## Relationships and lifecycle

- An image belongs to one trade for its whole life; it never moves.
- A trade deleted from the Trades list (soft delete) keeps its images; restoring it brings them back as they were. Archiving its account changes nothing.
- An image is deleted only by the owner's Remove (the row and its bytes). There is no soft delete of an image.
- **States**: an image exists or it does not. There is no draft state in the database: an image picked on a new trade is held in the browser until the trade is saved (spec FR-004).

## Audit kinds (code, no migration)

| Code | Label | Subject | Changed fields |
|---|---|---|---|
| `attachment_added` | Attachment added | the trade, named as the log names a trade | none |
| `attachment_removed` | Attachment removed | the trade, named as the log names a trade | none |

An entry holds no image name, note or bytes. It is written in the same transaction as the insert or delete.

## Shapes that change

- **Trade** (`GET /trades`, `GET /trades/{id}`, the day's trades, the judgement's trade): gains `imageCount` (integer, 0 when none).
- **Export**: gains `images`, an array of `{id, tradeId, name, note, contentType, sizeBytes, createdAt, path}` where `path` is `/api/images/{id}` (the address the signed-in owner opens). It carries no bytes.
- **Agent**: the trade reads carry `imageCount`; the new tool `list_trade_images` returns the same metadata for one trade and no `path` the agent could use (an agent token is refused at the image route anyway).
