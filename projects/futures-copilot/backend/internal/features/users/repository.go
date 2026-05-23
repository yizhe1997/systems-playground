package users

import (
	"context"
	"errors"
	"time"

	core "futures-copilot-mvp/internal/core"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	SyncUserRecord(ctx context.Context, req core.SyncUserRequest) (role string, isDisabled bool, createdAt string, err error)
	DisableUserByEmail(ctx context.Context, email string) error
}

type postgresRepository struct {
	dbGetter func() *pgxpool.Pool
}

func NewPostgresRepository(dbGetter func() *pgxpool.Pool) Repository {
	return postgresRepository{dbGetter: dbGetter}
}

func (r postgresRepository) SyncUserRecord(ctx context.Context, req core.SyncUserRequest) (string, bool, string, error) {
	pool := r.dbGetter()
	if pool == nil {
		return "", false, "", errors.New("postgres is not initialized")
	}

	const query = `
		INSERT INTO users (provider_id, email, name, last_logged_in)
		VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
		ON CONFLICT (email) DO UPDATE SET
			name = EXCLUDED.name,
			provider_id = EXCLUDED.provider_id,
			last_logged_in = CURRENT_TIMESTAMP
		RETURNING role, is_disabled, COALESCE(created_at, CURRENT_TIMESTAMP)
	`

	var role string
	var isDisabled bool
	var createdAt time.Time

	err := pool.QueryRow(ctx, query, req.ProviderID, req.Email, req.Name).Scan(&role, &isDisabled, &createdAt)
	if err != nil {
		return "", false, "", err
	}

	return role, isDisabled, createdAt.Format(time.RFC3339), nil
}

func (r postgresRepository) DisableUserByEmail(ctx context.Context, email string) error {
	pool := r.dbGetter()
	if pool == nil {
		return errors.New("postgres is not initialized")
	}

	const query = "UPDATE users SET is_disabled = true WHERE email = $1"
	_, err := pool.Exec(ctx, query, email)
	return err
}
