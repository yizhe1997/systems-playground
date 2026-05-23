package rubrics

import (
	"context"
	"errors"

	core "futures-copilot-mvp/internal/core"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Repository interface {
	ListRubrics(ctx context.Context) ([]core.Rubric, error)
	SaveRubricConfig(ctx context.Context, rubric core.Rubric) error
	DeleteRubricByID(ctx context.Context, id string) error
}

type postgresRepository struct {
	dbGetter func() *pgxpool.Pool
}

func NewPostgresRepository(dbGetter func() *pgxpool.Pool) Repository {
	return postgresRepository{dbGetter: dbGetter}
}

func (r postgresRepository) ListRubrics(ctx context.Context) ([]core.Rubric, error) {
	pool := r.dbGetter()
	if pool == nil {
		return nil, errors.New("postgres is not initialized")
	}

	const query = "SELECT id, name, rules FROM rubrics WHERE deleted_at IS NULL ORDER BY created_at DESC"
	rows, err := pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rubrics := make([]core.Rubric, 0)
	for rows.Next() {
		var rubric core.Rubric
		if err := rows.Scan(&rubric.ID, &rubric.Name, &rubric.Rules); err != nil {
			continue
		}
		rubrics = append(rubrics, rubric)
	}

	return rubrics, nil
}

func (r postgresRepository) SaveRubricConfig(ctx context.Context, rubric core.Rubric) error {
	pool := r.dbGetter()
	if pool == nil {
		return errors.New("postgres is not initialized")
	}

	const query = `
		INSERT INTO rubrics (id, name, rules)
		VALUES ($1, $2, $3)
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name,
			rules = EXCLUDED.rules,
			deleted_at = NULL
	`

	_, err := pool.Exec(ctx, query, rubric.ID, rubric.Name, rubric.Rules)
	return err
}

func (r postgresRepository) DeleteRubricByID(ctx context.Context, id string) error {
	pool := r.dbGetter()
	if pool == nil {
		return errors.New("postgres is not initialized")
	}

	const query = "UPDATE rubrics SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 AND deleted_at IS NULL"
	_, err := pool.Exec(ctx, query, id)
	return err
}
