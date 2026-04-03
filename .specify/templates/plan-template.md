# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: Go 1.24 (backend) / Next.js 16 + TypeScript 5 (frontend) — update only if feature is layer-specific  
**Primary Dependencies**: Fiber v2 (backend) / React 19, Tailwind CSS v4, shadcn/ui, NextAuth v4 (frontend)  
**Storage**: Redis (go-redis v9) for caching/state, RabbitMQ (amqp091-go) for events — or N/A  
**Testing**: `go test` + table-driven tests (backend) / Jest or Playwright (frontend) — or NEEDS CLARIFICATION  
**Target Platform**: Self-hosted Docker Compose on Intel NUC (Linux amd64)
**Project Type**: full-stack web service / interactive demo widget  
**Performance Goals**: Idle containers stopped within 5 min; BFF proxy response <200ms p95  
**Constraints**: No direct public exposure of Go API; no `NEXT_PUBLIC_*` secrets; Turbopack compatible  
**Scale/Scope**: Single NUC host; demo widgets intended for one concurrent active user at a time

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify each gate; mark ✅ PASS or ❌ FAIL + justification:

| # | Principle | Gate Question | Status |
|---|-----------|---------------|--------|
| I | Separation of Concerns | Does this feature keep logic strictly within its layer (`/frontend`, `/backend`, or infra root)? No cross-layer imports? | [ ] |
| II | Clean Architecture (Go) | If touching `/backend`: do handlers call only services, services call only repositories/clients, and no business logic in `main.go`? | [ ] |
| III | Zero-Trust Security | If exposing an admin capability: is it gated by the BFF proxy + NextAuth RBAC? Is the Go API unreachable from the public internet? Does Docker label filtering apply? | [ ] |
| IV | Scale-to-Zero | If adding a new infrastructure container: is it labelled `playground.widget=<name>` and managed by the Go control plane with an idle-shutdown timer? | [ ] |
| V | Turbopack Compatibility | If touching `/frontend`: no new `webpack()` overrides in `next.config.ts`? Tailwind v4 for styling? Server Components default unless justified? | [ ] |
| VI | Infrastructure as Code | Any new service added to `docker-compose.yml`? `.env.example` updated? `docs/DEVELOPER_GUIDE.md` updated? | [ ] |

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. This project is a monorepo — default to the web-app structure
  below. Remove layers that are not touched by this feature.
-->

```text
# Default: Systems Playground monorepo (web-app)
backend/
├── pkg/<feature>/        # New packages go here
│   ├── handler.go        # Fiber route handlers (input validation + response only)
│   ├── service.go        # Business logic
│   └── repository.go     # External client abstractions (Redis, RabbitMQ, Docker)
└── main.go               # Wiring only — no business logic

frontend/
├── src/
│   ├── app/
│   │   ├── <feature>/
│   │   │   └── page.tsx  # Server Component by default
│   │   └── api/
│   │       └── proxy/    # BFF proxy routes (server-side only)
│   └── components/
│       └── <feature>/    # Client Components — "use client" with comment justifying it
└── ...

# Infrastructure (only if new containers added)
docker-compose.yml        # Add with playground.widget=<name> label + profile
.env.example              # Document new env vars
docs/DEVELOPER_GUIDE.md   # Document new service
```

**Structure Decision**: [Document the selected layers and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
