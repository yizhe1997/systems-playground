# Implementation Plan: Home and Analytics

**Branch**: `feat/home-and-analytics` | **Date**: 2026-10-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-home-and-analytics/spec.md`. Wireframes signed off 2026-10-30 (`screens.md`).

## Summary

A read-only feature with no stored data: **Home** becomes the landing page (`/`) and **Analytics** is a new screen with two tabs (Statistics; Rule replay and mistakes). Both show figures for a chosen period and account scope, one block per currency, each money figure beside its plan-followed figure, each rate with its `n`, each unavailable figure as a dash with its reason. The API gets two read routes (`GET /analytics`, `GET /needs-you`) and five optional filters on `GET /trades` so a breakdown row opens exactly its trades. All figures are computed by a new Go package, `internal/analytics`, from one row-per-trade query with exact decimals; the web tier draws the equity curve, the daily bars and the calendar as plain SVG/HTML with a table equivalent beside each. Nothing is created, changed, audited or exported by the feature.

## Technical Context

**Language/Version**: Go 1.26 (API), TypeScript 5.9 with Next.js 16.3 and React 19 (web tier), PostgreSQL 18

**Primary Dependencies**: existing only: Fiber v2, pgx and sqlc (queries), `shopspring/decimal` (already a dependency; every sum, ratio and comparison), Base UI, `react-day-picker` and `date-fns` for the custom range. No chart library (research 7).

**Storage**: none new. No migration. One new sqlc query (`AnalyticsRows`) and extra filter predicates on `ListTrades` and `CountTrades`.

**Testing**: Go unit tests for `internal/analytics` with the worked examples; Go integration tests against real Postgres through the routes (reference month, scope rules, gate, read-only); Playwright on the composed stack for H1 to H4 (including axe and the 5,000-trade scale case); a screen-capture spec for the visual review. Test data for all of them is the reference month of `quickstart.md`.

**Target Platform**: self-hosted containers (as now); desktop browser.

**Project Type**: web application (Go API, Next.js web tier), as features 000 to 004.

**Performance Goals**: Home, Analytics (all-time scope) and a scope change in under one second each with 5,000 trades across ten accounts (SC-005).

**Constraints**: figures are exact decimals and never floats; a figure that cannot be computed is null with a reason; owner-only routes; no new outbound call, secret or stored data.

**Scale/Scope**: one owner; thousands of trades; about 40 new API fields, 2 routes, 4 screens (6 with tabs and states), 1 Go package.

## Constitution Check

*Gate before research; re-checked after design.*

| Principle | Verdict | Where |
|---|---|---|
| I Process over outcome | **Met** | every money figure carries `plan` (X of Y) of the same trades: the `Statistic`, `Row`, `Day` and `Block` shapes require it (contract), and a test walks every figure of the reference month for it (SC-003). Rule replay is itself a process view. |
| II Owner in charge, agents read and draft | **Met** | read-only; agent tokens are refused by the new routes like every owner route (route-walking gate test); no write path; no model is involved in any figure (FR-016). |
| III Honest numbers | **Met** | decimals only; every statistic has `n`, a definition key and a minimum sample; null + reason instead of zero (FR-013); no capital basis, no percentage of capital (drawdown is money); per-currency blocks, no conversion. Domain rules go into `docs/domain.md` as **unconfirmed** with worked examples. |
| IV Security gates | **Met, no new gate** | new owner routes behind the existing gate; parameters parsed and bounded; no secret, upload or auth code changes; the pass-through carries the routes unchanged (JSON text). A short local review pass is a task for the new routes' parameter handling. |
| V Design before code | **Met** | wireframes H1 to H4 signed off 2026-10-30; visual direction approved (2026-10-04); a visual review is a task. |
| VI One small slice at a time | **Met** | independent value stated per story; excludes score, setup analytics, drawdown percentage, MAE and MFE, agent tools, chart export. |
| VII Own your data | **Met** | nothing stored, so nothing to export; no outbound call. |
| VIII Decisions logged, domain sourced | **Met in the plan, finished at implement** | decisions are in `research.md` and go to `docs/decisions.md`; the convention "rules live in SQL" gets a recorded exception for analytics figures (research 1); `docs/domain.md` gets the new section in the same change as the behaviour. |

No violations; the Complexity Tracking section is not needed.

## Project Structure

### Documentation (this feature)

```text
specs/005-home-and-analytics/
├── spec.md, screens.md, plan.md, research.md, data-model.md, quickstart.md
├── contracts/openapi.yaml
├── checklists/requirements.md
└── tasks.md            # next step (/speckit-tasks)
```

### Source code (under `self-host/apps/tradecraft`)

```text
backend/
├── queries/analytics.sql              # NEW: AnalyticsRows, MissingDays, MissingWeeks, NotJudgedTrades, ScopeOtherPeriodCount
├── queries/trades.sql                 # CHANGED: ListTrades and CountTrades take the five filters
├── internal/store/                    # regenerated by sqlc (the way features 003 and 004 did)
├── internal/analytics/                # NEW: pure functions over rows, shopspring/decimal
│   ├── rows.go                        #   Row, Scope, Params
│   ├── statistics.go                  #   win rate, profit factor, expectancy, averages, payoff, largest, drawdown, streaks
│   ├── series.go                      #   curve, days, breakdowns
│   ├── replay.go                      #   replay lines, mistake cost
│   ├── definitions.go                 #   the words of each definition (returned by the API, shown by the screen)
│   └── *_test.go                      #   the worked examples of quickstart.md and the spec
├── internal/api/analytics.go          # NEW: GET /analytics (parse, validate, query, call the package, shape the JSON)
├── internal/api/needsyou.go           # NEW: GET /needs-you
├── internal/api/trades.go             # CHANGED: parse and pass the five filters
├── internal/api/server.go             # CHANGED: register the two routes behind the owner gate
└── tests/analytics_test.go            # NEW: reference month through the routes, gate, scope, read-only

