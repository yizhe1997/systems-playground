-- +goose Up
-- When an edit makes a trade no longer a loss (a win, or break-even), a "valid loss" label cannot stand: clear it, so
-- the trade shows as not yet judged. Done in the database so it holds whoever edits the trade.
-- +goose StatementBegin
CREATE FUNCTION trade_net_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    UPDATE trade_judgement
       SET label = NULL
     WHERE trade_id = NEW.id AND label = 'valid_loss' AND NEW.net_result >= 0;
    RETURN NULL;
END $$;
-- +goose StatementEnd

CREATE TRIGGER trade_net_changed AFTER UPDATE ON trade
    FOR EACH ROW WHEN (OLD.net_result IS DISTINCT FROM NEW.net_result)
    EXECUTE FUNCTION trade_net_changed();

-- +goose Down
DROP TRIGGER trade_net_changed ON trade;
DROP FUNCTION trade_net_changed();
