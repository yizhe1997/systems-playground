package alerts

import (
	"context"
	"errors"

	core "futures-copilot-mvp/internal/core"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	GetAlertChannel(ctx context.Context, userEmail, channel string) (*core.UserAlertChannel, error)
	ListAlertChannels(ctx context.Context, userEmail string) ([]core.UserAlertChannel, error)
	UpsertAlertChannel(ctx context.Context, userEmail string, req core.SaveAlertChannelRequest) error
	GetSubscribersForTrigger(ctx context.Context, notifyColumn string) ([]core.UserAlertChannel, error)
}

type postgresRepository struct {
	dbGetter func() *pgxpool.Pool
}

func NewPostgresRepository(dbGetter func() *pgxpool.Pool) Repository {
	return postgresRepository{dbGetter: dbGetter}
}

func (r postgresRepository) GetAlertChannel(ctx context.Context, userEmail, channel string) (*core.UserAlertChannel, error) {
	pool := r.dbGetter()
	if pool == nil {
		return nil, errors.New("postgres is not initialized")
	}

	row := pool.QueryRow(ctx,
		`SELECT user_email, channel, destination, enabled, notify_new_draft, notify_limit_filled, notify_closed, notify_invalidated
		 FROM user_alert_channels
		 WHERE user_email = $1 AND channel = $2`,
		userEmail, channel,
	)
	var ch core.UserAlertChannel
	err := row.Scan(&ch.UserEmail, &ch.Channel, &ch.Destination, &ch.Enabled, &ch.NotifyNewDraft, &ch.NotifyLimitFilled, &ch.NotifyClosed, &ch.NotifyInvalidated)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &ch, nil
}

func (r postgresRepository) ListAlertChannels(ctx context.Context, userEmail string) ([]core.UserAlertChannel, error) {
	pool := r.dbGetter()
	if pool == nil {
		return nil, errors.New("postgres is not initialized")
	}

	rows, err := pool.Query(ctx,
		`SELECT user_email, channel, destination, enabled, notify_new_draft, notify_limit_filled, notify_closed, notify_invalidated
		 FROM user_alert_channels
		 WHERE user_email = $1
		 ORDER BY channel`,
		userEmail,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	channels := make([]core.UserAlertChannel, 0)
	for rows.Next() {
		var ch core.UserAlertChannel
		if err := rows.Scan(&ch.UserEmail, &ch.Channel, &ch.Destination, &ch.Enabled, &ch.NotifyNewDraft, &ch.NotifyLimitFilled, &ch.NotifyClosed, &ch.NotifyInvalidated); err != nil {
			continue
		}
		channels = append(channels, ch)
	}
	return channels, nil
}

func (r postgresRepository) UpsertAlertChannel(ctx context.Context, userEmail string, req core.SaveAlertChannelRequest) error {
	pool := r.dbGetter()
	if pool == nil {
		return errors.New("postgres is not initialized")
	}

	_, err := pool.Exec(ctx,
		`INSERT INTO user_alert_channels (user_email, channel, destination, enabled, notify_new_draft, notify_limit_filled, notify_closed, notify_invalidated, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
		 ON CONFLICT (user_email, channel) DO UPDATE SET
		   destination = EXCLUDED.destination,
		   enabled = EXCLUDED.enabled,
		   notify_new_draft = EXCLUDED.notify_new_draft,
		   notify_limit_filled = EXCLUDED.notify_limit_filled,
		   notify_closed = EXCLUDED.notify_closed,
		   notify_invalidated = EXCLUDED.notify_invalidated,
		   updated_at = CURRENT_TIMESTAMP`,
		userEmail, req.Channel, req.Destination, req.Enabled, req.NotifyNewDraft, req.NotifyLimitFilled, req.NotifyClosed, req.NotifyInvalidated,
	)
	return err
}

func (r postgresRepository) GetSubscribersForTrigger(ctx context.Context, notifyColumn string) ([]core.UserAlertChannel, error) {
	pool := r.dbGetter()
	if pool == nil {
		return nil, errors.New("postgres is not initialized")
	}

	query := `SELECT user_email, channel, destination, enabled, notify_new_draft, notify_limit_filled, notify_closed, notify_invalidated
	         FROM user_alert_channels
	         WHERE ` + notifyColumn + ` = true AND enabled = true
	         ORDER BY user_email, channel`

	rows, err := pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	subscribers := make([]core.UserAlertChannel, 0)
	for rows.Next() {
		var ch core.UserAlertChannel
		if err := rows.Scan(&ch.UserEmail, &ch.Channel, &ch.Destination, &ch.Enabled, &ch.NotifyNewDraft, &ch.NotifyLimitFilled, &ch.NotifyClosed, &ch.NotifyInvalidated); err != nil {
			continue
		}
		subscribers = append(subscribers, ch)
	}
	return subscribers, nil
}
