package main

import (
	"context"
	"time"
)

type AccountsRepository interface {
	ListAccounts(ctx context.Context) ([]AccountConfig, error)
	SaveAccountConfig(ctx context.Context, account AccountConfig) error
	DeleteAccountByID(ctx context.Context, id string) error
}

type PostgresAccountsRepository struct{}

func (PostgresAccountsRepository) ListAccounts(ctx context.Context) ([]AccountConfig, error) {
	rows, err := db.Query(ctx, selectAccountsQuery)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	accounts := make([]AccountConfig, 0)
	for rows.Next() {
		var account AccountConfig
		var createdAt time.Time
		if err := rows.Scan(&account.ID, &account.Type, &account.CurrentBalance, &account.CurrentDailyStopLevel, &account.CurrentMaxLossLevel, &account.RulesContext, &createdAt); err != nil {
			continue
		}
		account.CreatedAt = createdAt.Format(time.RFC3339)
		accounts = append(accounts, account)
	}

	return accounts, nil
}

func (PostgresAccountsRepository) SaveAccountConfig(ctx context.Context, account AccountConfig) error {
	_, err := db.Exec(ctx, upsertAccountQuery, account.ID, account.Type, account.CurrentBalance, account.CurrentDailyStopLevel, account.CurrentMaxLossLevel, account.RulesContext)
	return err
}

func (PostgresAccountsRepository) DeleteAccountByID(ctx context.Context, id string) error {
	// Soft delete: mark as deleted without removing data
	_, err := db.Exec(ctx, softDeleteAccountQuery, id)
	return err
}

var accountsRepo AccountsRepository = PostgresAccountsRepository{}
