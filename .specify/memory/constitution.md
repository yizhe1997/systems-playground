<!--
SYNC IMPACT REPORT
==================
Version change: N/A → 1.0.0 (initial ratification)

Modified principles: N/A (first-time authoring from template)

Added sections:
  - Core Principles (VI total)
  - Technology Constraints
  - Development Workflow
  - Governance

Removed sections: N/A

Templates reviewed and updated:
  - .specify/templates/plan-template.md       ✅ updated (Constitution Check gates aligned)
  - .specify/templates/spec-template.md       ✅ updated (tech-stack constraints section added)
  - .specify/templates/tasks-template.md      ✅ updated (path conventions aligned to monorepo)
  - .specify/templates/agent-file-template.md ✅ updated (frontend/backend project structure)
  - frontend/AGENTS.md                        ✅ no change required (already warns re Next.js version)

Follow-up TODOs:
  - None. All fields resolved from repo context and user input.
-->

# Systems Playground Constitution

## Core Principles

### I. Strict Separation of Concerns

The monorepo is organised into three INVIOLABLE layers — **frontend** (`/frontend`),
**backend** (`/backend`), and **infrastructure** (root `docker-compose*.yml`, `.github/`).

- Frontend MUST NOT contain business logic; it MUST be restricted to UI rendering,
  client-side state, and BFF proxy route handlers.
- Backend MUST NOT import or reference any frontend code or assets.
- Infrastructure configuration MUST NOT be embedded inside application source files.
- Cross-layer communication MUST occur only through documented API contracts (REST/WebSocket)
  and environment variables; no shared source packages across layers.
- New packages/modules added to `/backend` MUST reside under `backend/pkg/` or
  `backend/internal/` and be independently testable.

**Rationale**: Violating these boundaries couples release cycles, makes the Docker
image build graph non-deterministic, and obscures the architecture that the portfolio
is designed to demonstrate.

### II. Clean Architecture for Go

The Go backend (`/backend`) MUST follow a layered dependency rule:

```
Handler → Service → Repository/Client → External (Docker, Redis, RabbitMQ)
```

- Handlers (Fiber route controllers) MUST NOT call external clients directly.
- Business logic MUST live in a `service` layer; handlers MUST only validate input,
  call the service, and format the HTTP response.
- External integrations (Docker SDK, Redis, AMQP) MUST be abstracted behind interfaces
  so they can be substituted in tests without live infrastructure.
- `main.go` MUST only bootstrap: wire dependencies, configure middleware, and start
  the server. It MUST NOT contain business logic.
- All exported functions and types MUST carry a doc comment.

**Rationale**: Clean layering ensures each concern can evolve independently, keeps
unit tests fast (no Docker socket required), and demonstrates the architecture depth
required of a senior-level engineer portfolio.

### III. Zero-Trust Security (BFF + Docker Socket Isolation)

All privileged operations MUST be gated by the Backend-For-Frontend (BFF) proxy
pattern established in ADR 002.

- The Golang API MUST NEVER be reachable from the public internet directly; it MUST
  be accessible only from the Next.js Node.js server container (internal Docker network).
- Secrets and API keys MUST NEVER appear in code, git history, or any
  `NEXT_PUBLIC_*` environment variable.
- The Docker socket integration MUST filter containers by the label
  `playground.widget=<name>`, ensuring the control plane can NEVER act on
  non-portfolio containers running on the host NUC.
- NextAuth session cookies MUST be HTTP-only and verified server-side before any
  admin proxy request is forwarded.
- Role-based access MUST be enforced at the BFF route handler layer, not only the UI.

**Rationale**: The Docker socket grants effective root on the host machine. A single
compromised PSK exposed in the browser would give an attacker full control over
non-portfolio home-server services running on the same NUC. Defense in depth is
non-negotiable. (See ADR 001, ADR 002.)

### IV. Scale-to-Zero First (Resource Conservation)

All infrastructure containers that are not permanently required MUST support
automated scale-to-zero lifecycle management via the Go control plane.

- Heavy containers (Redis, RabbitMQ, and any future demo widgets) MUST be labelled
  `playground.widget=<name>` and MUST be started/stopped on demand by the Go API.
- The Go API MUST implement an inactivity timer: containers MUST be stopped
  automatically after a configurable idle period (default: 5 minutes).
- New demo widgets MUST document their idle-shutdown behaviour in their feature spec.
- `docker-compose.yml` profiles MUST be used to prevent heavy containers from
  starting unconditionally on `docker-compose up`.

**Rationale**: The deployment target is a resource-constrained Intel NUC. Running
all demo infrastructure 24/7 will exhaust available RAM and crash the host.
Scale-to-zero is a first-class architectural requirement, not an optimisation.
(See ADR 001.)

### V. Turbopack-Compatible Frontend Development

All Next.js 16 (App Router) code MUST be compatible with Turbopack as the primary
development and build bundler.