frontend/
├── src/app/page.tsx                   # CHANGED: Home instead of the redirect to /reviews
├── src/app/analytics/page.tsx         # NEW: Statistics tab
├── src/app/analytics/replay/page.tsx  # NEW: Rule replay and mistakes tab
├── src/lib/analytics.ts               # NEW: types, period presets, query building (journal-zone today); the Definition panel shows the API's `definition` text
├── src/lib/data.ts                    # CHANGED: getAnalytics, getNeedsYou
├── src/components/{HomeCards,EquityCurve,DailyBars,CalendarHeatmap,NeedsYou,FocusPanel,MistakePanel,
│                   PeriodScope,StatTable,BreakdownTable,ReplayTable,MistakeCostTable,CurrencyBlocks}.tsx   # NEW
├── src/components/Nav.tsx             # CHANGED: Home first, Analytics after Mistakes
├── src/components/TradeFilters.tsx    # CHANGED: show and clear the five new filters (chips)
├── src/app/trades/page.tsx            # CHANGED: pass the filters through
├── src/styles/app.css                 # CHANGED: cards, chart, calendar, tables
└── e2e/{us11-home,us11-analytics,zz-a11y-home,zz-screens-home}.spec.ts, zz-scale.spec.ts (new case)  # NEW and CHANGED

docs/{domain.md,decisions.md,security-review.md}   # CHANGED: new rules (unconfirmed), decisions, review pass
README.md                                          # CHANGED: Home and Analytics section
```

**Structure Decision**: the established web application layout (Go API plus Next.js web tier); the only new package is `internal/analytics`, kept free of HTTP and SQL so that its tests are plain tables of rows and expected figures.

## Phases

- **Phase 0 (research)**: `research.md`, 12 decisions, no open clarification.
- **Phase 1 (design)**: `data-model.md` (no schema change), `contracts/openapi.yaml`, `quickstart.md`.
- **Order of build** (for tasks): the package and its tests first (the figures), then the query and routes, then the Trades filters (drill-through), then Home, then Analytics and Rule replay, then docs, the review pass, the scale and accessibility cases, the visual review.

## Risks

| Risk | Handling |
|---|---|
| Figures disagree between Home, Analytics and the Trades list | one row query and one package; the filters on the Trades route use the same predicates; a test compares every breakdown row's `trades` with the filtered list's total (SC-006). |
| A definition the owner would define differently | each is written in `docs/domain.md` with a worked example, flagged unconfirmed, and confirmed one by one with the owner after the build (SC-009), as for 001. |
| A model-free promise broken later (agents) | the routes are the contract (FR-017); agent tools, when built, wrap the same routes. |
| Two currencies and the calendar | one result line per currency in a cell; covered by a browser test with a EUR account. |
| Performance with a large all-time scope | one query, single-pass sums; measured by the scale case; caching deferred (research 12). |
