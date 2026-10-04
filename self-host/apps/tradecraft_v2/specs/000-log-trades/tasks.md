---

description: "Task list for 000-log-trades (accounts and closed trades)"
---

# Tasks: Log Trades

**Input**: Design documents from `specs/000-log-trades/` (spec, plan, research, data-model, contracts, quickstart, signed-off wireframes)

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/openapi.yaml. Written from scratch: no code, schema or screens from Tradecraft v1 (constitution 1.2.0).

**Tests**: included, because the constitution requires tests to be added with the feature (domain logic and API against a real Postgres, the interface in a real browser). Test-first is not required.

**Organization**: grouped by user story, in the order of the spec's priorities. Paths are under `self-host/apps/tradecraft_v2`.

## Gates before and around implementation

- **Before T001 (implement gate):** the two requirements-quality checklists in `checklists/` (`domain-rules.md`, `interface-and-operations.md`) are reviewer-owned and `/speckit-implement` reads their state. Items the owner wants fixed in the spec change `spec.md` and make the 2026-10-04 sign-off stale, so the sign-off step runs again.
- **Before T001 (design gate, constitution V): satisfied on 2026-10-04.** The visual direction (Hex, comfortable, light and dark) is approved in `docs/visual-direction.md`, with `DESIGN.md` and `PRODUCT.md` written.
- **After the last task:** the visual review (`/speckit-screens-review`) against `wireframes/`, and the owner's approval of the look.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task serves (US1 to US6, from the spec)

## Phase 1: Setup

