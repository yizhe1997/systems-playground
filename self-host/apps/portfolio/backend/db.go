package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

var db *sql.DB

const resumeRequestsSchema = `
CREATE TABLE IF NOT EXISTS resume_requests (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
	email TEXT NOT NULL,
	company TEXT NOT NULL,
	reason TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL DEFAULT 'pending',
	created_at INTEGER NOT NULL,
	triage_status TEXT NOT NULL DEFAULT 'queued',
	ai_model TEXT NOT NULL DEFAULT '',
	legitimacy TEXT NOT NULL DEFAULT '',
	legitimacy_reason TEXT NOT NULL DEFAULT '',
	role_fit_summary TEXT NOT NULL DEFAULT '',
	triage_error TEXT NOT NULL DEFAULT '',
	triage_attempts INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_resume_requests_created_at ON resume_requests(created_at);
`

func initDB() {
	path := os.Getenv("SQLITE_PATH")
	if path == "" {
		path = "./data/portfolio.db" // fallback for local dev without compose
	}

	if dir := filepath.Dir(path); dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			log.Fatalf("❌ Failed to create SQLite data directory %s: %v", dir, err)
		}
	}

	conn, err := sql.Open("sqlite", path)
	if err != nil {
		log.Fatalf("❌ Failed to open SQLite database at %s: %v", path, err)
	}

	// SQLite serializes writers regardless of pool size; capping the pool at
	// one connection avoids spurious "database is locked" errors under Go's
	// default connection pooling, and busy_timeout covers the rest.
	conn.SetMaxOpenConns(1)

	ctx := context.Background()
	if _, err := conn.ExecContext(ctx, "PRAGMA journal_mode = WAL"); err != nil {
		log.Fatalf("❌ Failed to set SQLite journal mode: %v", err)
	}
	if _, err := conn.ExecContext(ctx, "PRAGMA busy_timeout = 5000"); err != nil {
		log.Fatalf("❌ Failed to set SQLite busy timeout: %v", err)
	}
	if _, err := conn.ExecContext(ctx, resumeRequestsSchema); err != nil {
		log.Fatalf("❌ Failed to migrate SQLite schema: %v", err)
	}

	db = conn
	log.Printf("✅ Connected to SQLite at %s", path)
}
