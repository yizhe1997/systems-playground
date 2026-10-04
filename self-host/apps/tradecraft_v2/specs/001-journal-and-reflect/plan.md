# Implementation Plan: Journal and Reflect

**Feature**: `001-journal-and-reflect` | **Date**: 2026-10-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-journal-and-reflect/spec.md` (screens signed off 2026-10-03, again 2026-10-04; spec hash `a4a303b3…bfe7f`)

## Summary

Add the daily judging loop on top of the accounts and closed trades of feature `000`: a daily review per account and trading day
(three answers, two star grades, reviewed or draft, carried-forward "next session" focus), judging each trade (plan followed, valid
loss or mistake, mistake tags), one shared list of mistakes with a counter and an optional stop line, a week and a month focus shown on
every daily review, a weekly review that is read from the days and stores only a reviewed mark, a month-at-a-time Reviews screen with
pickers, and export of every new record. Written from scratch on `000`'s foundations (constitution 1.2.0); nothing is taken from v1.

The technical approach (see [research.md](research.md)) continues `000`: **every figure comes from SQL views and functions** over
`trade_detail` and the new tables, so a day, a week and the mistake counter use one definition each; rules that must always hold are
CHECK constraints and triggers; a Go API (Fiber, sqlc) validates input with the exact wireframe wording and gives each screen one
read endpoint; the Next.js web tier renders them server-side and uses small client components for the judge drawer, the focus dialog,
the stars and saving. The browser does no counting and no money arithmetic.

## Technical Context

**Language/Version**: Go 1.26 and TypeScript (Next.js 16, React 19), as pinned in `000` (`docs/decisions.md`)

**Primary Dependencies**: unchanged: Fiber, pgx, sqlc, goose, shopspring/decimal (validation only); Next.js; Playwright; axe. No new dependency is planned.

**Storage**: PostgreSQL 18, the same database; migrations `00007` onward add six tables, the SQL functions and views, and two triggers (data-model.md)

**Testing**: Go tests against real Postgres with hand-worked vectors for every figure and every state boundary; Playwright on the composed stack for the flows in `quickstart.md`; axe on every new screen in both modes; no mocks of the database

**Target Platform**: Linux containers under Docker Compose on the owner's computer; desktop browser; no phone layout

**Project Type**: web application (Go API plus Next.js web tier), the same two services

**Performance Goals**: with 5,000 trades over 10 accounts and a year of reviews, every screen's single read answers in well under a second (the `000` standard, SC-008); the Reviews screen reads one month at a time, never the whole history

**Constraints**: loopback only (written exception, constitution IV); exact decimals, money as strings; counts and sums only in SQL; no outbound calls; local use only

**Scale/Scope**: 1 owner, a handful of accounts, thousands of trades and about a review a day; 6 screens, 25 states (signed off) plus the Plan column on `000`'s Trades list

## Constitution Check

*Gate: passed before research; re-checked after design (below).*

| Principle | Status | How the plan meets it |
|---|---|---|
| I Process over outcome | **Met here; ends `000`'s exception** | Every money figure on every review screen has the plan figure beside it (S0 rows, S1, S2 strip, S5). `000`'s written exception said it would expire when `001` is built, so the Trades list gains a **Plan** column (research section 11). That amends a signed-off `000` screen and needs the owner's yes at this gate (open item 1) |
| II Owner in charge, agents draft | Met | No agent access here; every write is an owner action through one API, so scoped tokens can be added later without touching the rules (they live in the database) |
| III Honest numbers | Met | Exact `numeric` sums in SQL; counts as integers; the win-rate percentage is rounded in SQL and shown with its basis ("5 of 9"); every unavailable figure is a dash with a reason; definitions go to `docs/domain.md` flagged unconfirmed; vectors cover the dash cases |
| IV Security gates | **Written exception inherited from `000`** | No sign-in or audit log; loopback only; expires when sign-in and audit exist and before any exposure (spec FR-022). No secrets added |
| V Design before code | Met | Screens signed off 2026-10-03 and 2026-10-04; the visual direction is approved for the project (2026-10-04); the new components are built from the existing tokens, and a visual review follows implementation. Two wireframe gaps are logged (S2's "Edit trade" button text, the Plan column), both to be fixed in Penpot with the change |
| VI One small slice | Met | Only what the spec lists; the non-goals stay out (imports, live mode, playbooks, notebook, attachments, agents, monthly review documents) |
| VII Own your data | Met | The `000` export gains every new record, in the same one JSON file; no outbound calls; no AI |
| VIII Decisions logged, domain sourced | Met in the plan, finished at implement | Decisions are in `research.md` (14 items for the owner at this gate); `docs/domain.md` and `docs/decisions.md` are updated in the same change as the behaviour |

**Re-check after design**: no new violations. The database-side statistics are the same justified complexity as `000`.

## Project Structure

### Documentation (this feature)

```text
specs/001-journal-and-reflect/
├── spec.md              # signed off 2026-10-04
├── screens.md           # signed-off wireframes, images in wireframes/
├── plan.md              # this file
├── research.md          # decisions, alternatives, defaults for the owner
├── data-model.md        # tables, functions, state rules, derived figures
├── quickstart.md        # sample data and scenarios A to R, browser run
├── contracts/openapi.yaml
├── checklists/          # requirements.md exists; next: /speckit-checklist
└── tasks.md             # next step: /speckit-tasks (not created here)
```

### Source Code (under `self-host/apps/tradecraft_v2`, added to what `000` built)

```text
backend/
├── migrations/             # 00007_mistakes.sql, 00008_judgement.sql, 00009_reviews_and_focus.sql, 00010_stats_functions.sql, 00011_judgement_triggers.sql
├── queries/                # reviews.sql, judgement.sql, mistakes.sql, focus.sql, weekly.sql, counter.sql (sqlc)
├── internal/
│   ├── api/                # reviews.go, day.go, judgement.go, mistakes.go, counter.go, focus.go, weekly.go, calendar.go; export.go and trades.go extended
│   └── store/              # sqlc output
└── tests/                  # stats_test.go, states_test.go, judgement_test.go, mistakes_test.go, focus_test.go, weekly_test.go, reviews_api_test.go, export_test.go (extended)

