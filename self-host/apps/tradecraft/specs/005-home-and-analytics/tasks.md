---

description: "Task list for 005-home-and-analytics (Home as the landing page, and Analytics with Rule replay)"
---

# Tasks: Home and Analytics

**Input**: Design documents from `specs/005-home-and-analytics/` (spec, plan, research, data-model, contracts/openapi.yaml, quickstart, signed-off wireframes)

**Prerequisites**: plan.md, spec.md, research.md, data-model.md and contracts/openapi.yaml, and features `000` to `004` as built (trades and judgements, the review states, the mistake counter, the focus, the owner gate, the Trades list). No migration: nothing is stored.

**Tests**: included, because the constitution requires tests with the feature (domain logic and API against a real Postgres, the interface in a real browser). Test-first is not required. All test data is the reference month of `quickstart.md`: 12 USD trades with known figures (net +340.00, 7 wins of 12, plan followed 6 of 12, and so on), so every assertion can be checked by adding.

**Organization**: grouped by user story in the order the work should be built: setup (domain words, decisions, security rows), the foundation every story needs (the row query, the figures package, the `GET /analytics` route, the web libraries and the period and scope control), US1 Home (P1), US2 Analytics statistics and breakdowns (P1), US3 Rule replay and mistake cost (P2), US4 needs you (P2), then polish. Paths are under `self-host/apps/tradecraft`.

## Gates before and around implementation

- **Implement gate:** `checklists/requirements.md` is ticked; no custom checklist has been generated (the owner may run `/speckit-checklist`).
- **Design gate (constitution V):** the visual direction was approved on 2026-10-04 and the screens were signed off on 2026-10-30 (spec hash in `screens.md`). The `before_implement` direction check (`/speckit-screens-direction`) runs first.
- **Security gate (principle IV):** this feature adds no authentication, upload or import code. Its new owner routes take query parameters, so T049 and T050 are two short local review passes of the parameter handling and the SQL predicates.
- **Domain gate (principle VIII):** every new rule is written in `docs/domain.md` as **unconfirmed** in the same change as the behaviour (T001); T055 confirms them with the owner one by one.
- **After the last build task:** the visual review (T054) and the owner's approval of the look.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task serves (US1 to US4, from the spec)
- Words in quotation marks are constraints quoted from `research.md`, `data-model.md` or the contracts; keep them verbatim in code and tests.
- While building, run only the Go test files and Playwright specs a task touches; run the whole suite once at T052. Use the owner's dev stack (`docker compose down; docker compose up --build -d`) for looking at screens together; the throwaway test project is for the automated suite only (say so before running it).

---

## Phase 1: Setup (documents the rest depends on)

- [X] T001 [P] `docs/domain.md`: add a section "Feature 005: Home and Analytics" defining, each with a worked example from `quickstart.md` and the lines "Status: unconfirmed", "Confirmed by owner on:" (blank) and "Source": **win and set aside** ("a win has a net result above zero; with a break-even band b greater than zero a trade from -b to +b is set aside from the win rate and the streaks"), **win rate k of n** (n = trades not set aside; percent half up), **profit factor** ("sum of the winning net results divided by the absolute sum of the losing net results over all trades, whatever the band; six decimals"), **expectancy** in money (net / trades) and in R (sum of R / trades that have an R), **average win and average loss** (strict, band ignored), **payoff ratio**, **largest win and loss** with their trading day, **maximum drawdown** ("the largest fall of the running net result from a peak, the peak starting at 0 before the first trade, trades in trading-day then entry-time then id order; in money, with the peak and trough days"), **streaks**, **minimum samples** ("a statistic that needs more than one trade is a dash below 2 trades; a rate with n below 10 is marked few trades"), **scope** ("trades not deleted, with a trading day in the period, in the chosen account or, with none, in all Live accounts, archived included, Backtest never; one block per currency"), **weekday** (of the trading day) and **hour** (of the entry, in the journal time zone), **edge leak and replay lines** ("followed = answered Yes; not followed = No or Partly; not judged = no answer; without the plan-breaking trades = actual minus the edge leak") and **cost of a mistake** ("each trade counted once under each mistake it carries; the rows do not add up").
- [X] T002 [P] `docs/decisions.md`: add the dated decisions of `research.md` sections 1 to 11 (one row each, with the reason), including "figures of analytics are computed in Go from one row query, an exception to the 2026-10-13 convention that rules live in SQL" and the owner's answers of 2026-10-27 and 2026-10-30 (Home + Analytics as one feature, edge leak included and defined as No or Partly, per-currency blocks, band as a view option, archived accounts count and can be chosen, Rule replay as a tab, weekend columns only when needed).
- [X] T003 [P] `docs/security-review.md`: add findings rows G-23 (the new owner routes take query parameters: dates, a range of at most 20 years, a band of at most 8 decimals, weekday 1 to 7, hour 0 to 23, a direction of `long` or `short`, UUIDs: parsed and bounded, never concatenated into SQL; an agent token is refused) and G-24 (read-only: no write, no audit entry, nothing added to the export; proven by comparing the export and the audit log before and after), each "open (review pass pending)" until T051.

