# Penpot

Platform-wide infrastructure service — shared across everything on the host, not scoped to a single showcase project. See [the monorepo guide](../../../docs/MONOREPO_GUIDE.md) for the infra vs apps distinction.

## What this runs

Self-hosted [Penpot](https://penpot.app) — an open-source Figma alternative. Adopted specifically so wireframe/design work for `self-host/apps/tradecraft/` isn't blocked by Figma's Starter-plan MCP rate limit (10 tool calls/minute, applies even to a Full seat — the seat tier doesn't override the team's plan tier). It's platform-wide infra, not app-scoped, because any future project's design work can use the same instance.

Full stack (`docker-compose.yml`, adapted from Penpot's official compose file, fetched 2026-09-24): frontend, backend, admin console, exporter, MCP component, Postgres 15, Valkey (websockets/cache), and a temporary Mailpit SMTP sink for registration emails.

## Setup

1. Copy `.env.example` to `.env`, fill in `PENPOT_SECRET_KEY` (generate per the comment in the file) and `PENPOT_POSTGRES_PASSWORD`.
2. First-time only: register an account through the Penpot UI once it's up — there's no separate admin bootstrap step.
3. **MCP for AI-driven design (e.g. Claude Code)**: the `penpot-mcp` container above is Penpot's bundled component and is network-internal only — it is not directly usable by an external MCP client out of the box. The actual client-facing piece is a separate package (`@penpot/mcp`, run via `npx @penpot/mcp` or built from `penpot/mcp` in the Penpot repo) that exposes a Streamable HTTP endpoint (default `http://localhost:4401/mcp`) and bridges to a **live browser tab**: you open Penpot in a browser, load the Penpot MCP plugin inside it, and click "Connect to MCP server" — that tab must stay open and active for the session (browsers suspending inactive tabs breaks the connection). This is architecturally different from Figma's server-side API and is set up separately from this deploy. See `penpot/penpot`'s `mcp/README.md` for the full client-connection steps.

## Deploy

Deployed automatically by `.github/workflows/deploy-infra-penpot.yml` whenever `self-host/infra/penpot/**` changes on `main`. Also started on host boot: `self-host/infra/scripts/wsl-startup.sh` auto-discovers any `self-host/infra/*/docker-compose.yml`, so no separate registration step is needed there.
