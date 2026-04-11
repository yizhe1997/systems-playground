# Architecture: Gold Futures Copilot

## Purpose

Demonstrate a project-isolated trading copilot architecture with deterministic risk math, AI-assisted evaluation, and subscriber alert delivery.

## Components

- **Frontend**: Project-local Next.js app surfaces for creator, showroom, and subscriber settings.
- **Backend**: Go services for plan lifecycle, grading orchestration, alert dispatch, journaling, and retrieval memory updates.
- **Data stores / MQ**: PostgreSQL (+ pgvector), Redis, Redpanda.
- **External dependencies**: LLM/embedding provider APIs, Telegram/Discord/webhook endpoints.

## Boundaries

- This project MAY integrate with platform shell routing and project listing.
- This project MUST NOT be imported directly by other project internals.
- Integration with platform occurs via contracts and routing boundaries.

## Contracts

- API contract versioned in `contracts/api.yaml`.
- Event contracts versioned in `contracts/events.md`.

## Operational Notes

- Runtime requirements: Docker Compose + configured env vars.
- Scale-to-zero: No additional platform widget container lifecycle added in v1 scope.
- Observability: Latency and delivery SLO metrics captured in `backend/pkg/observability/metrics.go`.
- Audit trail: Core actions logged via `backend/pkg/audit/audit.go` (grading, publish, alert policy/dispatch).

## Extraction Plan

To extract as a standalone repository, move `projects/gold-futures-copilot/` with contracts intact and rewire platform shell links.
