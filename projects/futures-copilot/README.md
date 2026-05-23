# Futures Copilot

Futures Copilot is a full-stack project inside the systems-playground monorepo.

- **Backend:** Go + Fiber + Postgres + Redis
- **Frontend:** Next.js
- **Infra/dev orchestration:** Docker Compose

## Architecture

This project follows a **modular monolith** style with clear slice boundaries.

### Backend layout (`backend/`)

The backend is intentionally split into composition, feature slices, and platform adapters.

```text
backend/
├── cmd/
│   └── server/
│       └── main.go                # Legacy binary shim/launcher
├── internal/
│   ├── app/
│   │   ├── app.go                 # Fiber app creation + middleware + health route
│   │   ├── dependencies.go        # App dependency contract and dep builders
│   │   ├── routes.go              # HTTP route composition for /api and /api/copilot
│   │   └── *_api_test.go          # API route tests colocated with app composition
│   ├── bootstrap/
│   │   └── runtime.go             # Runtime dependency wiring (repos + app deps)
│   ├── core/
│   │   └── ...                    # Shared DTOs, validation, HTTP error helpers, utilities
│   ├── features/
│   │   ├── accounts/
│   │   ├── ai/
│   │   │   ├── handlers.go
│   │   │   ├── config_repository.go
│   │   │   └── extraction.go      # AI extraction/improvement service logic
│   │   ├── alerts/
│   │   ├── instruments/
│   │   ├── rubrics/
│   │   ├── stats/
│   │   │   └── handler.go         # Trade stats endpoint + stats computation
│   │   ├── trades/
│   │   └── users/
│   └── platform/
│       ├── auth/
│       ├── db/
│       ├── redis/
│       └── sqlschema/
└── main.go                        # Runtime startup and worker bootstrap
```

### Layer responsibilities

- **`internal/app`**
  - Owns HTTP app assembly and route registration.
  - Wires feature handlers and middleware.
  - Accepts concrete dependencies through a single dependency struct.

- **`internal/features/*`**
  - Own business behavior by domain (accounts, trades, AI, alerts, etc.).
  - Keep handlers, repositories, workers, and domain workflows near each other.

- **`internal/platform/*`**
  - Infrastructure adapters and runtime integrations.
  - Keeps external system concerns (auth headers, DB/Redis bootstrap) isolated.

- **Root `backend/`**
  - Process bootstrap only.
  - Minimal surface: initialize services, build runtime deps, run app.

### Frontend layout (`frontend/`)

```text
frontend/
├── src/
│   ├── app/                       # Next.js App Router pages and API routes
│   ├── components/                # Reusable UI components
│   ├── hooks/                     # UI/data hooks
│   ├── lib/                       # Shared frontend utilities
│   └── proxy.ts                   # Proxy/runtime edge helpers
└── ...config files
```

## Runtime flow (backend)

1. `backend/main.go` initializes Redis and Postgres.
2. Workers are started for async jobs (e.g., trade AI grade, alerts).
3. App is created via `internal/app.New(...)`.
4. Routes under `/api` and `/api/copilot` are registered.
5. Feature slices handle requests with injected repositories/dependencies.

### API namespace convention

- Base API namespace is **`/api`** (single registration, no duplicate alias trees).
- Core resources use `/api/*` (e.g. `/api/accounts`, `/api/trades`, `/api/users`, `/api/stats`, `/api/alerts`).
- Copilot-specific endpoints use `/api/copilot/*` (currently AI config/improvement flows).

## Local development

From `projects/futures-copilot/`:

- Use Docker Compose to build/run services.
- Backend tests can be run from `backend/` with `go test ./...`.

## Notes for contributors

- Prefer adding new logic to the relevant `internal/features/<domain>` slice.
- Keep root files focused on startup/composition, not domain behavior.
- If a new endpoint is added, wire it in `internal/app/routes.go` and test it in a focused `internal/app/*_api_test.go` file.
- Whenever architecture or file-structure changes are made, update this `projects/futures-copilot/README.md` in the same change set.
