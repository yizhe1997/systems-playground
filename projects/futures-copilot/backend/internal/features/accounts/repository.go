package accounts

import (
	"context"
	"errors"
	"time"

	core "futures-copilot-mvp/internal/core"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	ListAccounts(ctx context.Context) ([]core.AccountConfig, error)
	SaveAccountConfig(ctx context.Context, account core.AccountConfig) error
	DeleteAccountByID(ctx context.Context, id string) error
}

type postgresRepository struct {
	dbGetter func() *pgxpool.Pool
}

func NewPostgresRepository(dbGetter func() *pgxpool.Pool) Repository {
	return postgresRepository{dbGetter: dbGetter}
}

func (r postgresRepository) ListAccounts(ctx context.Context) ([]core.AccountConfig, error) {
	pool := r.dbGetter()
	if pool == nil {
		return nil, errors.New("postgres is not initialized")
	}

	const query = "SELECT id, type, current_balance, current_daily_stop_level, current_max_loss_level, rules_context, COALESCE(created_at, CURRENT_TIMESTAMP) FROM accounts WHERE deleted_at IS NULL ORDER BY created_at ASC"
	rows, err := pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	accounts := make([]core.AccountConfig, 0)
	for rows.Next() {
		var account core.AccountConfig
		var createdAt time.Time
		if err := rows.Scan(&account.ID, &account.Type, &account.CurrentBalance, &account.CurrentDailyStopLevel, &account.CurrentMaxLossLevel, &account.RulesContext, &createdAt); err != nil {
			continue
		}
		account.CreatedAt = createdAt.Format(time.RFC3339)
		accounts = append(accounts, account)
	}

	return accounts, nil
}

func (r postgresRepository) SaveAccountConfig(ctx context.Context, account core.AccountConfig) error {
	pool := r.dbGetter()
	if pool == nil {
		return errors.New("postgres is not initialized")
	}

	const query = `
		INSERT INTO accounts (id, type, current_balance, current_daily_stop_level, current_max_loss_level, rules_context)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (id) DO UPDATE SET
			type = EXCLUDED.type,
			current_balance = EXCLUDED.current_balance,
			current_daily_stop_level = EXCLUDED.current_daily_stop_level,
			current_max_loss_level = EXCLUDED.current_max_loss_level,
			rules_context = EXCLUDED.rules_context
	`

	_, err := pool.Exec(ctx, query, account.ID, account.Type, account.CurrentBalance, account.CurrentDailyStopLevel, account.CurrentMaxLossLevel, account.RulesContext)
	return err
}

func (r postgresRepository) DeleteAccountByID(ctx context.Context, id string) error {
	pool := r.dbGetter()
	if pool == nil {
		return errors.New("postgres is not initialized")
	}

	const query = "UPDATE accounts SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL"
	_, err := pool.Exec(ctx, query, id)
	return err
}
