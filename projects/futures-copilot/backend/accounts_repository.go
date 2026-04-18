package main

import "context"

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
		if err := rows.Scan(&account.ID, &account.Type, &account.CurrentBalance, &account.CurrentDailyStopLevel, &account.CurrentMaxLossLevel, &account.RulesContext); err != nil {
			continue
		}

		accounts = append(accounts, account)
	}

	return accounts, nil
}

func (PostgresAccountsRepository) SaveAccountConfig(ctx context.Context, account AccountConfig) error {
	_, err := db.Exec(ctx, upsertAccountQuery, account.ID, account.Type, account.CurrentBalance, account.CurrentDailyStopLevel, account.CurrentMaxLossLevel, account.RulesContext)
	return err
}

func (PostgresAccountsRepository) DeleteAccountByID(ctx context.Context, id string) error {
	// Preserve explicit cascade intent from prior implementation.
	db.Exec(ctx, deleteTradeOutcomesByAccountQuery, id)
	db.Exec(ctx, deleteTradePlanEditsByAccountQuery, id)
	db.Exec(ctx, deleteTradePlansByAccountQuery, id)

	_, err := db.Exec(ctx, deleteAccountQuery, id)
	return err
}

var accountsRepo AccountsRepository = PostgresAccountsRepository{}
