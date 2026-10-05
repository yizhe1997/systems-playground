# Tradecraft v2

A trading journal, rebuilt from a clean start. This folder holds feature `000-log-trades` (accounts and closed
trades, usable alone as a trade log). Feature `001-journal-and-reflect` comes after it.

**Local use only.** There is no sign-in and no audit log yet (a written exception to constitution principle IV).
Everything is published on `127.0.0.1` only. Do not expose it beyond this computer.

## What you need

Docker with Compose. Nothing else: Go, Node and PostgreSQL all run in containers. (Running the browser tests also
needs Node on the host, see "Test".)

## Start

```bash
cp .env.example .env        # then put a password after POSTGRES_PASSWORD=   (.env is never committed)
docker compose up --build -d --wait
```

- Web: http://127.0.0.1:3100
- API: http://127.0.0.1:8081 (health check at `/health`; the browser never calls it, the web tier does)

If a port is taken on your machine, set `FRONTEND_HOST_PORT`, `BACKEND_HOST_PORT` or `POSTGRES_HOST_PORT` in `.env`.

Stop with `docker compose stop`; start again with `docker compose start`. Your data is in the Docker volume
`tradecraft-v2_tradecraft_v2_pgdata` and survives both. `docker compose down` keeps it; `docker compose down -v` deletes it.

## Test

```bash
POSTGRES_PASSWORD=anything ./scripts/test.sh
```

Starts a throwaway database and a second copy of the stack on other ports (your data is never touched), runs the Go
tests against a real PostgreSQL, then the Playwright browser run, then checks that only loopback ports are published,
that the password is in no tracked file or log, and that the data survives a stop and start. The browser run needs
Node on the host once: `cd frontend && npm install && npx playwright install chromium`.

Faster loop on the running stack: `cd frontend && npx playwright test` (set `E2E_BASE_URL` and `E2E_API_URL` if you changed the ports).

## Back up and restore the data

```bash
docker compose exec -T postgres pg_dump -U tradecraft tradecraft > tradecraft-backup.sql
# restore into an empty database (a fresh volume):
docker compose exec -T postgres psql -U tradecraft tradecraft < tradecraft-backup.sql
```

The Export button on the Trades screen also downloads everything (accounts and every trade, deleted ones marked) as one JSON file.

## Where things are

- `specs/000-log-trades/`: spec, screen list (`screens.md`), plan, tasks and verification notes. The wireframes live in the design tool, not in the repository.
- `docs/domain.md`: every trading rule in words with worked examples; each is marked unconfirmed until you confirm it.
- `docs/decisions.md`: dated decisions made while building.
- `backend/`: Go API (Fiber, pgx, sqlc, goose). The rules that decide numbers are SQL functions in `backend/migrations/`.
- `frontend/`: Next.js app (the web tier).
