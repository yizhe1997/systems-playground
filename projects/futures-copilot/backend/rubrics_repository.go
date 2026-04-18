package main

import "context"

type RubricsRepository interface {
	ListRubrics(ctx context.Context) ([]Rubric, error)
	SaveRubricConfig(ctx context.Context, rubric Rubric) error
	DeleteRubricByID(ctx context.Context, id string) error
}

type PostgresRubricsRepository struct{}

func (PostgresRubricsRepository) ListRubrics(ctx context.Context) ([]Rubric, error) {
	rows, err := db.Query(ctx, selectRubricsQuery)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	rubrics := make([]Rubric, 0)
	for rows.Next() {
		var rubric Rubric
		if err := rows.Scan(&rubric.ID, &rubric.Name, &rubric.Rules, &rubric.PineScript); err != nil {
			continue
		}

		rubrics = append(rubrics, rubric)
	}

	return rubrics, nil
}

func (PostgresRubricsRepository) SaveRubricConfig(ctx context.Context, rubric Rubric) error {
	_, err := db.Exec(ctx, upsertRubricQuery, rubric.ID, rubric.Name, rubric.Rules, rubric.PineScript)
	return err
}

func (PostgresRubricsRepository) DeleteRubricByID(ctx context.Context, id string) error {
	_, err := db.Exec(ctx, deleteRubricQuery, id)
	return err
}

var rubricsRepo RubricsRepository = PostgresRubricsRepository{}
