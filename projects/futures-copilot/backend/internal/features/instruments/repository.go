package instruments

import (
	"context"
	"errors"
	"strings"
	"time"

	core "futures-copilot-mvp/internal/core"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	ListInstruments(ctx context.Context) ([]core.InstrumentDefinition, error)
	SaveInstrument(ctx context.Context, instrument core.InstrumentDefinition) error
	DeleteInstrument(ctx context.Context, code string) error
}

type postgresRepository struct {
	dbGetter func() *pgxpool.Pool
}

func NewPostgresRepository(dbGetter func() *pgxpool.Pool) Repository {
	return postgresRepository{dbGetter: dbGetter}
}

func (r postgresRepository) ListInstruments(ctx context.Context) ([]core.InstrumentDefinition, error) {
	pool := r.dbGetter()
	if pool == nil {
		return nil, errors.New("postgres is not initialized")
	}

	const query = `
		SELECT code, COALESCE(point_value, 10.0), COALESCE(created_at, CURRENT_TIMESTAMP)
		FROM instruments
		WHERE deleted_at IS NULL
		ORDER BY code ASC
	`
	rows, err := pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	instruments := make([]core.InstrumentDefinition, 0)
	for rows.Next() {
		var instrument core.InstrumentDefinition
		var createdAt time.Time
		if err := rows.Scan(&instrument.Code, &instrument.PointValue, &createdAt); err != nil {
			continue
		}
		instrument.CreatedAt = createdAt.Format(time.RFC3339)
		instruments = append(instruments, instrument)
	}

	return instruments, nil
}

func (r postgresRepository) SaveInstrument(ctx context.Context, instrument core.InstrumentDefinition) error {
	pool := r.dbGetter()
	if pool == nil {
		return errors.New("postgres is not initialized")
	}

	const query = `
		INSERT INTO instruments (code, point_value)
		VALUES ($1, $2)
		ON CONFLICT (code) DO UPDATE SET
			point_value = EXCLUDED.point_value,
			deleted_at = NULL
	`
	_, err := pool.Exec(ctx, query, instrument.Code, instrument.PointValue)
	return err
}

func (r postgresRepository) DeleteInstrument(ctx context.Context, code string) error {
	pool := r.dbGetter()
	if pool == nil {
		return errors.New("postgres is not initialized")
	}

	const query = "UPDATE instruments SET deleted_at = CURRENT_TIMESTAMP WHERE code = $1 AND deleted_at IS NULL"
	_, err := pool.Exec(ctx, query, strings.TrimSpace(code))
	return err
}
