# Decisions

Dated decisions for the code (constitution principle VIII). Earlier product decisions are in
`research/12-owner-decisions.md`; feature decisions and their alternatives are in each feature's `research.md`.

| Date | Decision | Reason |
|---|---|---|
| 2026-10-04 | Pinned versions at implementation: Go 1.26, PostgreSQL 18, Node 24, Next.js 16.3, React 19.3, Playwright 1.63, Fiber 2.52, pgx 5.11, goose 3.28, shopspring/decimal 1.4 | The plan said "current stable at implementation, recorded here". Versions come from the registries on this date |
| 2026-10-04 | The API container listens on all of its own interfaces; the loopback-only rule is enforced where the ports are published (`127.0.0.1:...` in `docker-compose.yml`) | A process bound to the container's loopback is unreachable through a published port. SC-009 is about published ports |
| 2026-10-04 | PostgreSQL 18 data volume is mounted at `/var/lib/postgresql` | That is where the 18 images keep their versioned data folder |
| 2026-10-04 | Rules that decide numbers live in SQL functions; money crosses the API as exact decimal strings | One definition for the screen preview, the saved figures and feature 001 (see `specs/000-log-trades/research.md`) |
