-- +goose Up
-- Feature 004: trade screenshots. An image belongs to one trade for its whole life. This table holds its details; the
-- picture itself is an object in the owner's SeaweedFS bucket under this row's id (owner's decision, 2026-10-26: the
-- images will pile up, so they do not belong in the database). The limits are repeated as constraints: the API checks
-- them first, the database is the last word.

CREATE TABLE trade_image (
    id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    trade_id     uuid        NOT NULL REFERENCES trade (id) ON DELETE CASCADE,
    name         text        NOT NULL,
    note         text        NOT NULL DEFAULT '',
    content_type text        NOT NULL,
    size_bytes   integer     NOT NULL,
    created_at   timestamptz NOT NULL DEFAULT now(),
    -- the API cleans the name first (no path, no control characters, spaces collapsed); this is the backstop
    CONSTRAINT trade_image_name_clean CHECK (char_length(name) BETWEEN 1 AND 100 AND name !~ '[[:cntrl:]]'),
    CONSTRAINT trade_image_note_len CHECK (char_length(note) <= 200),
    CONSTRAINT trade_image_type CHECK (content_type IN ('image/png', 'image/jpeg', 'image/webp')),
    CONSTRAINT trade_image_size CHECK (size_bytes BETWEEN 1 AND 5242880)
);

-- "the images of a trade in the order they were added", and the per-trade count
CREATE INDEX trade_image_by_trade ON trade_image (trade_id, created_at, id);

-- +goose Down
DROP TABLE trade_image;