---

## Phase 2: Foundational (blocks every user story)

**Purpose**: the row query, the figures package with the statistics, the first route, and the web foundations.

- [X] T004 `backend/queries/analytics.sql` and regenerate `backend/internal/store/` with sqlc the way features 003 and 004 did (the `sqlc/sqlc` Docker image, from `backend`): `AnalyticsRows` returning the fields of `data-model.md` ("trade_id, account_id, account_name, currency, account_archived, account_kind, trading_day, entry_at, entry_hour, weekday, instrument, direction, net_result, r_multiple, plan_followed, label, mistakes") with the filter "deleted_at IS NULL, trading_day BETWEEN from AND to, and either account_id = chosen or (account.kind = 'live', archived included)", ordered "trading_day, entry_at, id", `entry_hour` taken "in the journal time zone" from `journal_settings.time_zone` and `weekday` as the ISO weekday of the trading day; `MistakeRecords` (the trade tags and the whole-day records of the same scope, per mistake: trade tags from `trade_mistake` of the rows' trades, day records from `day_mistake` of Live accounts or the chosen account); `ScopeTradeCount` (trades of the scope with no period limit, for `otherPeriods`).
- [X] T005 [P] `backend/internal/analytics/rows.go`: `Row`, `Params` and `Scope` types and `ParseBand` ("an amount >= 0 with at most 8 decimals, default 0"); money is `decimal.Decimal` parsed from the query's text columns, never a float.
- [X] T006 [P] `backend/internal/analytics/statistics.go`, `definitions.go` and `statistics_test.go`: `definitions.go` holds the words of each statistic's definition once (what it counts, what it leaves out, its minimum sample, with the worked figure) and every `Statistic` carries it as `definition`; the functions of `research.md` section 4 returning a `Statistic` (value, `n`, plan, reason, few) for net result, win rate (k of n, percent half up, set-aside count), profit factor, expectancy (money and R), average win, average loss, payoff ratio, largest win and loss (with the day), maximum drawdown (peak and trough days; "the start" when the peak is 0) and the two streaks. Tests, with exact decimals: the spec's ten-trade example ("profit factor 350 / 290 = 1.21, average win 116.67, average loss 41.43, payoff 2.82, expectancy 6.00"), the reference month ("1.77, +28.33, 111.43, 88.00, 1.27, drawdown 180.00 from a peak of 120.00 on 1 Oct to a trough of -60.00 on 6 Oct, streaks 2 and 1"), a band of 40.00 ("7 of 11 (64%), one set aside, money unchanged, a set-aside trade ends a streak"), every dash and its words ("no losing trades", "needs at least 2 trades, has 1", "no stop recorded on 1 of 1 trades", "needs a win and a loss"), a drawdown of an all-losing period (the peak is the start), and "few trades" at 9 and not at 10.
- [X] T007 `backend/internal/api/analytics.go` and `backend/internal/api/server.go`: `GET /analytics` behind the owner gate: parse and validate `from`, `to` ("end not before start, at most 20 years", `422` with the field message otherwise), `accountId` (a UUID of an existing account, `404` when none), `band`; run `AnalyticsRows`; group the rows by currency; build each block's `accounts`, `trades`, `plan` (the existing "X answered Yes of Y; Partly never counts as followed; not judged shown so the parts add up" rule) and `statistics`; answer `blocks` ordered by currency code, an empty list when the scope has no trades, and `otherPeriods` (trades of the scope outside the period) only then. The statistics JSON follows `contracts/openapi.yaml` (`value` null with a `reason`, never zero).
- [X] T008 `backend/tests/analytics_test.go` (the foundation tests, with a helper `referenceMonth(t)` that creates the reference month of `quickstart.md`): the statistics of the reference month through the route equal the quickstart's figures; "scope: with no account only Live accounts, an archived Live account's trades count, a Backtest account only when chosen, a deleted trade never counts, two currencies are two blocks and nothing adds across them"; "an empty journal answers no blocks"; "parameter rules: end before start `422`, a range over 20 years `422`, a band of -1 or 9 decimals `422`, an unknown account `404`"; **read-only (SC-008)**: take `GET /export` before and after calling the route in every scope and compare them, and assert the audit log has no new entry. The gate (no token `401`, agent token refused) is covered by the existing route-walking test in `tests/gate_test.go`; confirm it lists the new route.
- [X] T009 [P] `frontend/src/lib/analytics.ts`: types mirroring `contracts/openapi.yaml`, the **period presets** ("this week (Monday to Sunday), this month, last 30 days, this year, all time, custom") resolved to `from` and `to` trading days from the journal time zone's calendar date (the helper the Trades list already uses), reading and writing the query parameters `period`, `from`, `to`, `account`, `band`, and validation of a custom range with the message "The end is before the start. Choose an end on or after <start>."; and `frontend/src/lib/data.ts`: `getAnalytics` and `getNeedsYou` through the existing pass-through (no new web-tier route handler).
- [X] T010 [P] `frontend/src/components/Nav.tsx`: "Home" first and "Analytics" after "Mistakes" in the Journal group (the sidebar of `screens.md`), the current one marked, Reviews unchanged.
- [X] T011 `frontend/src/components/PeriodScope.tsx` (H4): the Period list ("This week (26 Oct to 1 Nov)", "This month (1 Oct to 30 Oct)", "Last 30 days", "This year (2026)", "All time", "Custom range..."), the custom range fields From and To with Apply and the invalid-range message ("! The end is before the start. Choose an end on or after Fri 30 Oct 2026." with "The figures below keep the last valid period until a valid range is applied. Nothing is computed for an invalid range."), the Accounts list ("All live accounts", then LIVE accounts with their currency, then BACKTEST accounts, archived accounts after the others marked archived; ""All live accounts" leaves backtest accounts out. A backtest account is shown on its own when chosen. One account of any kind can be chosen."), and the Break-even band field (Analytics only: "A trade inside the band is neither a win nor a loss."). Choices are links (query parameters), nothing is stored. Keyboard and screen-reader operable like the existing filters (`DateRangeFilter.tsx`, `TradeFilters.tsx`).

**Checkpoint**: `GET /analytics` answers the statistics for any scope, and the web libraries and the control exist. Nothing is drawn yet.

---

## Phase 3: User Story 1 - Open the journal and see how I am doing (Priority: P1) 🎯 MVP

**Goal**: `/` is Home: cards with their plan figure, the equity curve, the daily bars, the calendar, the focus and the mistake counter, in one block per currency, with the empty states.

**Independent test**: with the reference month recorded, open `/`: the cards equal the quickstart figures, every money card has "Plan followed 6 of 12 (3 not judged)", the calendar cells say their result and plan figure, selecting a day opens its daily review.

### Tests for User Story 1

- [X] T012 [P] [US1] `backend/tests/analytics_test.go` (more): "the curve is the running net result by trading day (reference month: 120, 30, 90, -60, 140, 220, 180, 290, 220, 370, 280, 340 after each trade; per-day points one per trading day)"; "a day's `plan` is its own X of Y and `openAccountId` is the account with the most trades that day, ties by name"; "every `statistics`, `days` and `curve` entry carries `plan` and `n` (SC-003)"; "with two currencies each block has its own curve".
- [X] T013 [P] [US1] `frontend/e2e/us11-home.spec.ts`: signing in and opening `/` shows Home (not Reviews) and the sidebar lists Home first and Reviews still; the five cards of the reference month with their plan line "Plan followed 6 of 12 (3 not judged)"; the card help line; changing the period to Last 30 days and the account to Alpha 2 changes every card, chart and the calendar together and the address holds the choice (reopen it); a EUR account adds a second block and nothing adds across; selecting 6 Oct opens the daily review of Funded 50K; "View as table" shows the same numbers as the curve; the empty states "No trades yet." with Log a trade, "No trades in this period." with "You have N trades in other periods. Choose another period." and Show all time, and the only-unjudged notice "None of these 12 trades is judged yet. Judge them in the daily review to see how the plan did." with the Expectancy card's second line "In R: — no stop recorded on 12 of 12 trades".

### Implementation for User Story 1

- [X] T014 [US1] `backend/internal/analytics/series.go` and `series_test.go` (the curve and the days): `Curve` ("cumulative net result by trading day, in trading-day then entry-time then id order") and `Days` (per trading day: trades, result, plan figure, `openAccountId` "the account with the most trades that day, then by name"); tests with the reference month and a two-account day.
- [X] T015 [US1] `backend/internal/api/analytics.go`: add `curve` and `days` to each block (the shapes of the contract).
- [X] T016 [P] [US1] `frontend/src/components/HomeCards.tsx` (H1): the five cards "Net result", "Trades", "Win rate", "Profit factor", "Expectancy" with value, note with `n` and unit ("12 trades · USD", "n = 12 · no break-even band", "$780.00 won / $440.00 lost · n = 12", "per trade · n = 12", "few trades" below 10; the Expectancy card adds a second line "In R: +0.31 R · 8 of 12 trades" or "In R: — no stop recorded on 12 of 12 trades") and, under a divider, "Plan followed X of Y (N not judged)" for the same trades; money formatted only here, with the existing `format.ts`; the title is the Definition link; a dash with its reason when a value is null.
- [X] T017 [P] [US1] `frontend/src/components/EquityCurve.tsx` and `DailyBars.tsx`: plain SVG with the zero line, the lowest point marked, labels in text, the text equivalents "Equity curve: line from $0 to +$340.00 over 12 trades, lowest point -$60.00 on Tue 6 Oct" and "Daily bars: 12 trading days, from -$150.00 (Tue 6 Oct) to +$200.00 (Thu 8 Oct)" as the accessible name, and a "View as table" `<details>` with the same numbers; meaning never by colour alone.
- [X] T018 [P] [US1] `frontend/src/components/CalendarHeatmap.tsx`: the grid of the period's months, Monday to Friday plus Saturday and Sunday only for a month with a trade on one of them, each cell a link showing the day number, the result and the plan figure ("Plan 1 of 1", "Plan 0 of 1", "Plan 0 of 1 (partly)", "Not judged"), "no trades" for an empty weekday, days outside the month greyed, a border marking days with trades, one result line per currency when a day has trades in two; selecting a cell opens `/reviews/day?account=<openAccountId>&date=<day>`; the note "Select a day to open its daily review. Colour is not used: the border marks days with trades."
- [X] T019 [P] [US1] `frontend/src/components/FocusPanel.tsx` and `MistakePanel.tsx`: "Your focus" (yesterday from the review of the latest day with an answer, this week, this month, "No focus written.", link "Change focus" to the existing focus dialog route) and "Mistakes in <month>" (each mistake's count and stop-line status from the existing `GET /mistakes/counter`, the note "A count is the number of records: each tag on a trade and each whole-day record.", link "Open the Mistakes counter").
- [X] T020 [US1] `frontend/src/app/page.tsx` and `frontend/src/components/CurrencyBlocks.tsx`: Home replaces the redirect to `/reviews`: reads the query parameters, calls `getAnalytics`, shows `PeriodScope`, the notice "Your accounts use two currencies. Figures are shown once per currency and are never added together." and one block per currency headed "USD accounts" with the account names, and the three empty states of the content list (words verbatim); the page is `force-dynamic` like the Trades list; the sign-in callback still lands on `/`.

**Checkpoint**: Home works on its own with the reference month. Stop and look at H1 and H4 on the dev stack together.

---

## Phase 4: User Story 2 - Ask whether there is an edge, and where it lives (Priority: P1)

**Goal**: the Analytics Statistics tab: the performance table with definitions, the break-even band, the five breakdowns, and drill-through to the Trades list.

**Independent test**: every statistic equals the quickstart's figure; the Tuesday row shows 4 trades and +170.00 and opens the Trades list filtered to Tuesdays with a total of 4; a band of 40.00 gives 7 of 11 (64%).

### Tests for User Story 2

- [X] T021 [US2] `backend/tests/analytics_test.go` (more): "the five breakdowns of the reference month equal `screens.md` (weekday Mon 2/+20, Tue 4/+170, Wed none, Thu 4/+160, Fri 2/-10; hour 09 6/+500 and 10 6/-160; NQ 8/+480 and ES 4/-140; long 9/+620 and short 3/-280; Funded 50K 8/+290 and Alpha 2 4/+50), each with wins, counted and plan figure"; "the hour follows the journal time zone and the weekday the trading day (an account with a 17:00 day start)"; "`GET /trades` with `weekday`, `hour`, `instrument`, `direction`, `mistakeId`, `plan` returns exactly the trades of the row and its total equals the row's `trades` (SC-006)"; "an invalid filter (weekday 8, hour 24, direction 'up', a non-UUID mistakeId, plan 'x') is `422`".
- [X] T022 [P] [US2] `frontend/e2e/us11-analytics.spec.ts`: the performance table with every row, its `n` and "Plan followed (same trades)"; a Definition panel opens with its words and closes (Profit factor: "The sum of the net results of the winning trades divided by the sum of the net results of the losing trades, as a positive number. Here: $780.00 / $440.00 = 1.77."); a one-trade scope shows the dashes with their reasons and "few trades"; the band field changes the win rate to "7 of 11 (64%)" with "1 trade inside the break-even band set aside from the win rate" and leaves money unchanged; selecting the Tuesday row opens the Trades list with a chip "Weekday: Tuesday" and a total of 4 and clearing the chip restores the list; selecting an instrument, direction and account row works the same.

### Implementation for User Story 2

- [X] T023 [US2] `backend/internal/analytics/series.go` and tests (more): `Breakdowns` (weekday, hour, instrument, direction, account) as `Row` lists with `key`, `label`, `trades`, `netResult`, `wins`, `counted`, `plan`, `few`; weekdays Monday to Friday always listed ("— no trades" for a weekday with none), hours and the others only with trades; Saturday and Sunday only with trades.
- [X] T024 [US2] `backend/queries/trades.sql`, regenerate sqlc, and `backend/internal/api/trades.go`: the five optional filters on `ListTrades` and `CountTrades` ("weekday 1 to 7 of the trading day, hour 0 to 23 of the entry in the journal time zone, instrument, direction `long` or `short`, mistakeId, plan `followed`, `notfollowed` or `notjudged`") with the same predicates as `AnalyticsRows`, `422` with the field message for an invalid value; the unfiltered behaviour is unchanged (existing tests).
- [X] T025 [US2] `backend/internal/api/analytics.go`: add `breakdowns` to each block and apply `band` to the win rate and the streaks.
- [X] T026 [P] [US2] `frontend/src/components/StatTable.tsx` (the Definition panel shows the API's `definition` text; there is no second copy of the words in the frontend): the table (Statistic, Value, n, "Plan followed (same trades)", Definition), the scope strip ("12 trades, USD · Plan followed 6 of 12 · 3 not judged yet · R known for 8 of 12 trades" and the band suffix), the drawdown note ("Maximum drawdown is the largest fall of the running result from a peak ($120.00 on Thu 1 Oct) to a trough (-$60.00 on Tue 6 Oct). It is in money: there is no capital to take a percentage of."), a dash row showing "— <reason>" in muted text, and the Definition panel; a test (T045) compares the Go definitions with `docs/domain.md`.
- [X] T027 [P] [US2] `frontend/src/components/BreakdownTable.tsx`: the five tables with Trades, Net result, Win rate, Plan followed and "few trades" marks, each row a link to `/trades?...` with the scope's account and period plus the row's filter, the notes ("Select a row to open the Trades list for exactly those trades.", "Only hours with trades are listed. The hour follows the journal time zone, like the trading day.", "Rows with fewer than 10 trades are marked "few trades". Every row shows its trade count: a rate is never shown without it.").
- [X] T028 [US2] `frontend/src/app/analytics/page.tsx`: the Statistics tab with the tabs "Statistics" and "Rule replay and mistakes", `PeriodScope` with the band, the scope strip, `StatTable`, `BreakdownTable`, one block per currency, the link "Open Rule replay and mistakes", `force-dynamic`.
- [X] T029 [US2] `frontend/src/components/TradeFilters.tsx` and `frontend/src/app/trades/page.tsx`: pass the five filters through to `GET /trades`, show each active one as a chip ("Weekday: Tuesday", "Hour: 10:00 to 10:59", "Instrument: NQ", "Direction: Short", "Mistake: Chased entry", "Plan: Not followed") with a clear control, keep them in the pager and the page-size links, and say in the count line what is filtered.

**Checkpoint**: US1 and US2 work together. Stop and look at H2 and the Trades drill-through.

---

## Phase 5: User Story 3 - See what rule-breaking cost me (Priority: P2)

**Goal**: the Rule replay and mistakes tab: the five lines that add up, the judged strip, the partly-judged and nothing-judged states, and the cost of each mistake.

**Independent test**: the reference month gives followed +720 (6), not followed -280 (3), not judged -100 (3), actual +340 (12), without +620 (9); judging the three not-judged trades moves them into the lines; Chased entry shows 2 trades and -240.00.

### Tests for User Story 3

- [X] T030 [US3] `backend/tests/analytics_test.go` (more): "the replay lines of the reference month and of the sample day (actual +45.00, edge leak -130.00, without +175.00, judged 3 of 3)"; "the lines add up: followed + not followed + not judged = actual, and without = actual minus the edge leak"; "partly judged (4 of 12) keeps the not-judged trades in `without`"; "a profitable plan-breaking trade makes the edge leak positive and `without` lower than actual"; "nothing judged answers judged 0 of 12 with the lines"; "mistake cost: Chased entry 2 trades -240.00, Moved stop 1 trade -90.00 (a trade with two tags counts under both), a mistake with no trade in the scope is absent, and `records` equals the Mistakes counter for the same scope (`GET /mistakes/counter`)".
- [X] T031 [US3] `frontend/e2e/us11-analytics.spec.ts` (second part): the Rule replay tab shows the five lines, the scope strip "Judged: 9 of 12 trades · 3 not judged yet · USD", the note "Not judged yet is never guessed. Partly counts as not followed, because Partly never counts as following the plan."; judging a not-judged trade in the daily review and returning moves the lines; the partly-judged notice "Only a third of the period is judged, so the edge leak is a floor, not the whole story. Judge the 8 trades to complete it." and the nothing-judged state "No trade judged yet." with the button "Judge the trades not judged yet"; selecting a mistake row opens the Trades list with the "Mistake: Chased entry" chip and 2 trades.

### Implementation for User Story 3

- [X] T032 [US3] `backend/internal/analytics/replay.go` and `replay_test.go`: `Replay` (the five lines "followed, notFollowed, notJudged, actual, without", `judged`, `of`) and `MistakeCost` (per mistake name: trades, net result, plan figure, `records` from `MistakeRecords`); tests with the sample day, the reference month, partly judged, nothing judged and the two-tag trade.
- [X] T033 [US3] `backend/internal/api/analytics.go`: add `replay` and `mistakeCost` to each block.
- [X] T034 [P] [US3] `frontend/src/components/ReplayTable.tsx` and `MistakeCostTable.tsx`: the table of H3 (Trades, Net result, "What it is": "Trades you judged as following the plan", "The edge leak: what these trades cost", "Neither followed nor not followed: judge them to place them", "The three lines above added up", "Actual result minus the edge leak; the 3 not judged stay in"), the bars with the text equivalent "Bars: followed +$720.00, not followed -$280.00, not judged -$100.00, actual +$340.00, without the plan-breaking trades +$620.00", the mistake table with the note "A trade with two mistakes counts under both, so these rows do not add up to a total. Mistakes with no trades in the period are not listed. Select a row to open its trades." and the three states.
- [X] T035 [US3] `frontend/src/app/analytics/replay/page.tsx`: the Rule replay and mistakes tab (the same controls and tabs), one block per currency, `force-dynamic`.

**Checkpoint**: US1 to US3 work. Stop and look at H3.

---

## Phase 6: User Story 4 - Know what still needs me today (Priority: P2)

**Goal**: Home's needs-you panel, built from the existing review states.

**Independent test**: the list equals the Missing days and not-judged trades of the Reviews screens for the same scope; judging a trade removes its line; Backtest days never appear in the live scope.

### Tests for User Story 4

- [X] T036 [P] [US4] `backend/tests/needsyou_test.go`: "missing days, not-judged trades and missing weeks equal what `GET /reviews` and `GET /reviews/day` show as Missing and not judged for the same accounts and dates"; "a Backtest account's days are never missing in the live scope and not listed even when chosen (no state)"; "newest first, at most 20 per list with the real `total`"; "judging a trade, saving a review and marking a week reviewed each remove its line"; "an invalid date or account is `422` or `404`"; "no token `401` and an agent token refused (the route-walking test lists the route)".
- [X] T037 [US4] `frontend/e2e/us11-home.spec.ts` (more): the Needs you panel lists "2 days missing a review", "3 trades not judged yet" and "1 week not marked reviewed" with their links; following "Judge in the daily review" opens the day and judging removes the line; with everything done it says "Nothing is waiting for you."; a Backtest account's days never appear.

### Implementation for User Story 4

- [X] T038 [US4] `backend/queries/analytics.sql` and regenerate sqlc: `MissingDays` ("distinct account and trading day with live trades where `day_state(account, day) = 'missing'`, in the period and scope"), `MissingWeeks` ("distinct account and `week_start(day)` where `week_state(account, week) = 'missing'`") and `NotJudgedTrades` ("live trades with no plan answer, newest first") each with a total and `LIMIT 20`; they reuse the existing SQL functions so the states cannot drift.
- [X] T039 [US4] `backend/internal/api/needsyou.go` and `server.go`: `GET /needs-you` as in the contract (`missingDays`, `notJudged`, `missingWeeks`, each with `total` and `items`), owner gate, parameter rules as `GET /analytics`.
- [X] T040 [US4] `frontend/src/components/NeedsYou.tsx` and `frontend/src/app/page.tsx`: the panel "Needs you" with "2 days missing a review" (the days and trade counts, link "Open the daily review"), "3 trades not judged yet" (the newest, link "Judge in the daily review"), "1 week not marked reviewed" (dates, link "Open the weekly review"), "and N more" with a link when a list is capped, and "Nothing is waiting for you." when all are empty.

**Checkpoint**: all four stories work.

---

## Phase 7: Polish and cross-cutting

- [X] T041 [P] Accessibility: `frontend/e2e/zz-a11y-home.spec.ts` (axe WCAG 2 A and AA including 4.5:1 contrast) on H1 in its five states, H2 in its four, H3 in its three and H4 in its four, in the light and the night colour set, with the charts reachable as tables and the calendar operable by keyboard.
- [X] T042 [P] Scale: add to `frontend/e2e/zz-scale.spec.ts` the cases "Home on 5,000 trades across ten accounts (this month and all time), Analytics (all time) and a change of scope each open in under one second" (SC-005), logging the timings.
- [X] T043 [P] Screens: `frontend/e2e/zz-screens-home.spec.ts` (capture only, behind `CAPTURE_SCREENS`): every frame of H1 to H4 in light and night to `CAPTURE_DIR` outside the repository, from the reference month plus a EUR account.
- [X] T044 [P] `README.md`: a "Home and Analytics" section (what each shows, the period and scope controls, that every figure is computed by the app and every rate shows its count, where the definitions are, that nothing is stored or changed by these screens).
- [X] T045 [P] `backend/internal/analytics/definitions_test.go`: a test that every `definitionKey` has a definition text in `definitions.go` and a section with the same words in `docs/domain.md` (so the screen, the API and the domain document cannot drift apart).
- [X] T046 Update the Penpot frames and `screens.md` for anything that changed in building (constitution V, same change), including the weekend columns and the archived-account line of H4.
- [X] T047 `scripts/check-persistence.sh` and the loopback check: nothing to add (no stored data); confirm both still pass and write that in `docs/security-review.md` row G-24.
- [X] T048 `docs/decisions.md`: add each decision made during the build with its date and reason (constitution VIII).
- [X] T049 **Local review pass 1 (principle IV):** review `backend/internal/api/{analytics,needsyou,trades}.go`, `backend/queries/{analytics,trades}.sql`, `backend/internal/analytics/*.go`, and the new frontend routes' parameter handling for: unbounded parameters, SQL built from input, a figure that can be a float, an agent token reaching the routes, a write or an audit entry from a read, a decimal rounded anywhere but the display, and the empty-scope paths; fix or record each finding.
- [X] T050 **Local review pass 2:** repeat T049 on the code as fixed (including the `GET /trades` filter predicates against `AnalyticsRows`, which must stay identical).
- [X] T051 `docs/security-review.md`: fill G-23 and G-24 with the control, where it lives and the test that proves it, and the passes of T049 and T050 in the review-pass table.
- [X] T052 Run `./scripts/test.sh` once on the composed stack (every Go test and every Playwright spec of features 000 to 005, the accessibility pass, the scale timings and the secret, loopback and persistence checks) and state the result honestly; tell the owner before starting it (it runs on its own throwaway project, not on the dev stack).
- [X] T053 Rebuild the development stack (`docker compose down; docker compose up --build -d` in `self-host/apps/tradecraft`) so the owner sees Home and Analytics at `http://127.0.0.1:3101` and can try the scopes with their own data.
- [X] T054 Visual review (`/speckit-screens-review`): compare the built H1 to H4 with the Penpot frames in a real browser in both modes, run the critique and audit checks, fix what is clearly wrong, and ask for the owner's approval of the look. Also check SC-001 here, by hand: the owner can tell within five seconds, from Home alone, their month's net result, how many trades followed the plan and what is waiting.
- [X] T055 Confirm each new rule of `docs/domain.md` with the owner, one by one, in words with its worked example (SC-009), and fill in "Confirmed by owner on" and "Source" for each; a rule the owner changes is changed in code, tests and the document together.

---

## Dependencies and execution order

- Phase 1 (T001 to T003) has no dependency and runs together.
- Phase 2: T004 first (the generated store); then T005 and T006 together; T007 needs T004 to T006; T008 needs T007; T009 to T011 (web foundations) are independent of the backend after T007's contract and run together.
- US1 (T012 to T020): T014 needs T006; T015 needs T014; the components T016 to T019 run together after T009 and T015; T020 needs T016 to T019 and T011; tests T012 and T013 are written alongside.
- US2 (T021 to T029): T023 needs T014; T024 can start after T004; T025 needs T023; T026 and T027 run together after T025; T028 needs T026, T027 and T011; T029 needs T024.
- US3 (T030 to T035): T032 needs T006 and T004; T033 needs T032; T034 after T033; T035 needs T034.
- US4 (T036 to T040): T038 needs only the existing SQL functions and can start after T004; T039 needs T038; T040 needs T039 and T020.
- Polish: T041 to T045 together after the stories; T046, T047, T048 after them; T049 and T050 after the last code change; T051 after T050; T052 after T051; T053 after T052; T054 after T053; T055 can be done with the owner any time after T001 and before T054's approval, at the owner's pace.

### Parallel examples

```text
Phase 1:  T001 T002 T003
Phase 2:  T005 T006 together, then T009 T010 while T007 is written
US1:      T016 T017 T018 T019 together; tests T012 T013 beside T014 and T015
US2:      T026 T027 together; T021 T022 beside T023 to T025
US3:      T034 beside T033; T030 T031 beside T032
Polish:   T041 T042 T043 T044 T045 together
```

## Implementation strategy

1. Phase 1 (words and rows in the documents), then Phase 2 (the figures and the first route), checkpoint.
2. US1 Home (the MVP): the owner sees the front door and the cards on their own data; stop and look.
3. US2 Analytics (the other half of the owner's request), then US3 (Rule replay, the feature no competitor has), then US4 (needs you), each ending with a look at its screens.
4. Phase 7: the two review passes, the full suite once, the rebuild of the dev stack, the visual review, and the owner's confirmation of the domain rules.
5. Commit when the owner asks; nothing is pushed without their say-so.
