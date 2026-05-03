package main

import (
	"context"
	"strings"
	"time"
)

type InstrumentsRepository interface {
	ListInstruments(ctx context.Context) ([]InstrumentDefinition, error)
	SaveInstrument(ctx context.Context, instrument InstrumentDefinition) error
	DeleteInstrument(ctx context.Context, code string) error
}

type PostgresInstrumentsRepository struct{}

func (PostgresInstrumentsRepository) ListInstruments(ctx context.Context) ([]InstrumentDefinition, error) {
	rows, err := db.Query(ctx, selectInstrumentsQuery)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	instruments := make([]InstrumentDefinition, 0)
	for rows.Next() {
		var instrument InstrumentDefinition
		var createdAt time.Time
		if err := rows.Scan(&instrument.Code, &instrument.PointValue, &createdAt); err != nil {
			continue
		}
		instrument.CreatedAt = createdAt.Format(time.RFC3339)
		instruments = append(instruments, instrument)
	}

	return instruments, nil
}

func (PostgresInstrumentsRepository) SaveInstrument(ctx context.Context, instrument InstrumentDefinition) error {
	_, err := db.Exec(ctx, upsertInstrumentQuery, instrument.Code, instrument.PointValue)
	return err
}

func (PostgresInstrumentsRepository) DeleteInstrument(ctx context.Context, code string) error {
	_, err := db.Exec(ctx, softDeleteInstrumentQuery, strings.TrimSpace(code))
	return err
}

var instrumentsRepo InstrumentsRepository = PostgresInstrumentsRepository{}
