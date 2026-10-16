package store

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"tradecraft/migrations"
)

// Migrate applies every pending migration. Goose runs each migration file in one transaction (a trigger-driven
// recompute of trading days happens inside that same transaction), so a failing step changes nothing. The caller
// stops the API on error and says so plainly (FR-025).
func Migrate(ctx context.Context, databaseURL string) error {
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return fmt.Errorf("could not open the database: %w", err)
	}
	defer db.Close()
	provider, err := goose.NewProvider(goose.DialectPostgres, db, migrations.FS)
	if err != nil {
		return fmt.Errorf("could not read the migrations: %w", err)
	}
	if _, err := provider.Up(ctx); err != nil {
		return fmt.Errorf("a database migration failed and the step was rolled back: %w", err)
	}
	return nil
}

var _ = stdlib.GetDefaultDriver // registers the "pgx" driver name
