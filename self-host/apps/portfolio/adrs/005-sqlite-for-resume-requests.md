# ADR 005: SQLite for Resume Request Storage

**Date:** 2026-07-30
**Status:** Accepted

## Context

`resume_requests` started as a single Redis List of JSON blobs — reasonable when the record was just `{name, email, company, reason, status}` and volume was near-zero. Adding AI-assisted triage (see the "How It Works" pivot referenced in the operator's vault) grew the record to include triage status, model used, legitimacy verdict, retry counts, and a 30-day retention window measured from creation time regardless of status.

At that point the list-of-blobs shape stopped being a data store and became a workaround: every read is a full `LRANGE` + linear scan for the matching ID, every write requires re-resolving that scan result to an index immediately before `LSET` (added specifically to avoid corruption from the retention sweep rebuilding the list concurrently), and there's no way to query "give me every pending request older than X" without loading and filtering the whole list in Go.

## Options Considered

1. **Stay in Redis, fix the shape** — move to a hash per request (`resume_request:<id>`) plus a sorted-set index by `created_at`. No new infrastructure, but still no real relational queries, and it's a second, Redis-specific pattern to maintain alongside the CMS config keys already living there.
2. **PostgreSQL** — full relational database: proper concurrent-writer support, advanced querying (JSONB, full-text search, replication). None of which this workload currently needs — traffic is portfolio-tier (dozens of requests a year at most) and there is exactly one backend instance writing to it.
3. **SQLite (chosen)** — a real relational schema and query interface, with none of the operational cost of a client-server database: no new container, no new credentials, no new port. It's a file, and it rides along with whatever already backs up the host's volumes.

## Decision

**SQLite**, via `modernc.org/sqlite` — the pure-Go driver, required because the backend's `Dockerfile` builds with `CGO_ENABLED=0` (a deliberate choice for a small, dependency-free final image; a CGO-based driver like `mattn/go-sqlite3` wouldn't build under that constraint without reintroducing a C toolchain into the image). Redis is unaffected and keeps doing what it already does well — CMS config (`GetConfig`/`SetConfig`) and general caching; this is a storage-layer swap for one table, not a "replace Redis" decision.

To keep a future move to Postgres cheap if it's ever needed, the code stays on Go's standard `database/sql` interface with portable SQL (no SQLite-only pragmas in query paths) rather than an SQLite-specific query builder or ORM.

## Reasoning

1. **Matches the actual architecture.** Every app in this stack is self-hosted, single-instance, on hardware the operator personally operates. SQLite's single-writer model is a non-issue there; it would become the actual blocker the moment a second app instance needed to write concurrently — which is also exactly the point at which a client-server database like Postgres becomes necessary, not optional. That's a real future trigger, not a preemptive build.
2. **No feature Postgres offers is needed today.** No concurrent writers, no JSONB/full-text/replication requirements. Provisioning it now would be paying its operational cost (another container, another credential, another backup target) for capability this workload doesn't use.
3. **Migration path stays cheap by construction.** Because the schema is one table and the volume is small (dozens to low hundreds of rows even in an optimistic year), a future SQLite → Postgres move is a short script that reads every row through `database/sql` and re-inserts it through the same interface against a Postgres DSN — not a data-migration project. Writing portable SQL now instead of leaning on SQLite-specific syntax is the only thing done today to keep that option open.

## Consequences

- Added `backend/db.go`: opens the SQLite file (path from `SQLITE_PATH`, defaulting to `./data/portfolio.db`), runs an idempotent `CREATE TABLE IF NOT EXISTS` migration for `resume_requests`, and caps the connection pool at one open connection (SQLite serializes writers regardless; a single shared connection avoids spurious "database is locked" errors under Go's default pooling).
- `backend/resume.go`'s `findResumeRequest`/`saveResumeRequest` and the submit/list/action/retriage/status handlers and the retention sweep now run SQL against `resume_requests` instead of Redis list operations. `backend/triage.go` is unaffected — it only calls those two helpers, not Redis directly.
- `docker-compose.yml` gains a persistent volume for the SQLite file (same pattern as `redis_data`) and a `SQLITE_PATH` env var.
- `go.mod` gains `modernc.org/sqlite`.
