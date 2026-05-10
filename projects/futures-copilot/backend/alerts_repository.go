package main

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
)

type AlertsRepository interface {
	GetAlertChannel(ctx context.Context, userEmail, channel string) (*UserAlertChannel, error)
	ListAlertChannels(ctx context.Context, userEmail string) ([]UserAlertChannel, error)
	UpsertAlertChannel(ctx context.Context, userEmail string, req saveAlertChannelRequest) error
	GetSubscribersForTrigger(ctx context.Context, notifyColumn string) ([]UserAlertChannel, error)
}

type PostgresAlertsRepository struct{}

func (PostgresAlertsRepository) GetAlertChannel(ctx context.Context, userEmail, channel string) (*UserAlertChannel, error) {
	row := db.QueryRow(ctx,
		`SELECT user_email, channel, destination, enabled, notify_new_draft, notify_limit_filled, notify_closed, notify_invalidated
		 FROM user_alert_channels
		 WHERE user_email = $1 AND channel = $2`,
		userEmail, channel,
	)
	var ch UserAlertChannel
	err := row.Scan(&ch.UserEmail, &ch.Channel, &ch.Destination, &ch.Enabled, &ch.NotifyNewDraft, &ch.NotifyLimitFilled, &ch.NotifyClosed, &ch.NotifyInvalidated)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return &ch, nil
}

func (PostgresAlertsRepository) ListAlertChannels(ctx context.Context, userEmail string) ([]UserAlertChannel, error) {
	rows, err := db.Query(ctx,
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

	channels := make([]UserAlertChannel, 0)
	for rows.Next() {
		var ch UserAlertChannel
		if err := rows.Scan(&ch.UserEmail, &ch.Channel, &ch.Destination, &ch.Enabled, &ch.NotifyNewDraft, &ch.NotifyLimitFilled, &ch.NotifyClosed, &ch.NotifyInvalidated); err != nil {
			continue
		}
		channels = append(channels, ch)
	}
	return channels, nil
}

func (PostgresAlertsRepository) UpsertAlertChannel(ctx context.Context, userEmail string, req saveAlertChannelRequest) error {
	_, err := db.Exec(ctx,
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

func (PostgresAlertsRepository) GetSubscribersForTrigger(ctx context.Context, notifyColumn string) ([]UserAlertChannel, error) {
	// notifyColumn is one of: "notify_new_draft", "notify_limit_filled", "notify_closed", "notify_invalidated"
	query := `SELECT user_email, channel, destination, enabled, notify_new_draft, notify_limit_filled, notify_closed, notify_invalidated
	         FROM user_alert_channels
	         WHERE ` + notifyColumn + ` = true AND enabled = true
	         ORDER BY user_email, channel`

	rows, err := db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	subscribers := make([]UserAlertChannel, 0)
	for rows.Next() {
		var ch UserAlertChannel
		if err := rows.Scan(&ch.UserEmail, &ch.Channel, &ch.Destination, &ch.Enabled, &ch.NotifyNewDraft, &ch.NotifyLimitFilled, &ch.NotifyClosed, &ch.NotifyInvalidated); err != nil {
			continue
		}
		subscribers = append(subscribers, ch)
	}
	return subscribers, nil
}

var alertsRepo AlertsRepository = PostgresAlertsRepository{}
