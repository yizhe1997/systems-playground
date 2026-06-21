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

### Frontend navigation convention

- Use `next/link` for internal app routes (`/`, `/contact`, `/alerts`, etc.).
- Avoid raw `<a href="/...">` for internal navigation in shared UI because it forces full document reloads instead of App Router transitions.
- This is especially important for preserving client-side stateful UX such as custom cursor behavior, auth/session UI, and smooth browser back/forward restores.

### Frontend design-system convention (Futures dashboard)

- Shared dashboard UI primitives now live in `frontend/src/app/globals.css` under `@layer components` with `fc-*` semantic utility classes.
- Reuse these classes (instead of retyping long Tailwind strings) for consistent design language and safer refactors:
  - Panel anatomy: `fc-panel-overlay`, `fc-panel-shell`, `fc-panel-inner`, `fc-panel-header`, `fc-panel-body`, `fc-panel-footer`
  - Form controls: `fc-label`, `fc-input-line`, `fc-select-trigger`, `fc-dropdown-menu`, `fc-dropdown-item`, `fc-textarea`
  - Actions: `fc-btn`, `fc-btn-primary`, `fc-btn-danger`, `fc-btn-subtle`, `fc-icon-btn`
  - Containers: `fc-card`
- Keep one-off visual flourishes (e.g., custom clip paths, special danger fills) local to the component; put reusable patterns into `fc-*` classes.

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

## Contact form (privacy-safe)

The frontend contact page submits to a thin Next.js proxy route (`frontend/src/app/api/contact/route.ts`),
which forwards to the Go backend contact endpoint (`backend/internal/features/contact/handlers.go`).
SMTP sending, reCAPTCHA secret verification, and rate limiting run in the Go backend.
This avoids exposing direct personal contact channels (email/Discord) in public UI.

The contact form is intentionally minimal: authenticated users submit a message only,
while the proxy derives the sender name from the signed-in session.

Security and resilience included:

- Per-IP rate limiting (default: 5 requests per 10 minutes).
- reCAPTCHA v3 verification (when reCAPTCHA env vars are set, no user interaction).
- Contact submit waits until reCAPTCHA is ready, performs a warmup call on load, and retries once with a fresh token on reCAPTCHA validation failure.
- In non-production environments, reCAPTCHA score thresholds above `0.1` are capped to `0.1` to avoid overly strict local/dev false negatives.
- In non-production environments, `localhost` and `127.0.0.1` are both accepted hostname values for reCAPTCHA validation.
- Message length validation in the UI and backend, capped at 300 words.
- Header sanitization and safe `Reply-To` formatting to reduce injection/phishing abuse.
- SMTP delivery only.

Authentication hardening included:

- Google sign-in/sign-up is gated by a reCAPTCHA v3 preflight.
- Frontend executes `sign_in` or `sign_up` actions before starting OAuth.
- Frontend proxy sets a short-lived one-time cookie only after backend verification succeeds.
- Middleware enforces that cookie for `/api/auth/signin/google`.

Add this variable in `frontend/.env` (public client key only):

- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`

Add these variables in `backend/.env` (server-only):

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_EMAIL`
- `SMTP_PASSWORD`
- `SMTP_FROM`
- `CONTACT_INBOX_EMAIL`
- `RECAPTCHA_SECRET_KEY`
- `RECAPTCHA_MIN_SCORE`
- `RECAPTCHA_EXPECTED_HOSTNAME`
- `CONTACT_RATE_LIMIT_WINDOW_MS`
- `CONTACT_RATE_LIMIT_MAX_REQUESTS`

reCAPTCHA actions are hardcoded in backend handlers:

- Contact form action: `contact_submit`
- Auth preflight actions: `sign_in`, `sign_up`

If SMTP vars are missing, the contact API returns HTTP `503` and the frontend shows a friendly failure message.

### Why `SMTP_FROM` is required (and should not be the end-user email)

- `SMTP_FROM` should be a verified sender identity for your SMTP provider/domain.
- The contact requester's email is set as `replyTo`, not `from`.
- This avoids SPF/DKIM/DMARC failures and prevents messages from being rejected/spam-foldered.

For authenticated-user contact flows, keep `SMTP_FROM` fixed (service sender), and use the signed-in user email as `replyTo`.

## Notes for contributors

- Prefer adding new logic to the relevant `internal/features/<domain>` slice.
- Keep root files focused on startup/composition, not domain behavior.
- If a new endpoint is added, wire it in `internal/app/routes.go` and test it in a focused `internal/app/*_api_test.go` file.
- Whenever architecture or file-structure changes are made, update this `projects/futures-copilot/README.md` in the same change set.
