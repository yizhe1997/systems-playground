package main

import "context"

type UsersRepository interface {
	SyncUserRecord(ctx context.Context, req syncUserRequest) (role string, isDisabled bool, err error)
	DisableUserByEmail(ctx context.Context, email string) error
}

type PostgresUsersRepository struct{}

func (PostgresUsersRepository) SyncUserRecord(ctx context.Context, req syncUserRequest) (string, bool, error) {
	var role string
	var isDisabled bool

	err := db.QueryRow(ctx, syncUserQuery, req.ProviderID, req.Email, req.Name).Scan(&role, &isDisabled)
	if err != nil {
		return "", false, err
	}

	return role, isDisabled, nil
}

func (PostgresUsersRepository) DisableUserByEmail(ctx context.Context, email string) error {
	_, err := db.Exec(ctx, disableUserQuery, email)
	return err
}

var usersRepo UsersRepository = PostgresUsersRepository{}
