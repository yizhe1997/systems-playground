# Implementation Plan: Log Trades

**Feature**: `000-log-trades` | **Date**: 2026-10-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/000-log-trades/spec.md` (wireframes signed off 2026-10-04)

## Summary

Build the smallest accounts and closed-trades log that feature 001 can stand on: create, edit, archive and list accounts; log,
edit, soft-delete, restore and list closed trades; exact money; a trading day that comes from the exit time, a per-account day
start and one journal time zone; export. Written from scratch (constitution 1.2.0); nothing is taken from Tradecraft v1.

The technical approach (see [research.md](research.md)): the rules that decide numbers live in Postgres as small SQL functions, with
stored generated columns for the figures (gross, net, risk, R) and a trigger-maintained `trading_day` column, so the screen
preview, the saved values and feature 001's future totals share one definition. A Go API (Fiber) validates input with the exact
wireframe wording and serves the data; a Next.js web tier calls it from the server side only; everything runs under Docker Compose.

## Technical Context

**Language/Version**: Go and TypeScript, versions pinned to the then-current stable releases at implementation (research section 6)

**Primary Dependencies**: Fiber, pgx, sqlc, goose, shopspring/decimal (input validation only); Next.js with React; Playwright

**Storage**: PostgreSQL (current major at implementation, 17 or newer), one database owned by this app

**Testing**: Go tests against a real Postgres started by Docker Compose (hand-written vectors from research section 9); Playwright on a real Chromium against the composed stack; no mocks of the database

**Target Platform**: Linux containers under Docker Compose on the owner's computer; used in a desktop browser; phone layout is not a goal

**Project Type**: web application (Go API plus Next.js web tier)

**Performance Goals**: a few trades a day and a few accounts; every screen responds well under a second at that size. No scale target beyond that

**Constraints**: loopback only (written exception, constitution IV); exact decimals everywhere, money as strings in the API; no floating point for money; the owner's local time zone rules in research section 3

**Scale/Scope**: 1 owner, a handful of accounts, thousands of trades over years; 5 screens, 17 states (signed off)

## Constitution Check

*Gate: passed before research; re-checked after design (below).*

| Principle | Status | How the plan meets it |
|---|---|---|
| I Process over outcome | **Written exception** (spec, signed off 2026-10-04) | The list shows R beside each result and no totals; process information arrives in 001. Expires when 001 is built |
| II Owner in charge, agents draft | Met | No agent access in this feature; nothing here prevents scoped tokens later (rules live in the database, writes go through one API) |
| III Honest numbers | Met | Exact `numeric`, decimals as strings, SQL functions as the single definition, dash with a reason for every null figure, vectors for the dash cases, definitions to be written into `docs/domain.md` flagged unconfirmed |
| IV Security gates | **Written exception** (spec, signed off 2026-10-04) | No sign-in or audit log; API and web bind to the loopback address only; expires when sign-in and audit are accepted and before any exposure. No secrets in the repository (the database password comes from the environment) |
| V Design before code | Gate pending | Wireframes signed off. **Visual direction is not decided, so implementation cannot start** (`/speckit-screens-direction` blocks it). Styling uses CSS variables only until then. A visual review follows implementation |
| VI One small slice | Met | Only accounts, closed trades, list, settings, export. Everything else is in the spec's non-goals |
| VII Own your data | Met | JSON export of everything including archived and deleted records (research section 7); self-hosted; no outbound calls; no AI |
| VIII Decisions logged, domain sourced | Met in the plan, finished at implement | Decisions are in `research.md` and `research/12-owner-decisions.md`; `docs/domain.md` is created in the same change as the behaviour |

**Re-check after design**: no new violations. The only added complexity is the database-side rules, justified below.

## Project Structure

### Documentation (this feature)

```text
specs/000-log-trades/
├── spec.md              # signed off 2026-10-04
├── screens.md           # signed-off wireframes, images in wireframes/
├── plan.md              # this file
├── research.md          # decisions and alternatives
├── data-model.md        # tables, rules, state transitions
├── quickstart.md        # how to prove it works
├── contracts/openapi.yaml   # the API contract and its only copy; the API is built to it
├── checklists/requirements.md
└── tasks.md             # next step: /speckit-tasks (not created here)
```

### Source Code (under `self-host/apps/tradecraft`)

```text
backend/
├── cmd/api/main.go                 # starts the API, applies migrations
├── internal/
│   ├── api/                        # Fiber handlers (accounts, trades, settings, export), errors.go, decimal.go, concurrency.go
│   ├── store/                      # sqlc-generated queries over the SQL files, migrate.go
│   └── timeinput/                  # local date and time in the journal zone to an instant, with the DST rules
├── migrations/                     # goose SQL files: tables, functions, generated columns, triggers
├── queries/                        # plain SQL for sqlc
├── sqlc.yaml
└── tests/                          # Go tests against real Postgres (vectors, boundaries, API)

frontend/
├── src/app/                        # pages: trades list, log or edit trade, accounts, settings
├── src/components/                 # form, preview, tables, dialogs, built on CSS variables
├── src/lib/                        # server-side API client, formatting of money and dates for display only
└── e2e/                            # Playwright scenarios from quickstart.md

docker-compose.yml                  # postgres, backend, frontend, tests
scripts/test.sh                     # runs the Go tests and the Playwright run in containers
docs/domain.md                      # created with the behaviour; unconfirmed rules flagged
```

**Structure Decision**: a two-part web application (Go API, Next.js web tier) with the database rules in migrations, because the
constitution fixes the stack and the numbers must have one definition shared with feature 001.

## Complexity Tracking

| Choice | Why needed | Simpler alternative rejected because |
|---|---|---|
| Rules in SQL functions, generated columns and triggers | One definition for results, risk, R and the trading day, usable by 001's SQL and by the preview, holding whoever writes the data | Computing in Go means a second definition for 001 and for any later writer, and a separate recompute path when the day start or time zone changes |
| A preview endpoint | The Result preview must show the same numbers the save will | Re-implementing the maths in the browser would be a second, floating-point definition |
| Two written constitution exceptions | The feature has no process data (principle I) and no sign-in or audit (principle IV) | Delaying 000 until those exist would delay everything; both are time-limited and recorded |

## Open items for the plan gate

- The research decisions in sections 3, 4 and 7 (time rule, price and size rules, JSON-only export) are the owner's to overrule.
- Implementation cannot start until the visual direction is decided and approved.
