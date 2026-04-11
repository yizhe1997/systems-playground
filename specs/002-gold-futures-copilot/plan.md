# Implementation Plan: AI-Powered Gold Futures Trading Copilot and Signal Journal

**Branch**: `002-gold-futures-copilot` | **Date**: 2026-04-11 | **Spec**: `/specs/002-gold-futures-copilot/spec.md`
**Input**: Feature specification from `/specs/002-gold-futures-copilot/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Deliver a single-tenant Gold Futures signal platform where the creator can draft plans, run AI grading against a configurable rubric, publish gated signals, dispatch semi-automatic subscriber alerts, and submit post-trade journals that feed retrieval memory for future evaluations. The implementation is project-scoped under `projects/gold-futures-copilot/` per monorepo rules, with explicit platform integration touchpoints only (showcase listing + optional shell routing). Runtime architecture remains Go-centric: deterministic risk/math and workflow orchestration in project backend services, Next.js surfaces in project frontend (including project-local BFF/proxy handlers), Redis for cache/queueing support, Redpanda for event streams, and PostgreSQL (+ pgvector) for durable domain and memory retrieval data.

## Technical Context

**Language/Version**: Go 1.24 (backend) / Next.js 16 + TypeScript 5 (frontend)  
**Primary Dependencies**: Fiber v2, Redis (go-redis v9), Redpanda client, PostgreSQL driver + pgvector support (backend) / React 19, Tailwind CSS v4, shadcn/ui, NextAuth v4 (frontend)  
**Storage**: PostgreSQL (+ pgvector) for durable domain + retrieval memory, Redis for cache and short-lived dispatch state, Redpanda topics for domain events  
**Testing**: Backend `go test` (unit + service/integration), frontend component tests + Playwright critical flows, contract tests for BFF and alert dispatch payloads  
**Target Platform**: Self-hosted Docker Compose on Intel NUC (Linux amd64)
**Project Type**: Full-stack project module inside monorepo (`projects/gold-futures-copilot`) with platform showcase integration  
**Performance Goals**: 95% grading responses under 20s; 99% alert dispatch attempts initiated within 60s of creator status update; showroom page success rate >=99%  
**Constraints**: Must adhere to `docs/MONOREPO_GUIDE.md` project boundaries; no deep cross-project imports; integration through contracts only; no direct public exposure of Go API; no `NEXT_PUBLIC_*` secrets; Turbopack compatible; v1 manual subscription management (no payment gateway integration)  
**Scale/Scope**: Single-tenant creator; anonymous showroom + paid subscribers; Gold Futures only in v1

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify each gate; mark ✅ PASS or ❌ FAIL + justification:

| # | Principle | Gate Question | Status |
|---|-----------|---------------|--------|
| I | Separation of Concerns | Does this feature keep logic strictly within its layer (`/frontend`, `/backend`, or infra root)? No cross-layer imports? | ✅ PASS |
| II | Clean Architecture (Go) | If touching `/backend`: do handlers call only services, services call only repositories/clients, and no business logic in `main.go`? | ✅ PASS |
| III | Zero-Trust Security | If exposing an admin capability: is it gated by the BFF proxy + NextAuth RBAC? Is the Go API unreachable from the public internet? Does Docker label filtering apply? | ✅ PASS |
| IV | Scale-to-Zero | If adding a new infrastructure container: is it labelled `playground.widget=<name>` and managed by the Go control plane with an idle-shutdown timer? | ✅ PASS (N/A: no new widget containers) |
| V | Turbopack Compatibility | If touching `/frontend`: no new `webpack()` overrides in `next.config.ts`? Tailwind v4 for styling? Server Components default unless justified? | ✅ PASS |
| VI | Infrastructure as Code | Any new service added to `docker-compose.yml`? `.env.example` updated? `docs/DEVELOPER_GUIDE.md` updated? | ✅ PASS |

## Project Structure

### Documentation (this feature)

```text
specs/002-gold-futures-copilot/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
projects/
└── gold-futures-copilot/
	├── README.md
	├── ARCHITECTURE.md
	├── .env.example
	├── docker-compose.project.yml
	├── backend/
	│   ├── pkg/tradingcopilot/
	│   │   ├── handler.go        # Input validation + response mapping
	│   │   ├── service.go        # Plan grading/publish/journal orchestration
	│   │   ├── repository.go     # PostgreSQL persistence
	│   │   ├── rubric.go         # Rubric rule evaluation adapters
	│   │   ├── metrics.go        # Deterministic risk/performance engine
	│   │   ├── retrieval.go      # Similarity retrieval orchestration
	│   │   └── alerts.go         # Event + dispatch policy handling
	│   ├── pkg/events/
	│   │   └── redpanda.go       # Topic producer/consumer wrappers
	│   └── main.go               # Wiring only — no business logic
	├── frontend/
	│   ├── src/
	│   │   ├── app/
	│   │   │   ├── showroom/page.tsx
	│   │   │   └── creator/
	│   │   │       ├── plans/page.tsx
	│   │   │       ├── review/page.tsx
	│   │   │       ├── publish/page.tsx
	│   │   │       └── journal/page.tsx
	│   │   └── components/tradingcopilot/
	│   └── ...
	├── contracts/
	├── tests/
	└── scripts/

# Platform integration touchpoints (no project internals imported directly)
frontend/src/app/projects/page.tsx          # Register project card/showcase entry
docker-compose.yml                          # Compose inclusion/overlay references as needed
docs/DEVELOPER_GUIDE.md                     # Platform + project integration notes
```

**Structure Decision**: This feature remains full-stack but is implemented as an independent project at `projects/gold-futures-copilot/` following `docs/MONOREPO_GUIDE.md`. Project frontend defines its own proxy/BFF handlers for isolated runtime and extractability. Platform root code handles showcase registration and cross-project navigation only, while project logic and internals stay inside the project directory.

## Post-Design Constitution Check

Re-checked after creating `research.md`, `data-model.md`, `contracts/*`, and `quickstart.md`.

| # | Principle | Post-Design Status |
|---|-----------|--------------------|
| I | Separation of Concerns | ✅ PASS — Contracts separate frontend BFF and backend domain boundaries, and project internals are isolated under `projects/gold-futures-copilot/`. |
| II | Clean Architecture (Go) | ✅ PASS — Design artifacts maintain handler → service → repository/client layering. |
| III | Zero-Trust Security | ✅ PASS — Admin-only routes are BFF-gated with NextAuth RBAC; subscriber entitlements are server-checked. |
| IV | Scale-to-Zero | ✅ PASS (N/A) — No new demo widget containers introduced. |
| V | Turbopack Compatibility | ✅ PASS — Frontend plan uses App Router and avoids webpack customizations. |
| VI | Infrastructure as Code | ✅ PASS — Docker compose/env/doc updates are explicitly listed in scope. |

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
