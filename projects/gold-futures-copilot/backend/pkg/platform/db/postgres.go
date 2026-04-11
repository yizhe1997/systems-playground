package db

import (
	"context"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/yizhe1997/systems-playground/projects/gold-futures-copilot/backend/pkg/config"
)

const (
	maxRetries    = 12
	retryBaseWait = 2 * time.Second
	retryMaxWait  = 30 * time.Second
)

func ConnectAndMigrate(ctx context.Context, cfg config.Config) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, cfg.PostgresURL)
	if err != nil {
		return nil, fmt.Errorf("open pool: %w", err)
	}

	if err := pingWithRetry(ctx, pool); err != nil {
		pool.Close()
		return nil, err
	}

	if err := runMigrations(ctx, pool, cfg.MigrationsDir); err != nil {
		pool.Close()
		return nil, err
	}

	return pool, nil
}

func pingWithRetry(ctx context.Context, pool *pgxpool.Pool) error {
	wait := retryBaseWait
	for attempt := 1; attempt <= maxRetries; attempt++ {
		if err := pool.Ping(ctx); err == nil {
			return nil
		} else if attempt == maxRetries {
			return fmt.Errorf("ping postgres: %w (gave up after %d attempts)", err, maxRetries)
		}
		log.Printf("postgres not ready (attempt %d/%d), retrying in %s...", attempt, maxRetries, wait)
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(wait):
		}
		wait *= 2
		if wait > retryMaxWait {
			wait = retryMaxWait
		}
	}
	return nil
}

func runMigrations(ctx context.Context, pool *pgxpool.Pool, dir string) error {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return fmt.Errorf("read migrations dir %q: %w", dir, err)
	}

	var files []string
	for _, e := range entries {
		if e.IsDir() {
			continue
		}
		if strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, filepath.Join(dir, e.Name()))
		}
	}
	sort.Strings(files)

	for _, path := range files {
		payload, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read migration %q: %w", path, err)
		}
		if strings.TrimSpace(string(payload)) == "" {
			continue
		}
		if _, err := pool.Exec(ctx, string(payload)); err != nil {
			return fmt.Errorf("execute migration %q: %w", path, err)
		}
	}

	return nil
}