- `next.config.ts` MUST keep `turbopack: {}` (or equivalent) enabled; disabling it
  to work around a compatibility issue is PROHIBITED — fix the root cause instead.
- Custom webpack plugins, loaders, or `webpack()` overrides in `next.config.ts`
  MUST NOT be introduced without a documented ADR justifying why a Turbopack
  alternative is unavailable.
- CSS MUST be authored in Tailwind CSS v4 utility classes; arbitrary CSS-in-JS
  libraries that require special bundler transforms are PROHIBITED.
- Server Components are the default; Client Components (`"use client"`) MUST ONLY
  be used when browser APIs or interactivity genuinely require it — document the
  reason in a code comment.
- Dynamic imports (`next/dynamic`) MUST be used for heavy third-party widgets to
  avoid blocking the initial bundle.

**Rationale**: Turbopack delivers up to 10× faster local iteration than webpack.
Introducing webpack-only constructs silently degrades DX and may cause production
build failures as the ecosystem migrates.

### VI. Infrastructure as Code + Reproducible Deployments

All infrastructure MUST be fully declarative and version-controlled.

- Docker Compose files (`docker-compose.yml`, `docker-compose.prod.yml`,
  `docker-compose.override.yml`) are the single source of truth for service
  configuration. Ad-hoc `docker run` commands MUST NOT be used to configure
  persistent services.
- GitHub Actions workflows MUST be the sole mechanism for building and pushing
  production Docker images; manual `docker push` to any production registry
  is PROHIBITED.
- Environment-specific variables MUST be managed via `.env` files (gitignored) and
  documented in `.env.example`; secrets MUST be stored in GitHub Actions Secrets or
  host-level environment, never committed.
- Any new infrastructure component MUST include a corresponding entry in the
  developer guide (`docs/DEVELOPER_GUIDE.md`) before the PR is merged.

**Rationale**: Reproducibility eliminates "works on my machine" failures and
ensures the NUC deployment can be fully reconstructed from the repository alone
after a hardware failure.

## Technology Constraints

These versions are PINNED for this project and MUST NOT be changed without an ADR:

| Layer | Technology | Pinned Version |
|---|---|---|
| Frontend runtime | Next.js | 16.x (App Router) |
| Frontend runtime | React | 19.x |
| Frontend language | TypeScript | 5.x |
| Frontend styling | Tailwind CSS | 4.x |
| Frontend components | shadcn/ui | latest compatible with Next.js 16 |
| Frontend auth | NextAuth | 4.x |
| Backend language | Go | 1.24.x |
| Backend framework | Fiber | v2 |
| Backend cache | Redis (go-redis v9) | latest patch |
| Backend messaging | RabbitMQ (amqp091-go) | latest patch |
| Backend container SDK | docker/docker | v24.x |
| Infrastructure | Docker Compose | v2 syntax |

Third-party UI packages (lucide-react, sonner, etc.) may be updated freely within
their major version. Breaking major-version upgrades require a feature branch and
passing CI before merging to `main`.

## Development Workflow

- `main` is the production branch. All work MUST occur on a feature branch named
  `<issue-number>-<kebab-case-description>` (e.g., `42-rabbitmq-demo-widget`).
- Pull Requests MUST pass all GitHub Actions CI checks before merge.
- Every new feature MUST have a corresponding spec under `.specify/specs/` following
  the speckit workflow (`speckit.specify` → `speckit.plan` → `speckit.tasks` →
  `speckit.implement`).
- Breaking API changes between frontend and backend MUST be coordinated in a single
  PR with both sides updated atomically.
- Local development MUST use `docker-compose up --build` from the repository root;
  running individual services outside Docker is permitted for fast iteration but the
  full-stack Docker build MUST pass before a PR is raised.

## Governance

This constitution supersedes all informal conventions. Amendments follow the
procedure below:

1. Open a GitHub Issue describing the proposed change and the principle it affects.
2. Draft the updated constitution section and open a PR against `main` with the
   amended `.specify/memory/constitution.md`.
3. The PR description MUST include: rationale, impact on existing features, and
   a migration plan if existing code violates the new rule.
4. At least one self-review and CI green is required before merge.
5. After merge, the Sync Impact Report comment in this file MUST be updated to
   reflect the new version.

**Versioning policy** (semantic):

- **MAJOR** — Backward-incompatible governance change: a principle removed,
  renamed with different intent, or a technology constraint broken.
- **MINOR** — New principle or section added; material expansion of an existing
  principle.
- **PATCH** — Clarification, wording improvement, typo fix, non-semantic refinement.

All PRs and code reviews MUST verify compliance with the principles above.
Complexity that violates a principle MUST be justified in the PR description and,
if accepted, logged in a new ADR under `docs/adrs/`.

Use `docs/DEVELOPER_GUIDE.md` for runtime development guidance. Use
`frontend/AGENTS.md` for AI-agent-specific Next.js guidance.

**Version**: 1.0.0 | **Ratified**: 2026-04-03 | **Last Amended**: 2026-04-03
