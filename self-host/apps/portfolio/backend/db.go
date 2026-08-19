package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"path/filepath"
	"strings"

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

// leadsSchema backs the "Interested in working together?" contact form -
// deliberately much thinner than resume_requests: no triage, no approve/
// reject workflow, just an inbound message queue the operator works through
// manually (see leads.go). status is a plain operator-facing tracker
// ('new' / 'contacted' / 'archived'), not a gate on anything automated.
const leadsSchema = `
CREATE TABLE IF NOT EXISTS leads (
	id TEXT PRIMARY KEY,
	name TEXT NOT NULL DEFAULT '',
	email TEXT NOT NULL,
	message TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL DEFAULT 'new',
	created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
`

// auditLogSchema is a single, centralized log of admin actions across every
// resource (resume requests, config, CMS content, resume files) - added
// instead of created_by/updated_by columns on every individual table, since
// most of those (CMS content) aren't even row-based (see cms.go - each type
// is one whole-array blob in Redis), so a per-table "who touched this row"
// column doesn't fit. This is what answers "who did X and when".
const auditLogSchema = `
CREATE TABLE IF NOT EXISTS audit_log (
	id TEXT PRIMARY KEY,
	created_at INTEGER NOT NULL,
	actor TEXT NOT NULL DEFAULT '',
	action TEXT NOT NULL,
	target_type TEXT NOT NULL DEFAULT '',
	target_id TEXT NOT NULL DEFAULT '',
	detail TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
`

// resumeRequestsColumnMigrations adds columns to an already-existing
// resume_requests table - CREATE TABLE IF NOT EXISTS above only handles a
// fresh database, not new fields on a table that was already created by an
// earlier version of this schema. Each entry is applied with ALTER TABLE ...
// ADD COLUMN, ignoring "duplicate column" so re-running on every startup is
// a no-op once applied. There's no migration framework here - this is
// intentionally the simplest thing that works for a single-table, low-churn
// schema.
var resumeRequestsColumnMigrations = []string{
	"ALTER TABLE resume_requests ADD COLUMN hiring_agency TEXT NOT NULL DEFAULT ''",
	"ALTER TABLE resume_requests ADD COLUMN work_type TEXT NOT NULL DEFAULT ''",
	"ALTER TABLE resume_requests ADD COLUMN industry TEXT NOT NULL DEFAULT ''",
	"ALTER TABLE resume_requests ADD COLUMN salary_range TEXT NOT NULL DEFAULT ''",
	"ALTER TABLE resume_requests ADD COLUMN job_posting_url TEXT NOT NULL DEFAULT ''",
	"ALTER TABLE resume_requests ADD COLUMN updated_by TEXT NOT NULL DEFAULT ''",
}

// resumeRequestsColumnDrops removes columns the app no longer uses. This
// project hasn't shipped yet, so there's no real data or external consumer
// to preserve compatibility for - unlike the ADD list above, it's fine to
// actually clean these up instead of leaving them as vestigial data.
// Guarded the same way: ignore "no such column" so re-running is a no-op.
var resumeRequestsColumnDrops = []string{
	"ALTER TABLE resume_requests DROP COLUMN position",
	"ALTER TABLE resume_requests DROP COLUMN company_url",
}

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
	if _, err := conn.ExecContext(ctx, auditLogSchema); err != nil {
		log.Fatalf("❌ Failed to migrate SQLite schema: %v", err)
	}
	if _, err := conn.ExecContext(ctx, leadsSchema); err != nil {
		log.Fatalf("❌ Failed to migrate SQLite schema: %v", err)
	}
	for _, stmt := range resumeRequestsColumnMigrations {
		if _, err := conn.ExecContext(ctx, stmt); err != nil && !strings.Contains(err.Error(), "duplicate column name") {
			log.Fatalf("❌ Failed to apply SQLite column migration %q: %v", stmt, err)
		}
	}
	for _, stmt := range resumeRequestsColumnDrops {
		if _, err := conn.ExecContext(ctx, stmt); err != nil && !strings.Contains(err.Error(), "no such column") {
			log.Fatalf("❌ Failed to apply SQLite column drop %q: %v", stmt, err)
		}
	}

	db = conn
	log.Printf("✅ Connected to SQLite at %s", path)
}
