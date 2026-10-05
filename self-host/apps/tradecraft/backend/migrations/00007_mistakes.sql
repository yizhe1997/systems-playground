-- +goose Up
CREATE TABLE mistake (
    id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        text        NOT NULL,
    stop_line   integer,
    stop_period text,
    retired_at  timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),
    -- 1 to 60 characters; no leading, trailing or repeated spaces (the API collapses them on save)
    CONSTRAINT mistake_name_clean CHECK (
        char_length(name) BETWEEN 1 AND 60
        AND name = regexp_replace(btrim(name), '\s+', ' ', 'g')
    ),
    CONSTRAINT mistake_stop_line_range CHECK (stop_line IS NULL OR stop_line BETWEEN 1 AND 999),
    -- a stop line belongs to one period; both are present or both absent
    CONSTRAINT mistake_stop_period_pair CHECK (
        (stop_line IS NULL) = (stop_period IS NULL)
        AND (stop_period IS NULL OR stop_period IN ('week', 'month'))
    )
);

-- unique ignoring case and surrounding spaces, retired mistakes included
CREATE UNIQUE INDEX mistake_name_unique ON mistake (lower(regexp_replace(btrim(name), '\s+', ' ', 'g')));

CREATE TRIGGER mistake_touch BEFORE UPDATE ON mistake
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

INSERT INTO mistake (name) VALUES
    ('Chased entry'), ('Moved stop'), ('Oversized'), ('Ignored checklist'), ('Traded outside plan');

-- +goose Down
DROP TABLE mistake;