- [ ] T001 Create the project skeleton from plan.md: `backend/` (Go module, `cmd/api`, `internal/{api,store,settings,timeinput}`, `migrations`, `queries`, `tests`), `frontend/` (Next.js App Router, TypeScript, `src/{app,components,lib,styles}`, `e2e`), `docs/`, `scripts/`. Pin Go, Node and PostgreSQL to the then-current stable releases in `backend/go.mod`, `frontend/package.json` and the Dockerfiles, and note the versions in `docs/decisions.md`
- [ ] T002 [P] Write `docker-compose.yml` with services `postgres` (volume for data, healthcheck), `backend` (published only on `127.0.0.1:8081`), `frontend` (published only on `127.0.0.1:3100`, calls the backend by its internal name), and a `tests` profile; the database password comes from the environment variable `POSTGRES_PASSWORD` and is never written to a file in the repository
- [ ] T003 [P] Write `backend/Dockerfile` and `frontend/Dockerfile` (multi-stage; the backend image embeds the time-zone database via Go's `time/tzdata`)
- [ ] T004 [P] Configure sqlc in `backend/sqlc.yaml` (engine postgresql, pgx/v5, `numeric` mapped to a string-safe decimal type, queries in `backend/queries`, schema from `backend/migrations`)
- [ ] T005 [P] Write `scripts/test.sh`: starts a throwaway Postgres, runs the Go tests, then the Playwright run against the composed stack, and tears everything down
- [ ] T006 [P] Create `docs/domain.md` with a section per rule (trading day, gross and net result, risk, R, the local-time rule, the price rule), each marked **unconfirmed** with an empty "Source" line (constitution VIII); and `docs/decisions.md` seeded from `research.md`

## Phase 2: Foundational (blocks every user story)

- [ ] T007 Migration `backend/migrations/00001_settings.sql`: table `journal_settings` with `id smallint` (CHECK `id = 1`), `time_zone text` default `'America/Chicago'`, `updated_at timestamptz`, and the single seeded row
- [ ] T008 Migration `backend/migrations/00002_accounts.sql`: table `account` exactly as data-model.md: `name text` ("1 to 80 characters after trimming; unique ignoring case and surrounding spaces, including archived accounts", a unique index on the lower-cased trimmed name), `currency text` ("one of the allowed three-letter codes", a CHECK), `trading_day_start time` (optional), `archived_at timestamptz`, `created_at`, `updated_at`; repeated spaces inside the name are collapsed to one on save; a CHECK that `trading_day_start` is not `00:00`
- [ ] T009 Migration `backend/migrations/00003_trade_functions.sql`: the four IMMUTABLE functions `trade_gross`, `trade_net`, `trade_risk`, `trade_r` and the STABLE function `trading_day(exit_at, time_zone, day_start)` exactly as data-model.md ("with no `day_start`, return that calendar date; with a `day_start` S, add (24 hours − S) to the local time and return the date"); `trade_risk` returns null when it works out to zero; `trade_r` returns 6 decimal places
- [ ] T010 Migration `backend/migrations/00004_trades.sql`: table `trade` with every input column and CHECK from data-model.md verbatim: `size numeric(24,8)` ("above zero"), `entry_price` and `exit_price` ("above zero"), `exit_at` not earlier than `entry_at`, `dollars_per_point` ("optional; above zero when present"), `cost` ("zero or more, default 0"), `stop_price` ("optional; above zero when present"), `typed_result` ("required when `dollars_per_point` is null"), `instrument` ("1 to 40 characters"), `direction` (`long` or `short`), `thesis` ("up to 5,000 characters"), `deleted_at`; the stored generated columns `gross_result`, `net_result`, `risk`, `r_multiple` calling the functions; the `trading_day date` column; indexes `(account_id, trading_day)`, `(trading_day)`, `(deleted_at)`; `typed_result` is also null when `dollars_per_point` is present (a CHECK); `updated_at` is set on every update and is the version token for concurrent edits
- [ ] T011 Migration `backend/migrations/00005_trading_day_triggers.sql`: the three triggers from data-model.md (before insert or change of `exit_at` or `account_id` on `trade`; after change of `trading_day_start` on `account`; after change of `time_zone` on `journal_settings`), each setting or recomputing `trading_day` through `trading_day(...)`, covering deleted trades and archived accounts' trades
- [ ] T012 [P] Write the sqlc queries in `backend/queries/settings.sql`, `backend/queries/accounts.sql`, `backend/queries/trades.sql` (list with filters on account, trading-day range and deleted flag, newest exit first with `id` as the tie-break; get; insert; update; soft delete; restore) and `backend/queries/export.sql`; generate the code into `backend/internal/store`
- [ ] T013 Implement `backend/cmd/api/main.go` and `backend/internal/api/server.go`: connect to Postgres, apply migrations at start, serve `GET /health`, bind to `127.0.0.1` only
- [ ] T014 Run migrations, and every recompute, inside one transaction each in `backend/internal/store/migrate.go`; on failure change nothing, stop the API and say so plainly (FR-025)
- [ ] T015 [P] Implement the shared error shape in `backend/internal/api/errors.go` (code, message, `fields[]` with `field` and `message`) and the "N things to fix before this trade can be saved." summary; include the 409 conflict response
- [ ] T016 [P] Implement decimal handling in `backend/internal/api/decimal.go`: parse exact decimals with shopspring/decimal for validation only, and write decimals out exactly (trailing zeros carry no meaning, and no code may depend on them); refuse more than 8 decimal places ("At most 8 decimal places.") and anything but digits and one point ("Enter a number with a point for decimals, for example 21450.25.")
- [ ] T017 [P] Implement `backend/internal/timeinput/timeinput.go`: turn a local date and time (no offset) in the journal time zone into an instant; refuse a local time that does not exist with "That time does not exist on that date in this time zone."; use the first occurrence of a time that happens twice; pass through an RFC 3339 value that has an offset
- [ ] T018 [P] Optimistic concurrency in `backend/internal/api/concurrency.go`: `updated_at` is the version token; a `PUT` carrying an older `expectedUpdatedAt` is refused with 409 and "This trade was changed elsewhere. Reload to see the latest version." ("This account was changed elsewhere. Reload to see the latest version." for accounts) (FR-022)
- [ ] T019 Write the Go test harness `backend/tests/main_test.go`: starts the API against a real Postgres from Docker Compose, resets the database between tests, and offers helpers to create accounts and trades
- [ ] T020 [P] Frontend foundation: `frontend/src/app/layout.tsx` with the sidebar from the wireframes (APP NAME; Trades, Accounts, Settings), `frontend/src/styles/tokens.css` (every colour, size and font as a CSS variable, values to come from the approved visual direction), `frontend/src/lib/api.ts` (server-side client that calls the backend and never runs in the browser), `frontend/src/lib/format.ts` (display-only formatting of money by currency, R with two decimals, dates and times in the journal zone)
- [ ] T021 [P] Notices and guards in `frontend/src/components/Notice.tsx` and `frontend/src/lib/useUnsavedGuard.ts`: a loading indicator for noticeable waits, the failure banner "Could not reach the journal. Nothing was saved." that keeps what was typed and offers a retry, the prompt "Leave without saving? Your changes will be lost.", and an Undo notice that lasts 10 seconds (FR-023)
- [ ] T022 [P] Accessibility base in `frontend/src/styles/tokens.css` and `frontend/src/components/`: visible focus, a label on every field, dialogs that close with Escape and keep focus inside, error text marked with "!" and never carried by colour alone (FR-024)
- [ ] T023 [P] Playwright setup in `frontend/playwright.config.ts` and `frontend/e2e/helpers.ts` (starts nothing itself; targets the composed stack on `127.0.0.1:3100`)

**Checkpoint**: the stack starts, `/health` answers, migrations apply, and an empty Trades page renders.

## Phase 3: User Story 1 - Set up an account and log a trade (Priority: P1) 🎯 MVP

**Goal**: create an account, log a closed trade, see its worked-out result. **Independent test**: scenarios A, B, D, E, F of quickstart.md and the first-run browser flow.

### Tests for User Story 1

- [ ] T024 [P] [US1] Go test `backend/tests/functions_test.go`: hand-worked vectors for `trade_gross`, `trade_net`, `trade_risk`, `trade_r` (long and short, with and without cost, stop equal to entry gives null risk, missing stop, missing dollars per point, very large and very small numbers, trade A: gross 100.00, net 95.40, risk 400.00, R 0.2385; trade B: gross 100.00, net 97.90, risk null)
- [ ] T025 [P] [US1] Go test `backend/tests/accounts_api_test.go`: create account, name unique ignoring case and surrounding spaces (422 "An account named Funded 50K already exists. Names are not case sensitive."), name 1 to 80 characters, currency from the allowed list
- [ ] T026 [P] [US1] Go test `backend/tests/trades_api_test.go`: create and preview a trade (scenarios A, B, E), invalid trade (scenario D: three field errors with the exact wireframe wording), a future time (scenario F), no account yet (cannot log), costs below zero, prices and dollars per point above zero; more than 8 decimal places refused, a time one minute past now accepted and two minutes past refused, a new trade on an archived account refused
- [ ] T027 [P] [US1] Playwright `frontend/e2e/us1-first-trade.spec.ts`: first run says "Create an account first.", create "Funded 50K" USD 17:00, log trade A and see +$100.00, +$95.40, $400.00, +0.24 R in the preview, save, see it in the list

### Implementation for User Story 1

- [ ] T028 [US1] `backend/internal/api/accounts.go`: `GET /accounts`, `POST /accounts` per contracts/openapi.yaml with validation (name, currency, optional `tradingDayStart` as `HH:MM`); start time `00:01` to `23:59`, and `00:00` refused with "Start time cannot be 00:00. Leave it empty to use the calendar date of each exit."
- [ ] T029 [US1] `backend/internal/api/trades.go`: `POST /trades`, `GET /trades` (unfiltered at this stage) and `POST /trades/preview` per contracts/openapi.yaml; validation in the data-model order (required fields, exact decimals, size, prices, dollars per point and stop above zero, cost zero or more, exit not earlier than entry, neither time in the future, typed result present when dollars per point is blank, account exists and is not archived), the preview calling the same SQL functions as the saved columns, and the plain reasons for each null figure ("no stop recorded", "needs dollars per point", "stop equals entry"); the future check allows the current time plus one minute
- [ ] T030 [P] [US1] Frontend `frontend/src/components/AccountDialog.tsx` and `frontend/src/app/accounts/page.tsx` (L3 list and "none yet", L4 new and name-used states)
- [ ] T031 [US1] Frontend `frontend/src/components/TradeForm.tsx`, `frontend/src/components/ResultPreview.tsx`, `frontend/src/app/trades/new/page.tsx` (L2: Basic first, thesis under a collapsible Details section, live preview from `/trades/preview`, validation banner and field errors with the wireframe wording)
- [ ] T032 [US1] Frontend `frontend/src/components/TradesTable.tsx` and `frontend/src/app/trades/page.tsx` (L1 filled, "no accounts yet" and "no trades at all" states; result with R or a dash and its reason; no totals); the list shows the trading day column; Log a trade is unavailable, and its direct address redirects to Accounts, until an active account exists

**Checkpoint**: the owner can create an account and log trades A and B, and see them listed. This is the MVP.

## Phase 4: User Story 2 - See my trades for an account and a period (Priority: P1)

**Goal**: filter by account and trading-day range, newest first, with the right empty states, and export. **Independent test**: scenarios K and M, plus the filters and Export in the browser run.

- [ ] T033 [P] [US2] Go test `backend/tests/trades_list_test.go`: filter by account and trading-day range (inclusive), newest exit first with a stable tie-break, default of all accounts and the current month is applied by the web tier, two currencies never added together (the API returns no totals)
- [ ] T034 [P] [US2] Go test `backend/tests/export_test.go`: scenario M, every account (archived marked) and every trade (deleted marked), all money as strings, trade count equals the list count with deleted shown
- [ ] T035 [P] [US2] Playwright `frontend/e2e/us2-list.spec.ts`: filter by account and date range, "No trades for these filters." with Clear filters, Export count equals the screen count
- [ ] T036 [US2] Extend `backend/internal/api/trades.go` `GET /trades` with `accountId`, `from`, `to` (trading days) and `deleted`; reject a bad range with a field error
- [ ] T037 [US2] `backend/internal/api/export.go`: `GET /export` returning the document in contracts/openapi.yaml (`exportedAt`, `settings`, `accounts`, `trades` including deleted ones marked)
- [ ] T038 [US2] Frontend `frontend/src/components/TradeFilters.tsx` (Account, From, To, Clear filters, Show deleted switch) wired into `frontend/src/app/trades/page.tsx` with the default of all accounts and the current month, the "No trades for these filters." state, and an Export button that downloads the JSON file named with the date; the Account filter lists archived accounts too, marked as archived

## Phase 5: User Story 3 - Correct or remove a trade (Priority: P2)

**Goal**: edit any field; soft delete; restore. **Independent test**: scenario L and scenario G-edit (moving the exit to another day).

- [ ] T039 [P] [US3] Go test `backend/tests/trades_edit_test.go`: edit recomputes gross, net, risk, R and the trading day; delete hides the trade from the list and figures; restore returns every field exactly as before (compare all fields); the deleted list shows it; a second save made from an out-of-date copy returns 409 "This trade was changed elsewhere. Reload to see the latest version."; moving a trade to another active account recomputes its trading day and moving it onto an archived account is refused
- [ ] T040 [P] [US3] Playwright `frontend/e2e/us3-edit-delete.spec.ts`: edit a price and see the result change; delete; Show deleted; Restore
- [ ] T041 [US3] `backend/internal/api/trades.go`: `GET /trades/{id}`, `PUT /trades/{id}`, `DELETE /trades/{id}` (soft), `POST /trades/{id}/restore`; edits keep the same validation as create; `PUT` takes `expectedUpdatedAt` and returns 409 when it is older than the stored `updated_at`; the account may be changed to an active one
- [ ] T042 [US3] Frontend `frontend/src/app/trades/[id]/edit/page.tsx` (L2 edit state with Save changes, Cancel, Delete trade and "Last saved"), Edit and Delete buttons in the list, and the deleted view with Restore (L1 "showing deleted"); Delete shows "Trade deleted." with Undo for 10 seconds

## Phase 6: User Story 4 - Type the result when dollars per point is unknown (Priority: P2)

**Goal**: log without dollars per point by typing the result after costs. **Independent test**: scenario C and the dash reasons.

- [ ] T043 [P] [US4] Go test `backend/tests/typed_result_test.go`: scenario C (net -120.00, gross null, risk null, R null, reasons name "dollars per point"); `typed_result` required when `dollars_per_point` is null ("required when `dollars_per_point` is null"); a typed result is ignored when dollars per point is present; adding dollars per point later makes the result computed
- [ ] T044 [P] [US4] Playwright `frontend/e2e/us4-typed-result.spec.ts`: clear dollars per point, the "Result after costs (required)" field appears, the preview shows dashes with reasons and "Costs: not used", then add dollars per point and see the computed result
- [ ] T045 [US4] `backend/internal/api/trades.go` and `TradeForm.tsx`: error "Result is required while dollars per point is blank."; the conditional typed-result field; the preview wording for a typed result ("typed in", "not used", "a typed result is already after costs"); the "typed in" note and R dash reason in `TradesTable.tsx`

## Phase 7: User Story 5 - A trade lands on the right trading day (Priority: P3)

**Goal**: the trading day from the exit, the account day start and one journal time zone. **Independent test**: scenarios G1 to G7.

- [ ] T046 [P] [US5] Go test `backend/tests/tradingday_test.go`: scenarios G1 to G7 (17:30, 16:59, exactly 17:00, day start cleared, just after clocks go forward, a time that does not exist, a time-zone change moving a trade's day while its instant stays the same); also a trade of an archived account and a deleted trade are recomputed
- [ ] T047 [P] [US5] Go test `backend/tests/timeinput_test.go`: nonexistent local time refused with the exact message, a repeated hour uses the first occurrence, an RFC 3339 value with an offset is used as given
- [ ] T048 [P] [US5] Playwright `frontend/e2e/us5-trading-day.spec.ts`: the preview shows the trading day; change the account start and see trades move; change the time zone in Settings
- [ ] T049 [US5] `backend/internal/api/settings.go`: `GET /settings`, `PUT /settings` validating an IANA zone name; the recompute happens through the trigger in T011; the Settings zone list offers every standard time zone and can be searched
- [ ] T050 [US5] Frontend `frontend/src/app/settings/page.tsx` (L5: time zone, current time in that zone, Save); the trade form takes local date and time and shows the trading day and the "exit read in Central Time; Funded 50K has no trading-day start" line from the preview

## Phase 8: User Story 6 - Edit an account (Priority: P3)

**Goal**: rename, change currency or day start, archive and restore. **Independent test**: scenarios H, I, J.

- [ ] T051 [P] [US6] Go test `backend/tests/accounts_edit_test.go`: rename to an existing name (case-insensitive) refused, including the name of an archived account; changing the day start recomputes trading days; changing the currency is allowed and changes no number; archive hides the account from the default list and from the account chooser while its trades stay in `GET /trades` and in the export; restore brings it back; no endpoint deletes an account; archiving shows "Account archived." with Undo; a rename made from an out-of-date copy returns 409
- [ ] T052 [P] [US6] Playwright `frontend/e2e/us6-accounts.spec.ts`: edit dialog with the start-time and currency notices, Archive, Show archived, Restore
- [ ] T053 [US6] `backend/internal/api/accounts.go`: `GET /accounts/{id}`, `PUT /accounts/{id}`, `POST /accounts/{id}/archive`, `POST /accounts/{id}/restore`, and `includeArchived` on the list; `PUT` takes `expectedUpdatedAt` and returns 409 when out of date; a start time of `00:00` is refused with the FR-001 message
- [ ] T054 [US6] Frontend: Edit, Archive and Show archived on `frontend/src/app/accounts/page.tsx`; edit state of `AccountDialog.tsx` with "Changing the start time moves this account's trades to the right trading days.", "Changing the currency only changes the label. Existing results are not converted." and Archive account; the account chooser in `TradeForm.tsx` excludes archived accounts

## Phase 9: Polish and cross-cutting

- [ ] T055 [P] Check that the API and web tier listen on the loopback address only (a test that inspects what the running containers publish), and that no secret is in the repository or in a log (constitution IV) (SC-009: only loopback addresses are published)
- [ ] T056 [P] Performance and persistence checks in `backend/tests/scale_test.go` and `frontend/e2e/persistence.spec.ts`: seed 5,000 trades over 10 accounts and time opening the list, changing a filter and saving a trade (SC-008); stop and start the stack and compare every account and trade (SC-010)
- [ ] T057 [P] Complete `docs/domain.md` with the worked examples used in the tests and keep every unconfirmed rule flagged; update `docs/decisions.md` with the date and reason of each decision (constitution VIII)
- [ ] T058 [P] Accessibility pass on the five screens: keyboard-only use of the form, filters and dialogs, labels and error messages available to screen readers, no meaning carried by colour alone
- [ ] T059 [P] Write the run instructions (start, test, back up the data volume) in `README.md`
- [ ] T060 Run every scenario in `quickstart.md` (A to M and the browser run) on the composed stack and record the results, including any failure, in `specs/000-log-trades/verification.md`
- [ ] T061 Visual review (`/speckit-screens-review`): compare the built screens with `wireframes/` in a real browser, save screenshots to `specs/000-log-trades/built/`, run the design critique and audit, and record the owner's decision on the look

## Dependencies and order

- Phase 1 then Phase 2 (T007 to T011 in order; T012 after T011; T013 after T012; the rest of Phase 2 in parallel).
- US1 and US2 (P1) next; US2 builds on US1's list and form but is separately testable.
- US3 and US4 (P2) need US1. US5 and US6 (P3) need US1; US5's trigger work is already in Phase 2.
- Polish after the stories.

## Parallel examples

```text
After Phase 2:  US1 tests T024 T025 T026 T027 together, then T028 and T030 together.
Within US5:     T046 T047 T048 together.
Across stories: US3 (T039 to T042) and US4 (T043 to T045) after US1 is done.
```

## Implementation strategy

1. Phases 1 and 2, then **US1 alone**: the owner has a working trade log (account, log, list). Stop and check it against the wireframes.
2. Add US2 (filters, export), then US3 and US4, then US5 and US6, checking each story on its own.
3. Phase 9, then the visual review and the converge step.

## Notes

- Every money value is an exact decimal string end to end; nothing in the browser does arithmetic on money.
- The rules that decide numbers live only in the SQL functions of T009; no other task re-implements them.
- Commit after each task or small group, on the single branch `tradecraft_v2`; push nothing without the owner's say-so.
