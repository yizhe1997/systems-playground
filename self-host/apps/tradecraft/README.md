# Tradecraft v2

A trading journal, rebuilt from a clean start. This folder holds feature `000-log-trades` (accounts and closed
trades, usable alone as a trade log). Feature `001-journal-and-reflect` comes after it.

**Local use only.** Sign-in and an audit log exist (feature `002-sign-in-and-audit-log`), but nothing may be exposed beyond
this computer until CI has been proven to run on GitHub (constitution principle IV). Everything is published on
`127.0.0.1` only.

## What you need

Docker with Compose. Nothing else: Go, Node and PostgreSQL all run in containers. (Running the browser tests also
needs Node on the host, see "Test".)

## Start

```bash
cp .env.example .env        # then fill in the values below   (.env is never committed)
docker compose up --build -d --wait
```

The stack will not start until `.env` has `POSTGRES_PASSWORD`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `SERVICE_TOKEN_SECRET` and
`OWNER_BOOTSTRAP_EMAIL` (it stops with a plain message naming the one that is missing). An existing database keeps all its data.

- Web: http://127.0.0.1:3100
- API: http://127.0.0.1:8081 (health check at `/health`; the browser never calls it, the web tier does)

If a port is taken on your machine, set `FRONTEND_HOST_PORT`, `BACKEND_HOST_PORT` or `POSTGRES_HOST_PORT` in `.env`.

Stop with `docker compose stop`; start again with `docker compose start`. Your data is in the Docker volume
`tradecraft-v2_tradecraft_v2_pgdata` and survives both. `docker compose down` keeps it; `docker compose down -v` deletes it.

## Signing in

Sign-in is Google only, for the email addresses you allow. Steps and settings are in
`specs/002-sign-in-and-audit-log/quickstart.md`; in short:

1. Put in `.env` a long random value for `NEXTAUTH_SECRET` and another for `SERVICE_TOKEN_SECRET`
   (`openssl rand -base64 48`), the address you open the app at as `NEXTAUTH_URL` (for example `http://127.0.0.1:3100`), and your
   own Google email as `OWNER_BOOTSTRAP_EMAIL` (it becomes the first identity, and is the way back in if every identity is disabled).
2. In the Google Cloud console create an OAuth client (type Web application) with the redirect addresses
   `<NEXTAUTH_URL>/api/auth/callback/google` and `<NEXTAUTH_URL>/api/auth/callback/google-confirm`, and put its id and secret in
   `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Until then the sign-in button answers with the refusal screen.
3. Settings, Access: add other addresses (a recent Google confirmation is asked for first). Audit log in the sidebar shows who did what.

Open the app at exactly the `NEXTAUTH_URL` address (host and port): the sign-in sets a cookie for that host, and finishing the
flow on another one (`127.0.0.1` instead of `localhost`) fails with "State cookie was missing" in the web tier's log and the
refusal screen. Google's redirect addresses are exact too, and can take a few minutes to take effect after you add one.

For local work and tests there is a way in without Google: set `TRADECRAFT_ENV=local` and a long random `DEV_SESSION_SECRET` in
`.env`, restart, and run `node frontend/scripts/dev-mint-session.mjs you@example.com` to get a cookie. Both services **refuse to
start** if `DEV_SESSION_SECRET` is set while `TRADECRAFT_ENV` is `production` (the default), so remove it when you are done.

## Agent access

An agent (Claude Code, Claude Desktop, any client that speaks the Model Context Protocol) can read your journal, and only
read it. It is off until you turn it on, and nothing here is exposed beyond this computer.

1. Settings, Agent access: turn the switch on, then New token. Name it ("Claude Desktop, backtests") and copy the value
   when it is shown: it is shown **once** and cannot be shown again (lose it and you revoke it and make another). Each of
   these steps asks for a recent Google confirmation first.
2. Give the value to your agent as a bearer token for `http://127.0.0.1:8081/mcp` (the API's own loopback port). For Claude Code:

   ```bash
   claude mcp add --transport http tradecraft http://127.0.0.1:8081/mcp --header "Authorization: Bearer <token>"
   ```

   A client that only speaks stdio (Claude Desktop) needs a bridge such as `mcp-remote` with the same address and header; see
   that client's own documentation. Keep the value out of chat and out of files you commit.
3. Ask it things ("List my accounts", "How did my last 20 backtest trades compare with my plan?"). It has nine read tools:
   accounts, trades, a day, a week, a month, the mistake list, the mistake counter, the focus and the time zone. It cannot read the
   audit log, identities, tokens or the export, and it cannot change anything.
4. Audit log, What: Agent read shows every call by token name, never a figure. Revoke one token in Settings, or turn the switch
   off to refuse all of them at once (that revokes none). A request that comes from a web page is refused and recorded as a
   browser request.

Backtests are kept apart from live trading: make an account and choose **Backtest**. Its days are never Missing and it stays out
of live figures until you choose it. A trade belongs to the day it was **entered**, not exited.

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

- `specs/003-backtest-accounts-and-agent-access/`: backtest accounts, the entry-based trading day and agent read access (spec, plan, tasks, quickstart).
- `specs/000-log-trades/`: spec, screen list (`screens.md`), plan, tasks and verification notes. The wireframes live in the design tool, not in the repository.
- `docs/domain.md`: every trading rule in words with worked examples; each is marked unconfirmed until you confirm it.
- `docs/decisions.md`: dated decisions made while building.
- `backend/`: Go API (Fiber, pgx, sqlc, goose). The rules that decide numbers are SQL functions in `backend/migrations/`.
- `frontend/`: Next.js app (the web tier).