frontend/
├── src/app/reviews/        # page.tsx (S0), day/page.tsx (S1), week/page.tsx (S5)
├── src/app/mistakes/       # page.tsx (S3)
├── src/components/         # AccountSwitcher, MonthNav, WeekBlock, DayRow, FocusCard, FocusDialog (S4), JudgeDrawer (S2), Stars, StatusChip, NumbersStrip, DayPicker, WeekPicker, MistakeCounter, StopLineEditor, MistakeList
├── src/lib/                # types, server fetchers, formatting helpers for counts and dates (display only)
└── e2e/                    # us-evening, us-morning, us-focus, us-lookback, us-mistakes, us-weekly, us-plan-column, plus the axe pass extended

docs/domain.md              # new sections: week and month, today, daily and weekly states, plan followed, win rate, valid loss, mistake count (each marked unconfirmed)
```

**Structure Decision**: the same two-part web application as `000`. New SQL objects first (they carry the rules), then the API
reads and writes, then the screens; each user story can be built and checked on its own in that order.

## Order of work (for `/speckit-tasks`)

1. **Foundations**: migrations and SQL functions; the statistics and state functions with their Go vectors; the shared API types and
   error wording; navigation and the account switcher; `docs/domain.md` entries.
2. **Story 1 (daily review with yesterday's focus)**: `GET`/`PUT /reviews/day`, S0 (Reviews) and S1 without judging; the carried-forward focus card.
3. **Story 2 (judge decisions)**: judgement API and rules, S2 drawer, plan and valid-loss rules, stars and grades, the Plan column on the Trades list.
4. **Story 3 (mistakes)**: mistake list, tags, day-level records, the counter, stop lines, S3.
5. **Story 4 (focus)**: focus API and the S4 dialog, entry points on S0, S1, S5.
6. **Story 5 (weekly review)**: `GET /weekly`, the mark, S5, the week picker.
7. **Polish**: export, accessibility pass, scale and persistence checks, domain and decision documents, run every scenario, visual review.

## Complexity Tracking

| Choice | Why needed | Simpler alternative rejected because |
|---|---|---|
| Statistics as SQL views and functions | A day, a week and the counter must share one definition and stay exact | Counting in Go means three code paths for the same figure and a second place for a bug |
| Rules as CHECKs and a trigger (valid loss) | The rule must hold whoever writes, including a later agent, and when a trade edit turns a loss into a win | Checking only in the API misses edits made through the trade API |
| Derived states, nothing stored (Missing, trades changed after review) | A stored flag goes stale when a trade changes or the day passes | A background job or stored status would need its own repair path |
| One read endpoint per screen | A page is one consistent snapshot, with the numbers from one query set | Many small reads can show a day and its week at different moments |
| Amending `000`'s Trades list (Plan column) | Ends the principle I exception honestly | Extending the exception forever defeats the constitution; leaving results alone on the main list contradicts the product's idea |

## Open items for the plan gate

**Resolved 2026-10-04: the owner said yes to all of them** (the Plan column on the Trades list, the seven other defaults, and the domain interpretations as working assumptions, still flagged unconfirmed in `docs/domain.md`). The list is kept for the record.

1. **The Plan column on the Trades list** (changes a signed-off `000` screen, and its wireframe and `screens.md` in the same change): yes or no.
2. The seven other defaults in `research.md` section 14 (mistake tags versus label, "not judged yet" in the plan line, export on the existing button, a retired name comes back, Reviews as the home screen, the "Tradecraft" brand, breakeven trades).
3. The domain interpretations in section 2 (Monday weeks, per-account "today", a week under the month of its Sunday) are guesses to confirm, flagged in `docs/domain.md` when written.
4. Penpot gaps: S2's button text, and the Plan column on L1; fixed in Penpot with the change.
