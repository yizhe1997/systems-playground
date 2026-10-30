# Research and decisions: Home and Analytics

Dated 2026-10-30. Each decision says what was chosen, why, and what was rejected. Domain meanings are in `docs/domain.md` (to be extended by this feature, every new rule flagged unconfirmed until the owner confirms it). Product research: `research/14-analytics-concepts.md`.

## 1. Where the figures are computed: one Go package over one row query

**Decision**: one SQL query returns the **rows** of the scope (one row per live trade: id, account, currency, instrument, direction, trading day, entry hour in the journal zone, net result, R, plan answer, label, mistake names). A new Go package `internal/analytics` turns those rows into every figure (cards, statistics, curve, daily results, breakdowns, replay, mistake cost), with `shopspring/decimal` for every sum, ratio and comparison, and no float anywhere. Home and Analytics both call it, so they cannot disagree.

**Why**: the figures that need an order (running result, drawdown, streaks) and several groupings are short, testable functions in Go and awkward windowed SQL. Money stays exact (constitution III) because rows carry decimal strings and Go uses decimals. A single row query is also the cheapest way to make the Trades list, Home, and Analytics agree on *which* trades are in scope.

**Alternatives**: SQL functions like `day_stats` (the 001 convention, decided 2026-10-13: rules in SQL). Rejected for these figures: gaps-and-islands for streaks, running maxima for drawdown and per-currency, per-breakdown grouping would be five large queries to test against the same hand-worked examples; and the existing functions stay as they are (the daily review and the counter keep using them). A materialised view or cache: rejected, 5,000 trades is a few hundred kilobytes and the budget is one second.

**Consequence**: the convention "rules live in SQL" gets a recorded exception for analytics figures (decisions log); `docs/domain.md` still says what each figure means and the Go tests carry the worked examples.

## 2. Scope: what is "in the figures"

**Decision**: a trade is in scope when it is not deleted, its trading day is in the period, and its account is in the account scope. With no account chosen the scope is **all Live accounts, archived ones included** (their trades are live trades; owner answer 2026-10-30); a chosen account of any kind (Live, Backtest, archived) is shown alone. Backtest accounts are never mixed into the all-accounts scope. Figures are produced **per currency**: the scope's rows are grouped by the account's currency and each group is a block.

**Why**: matches 003's rule for the Trades list and the counter, and the owner's answers. Grouping by currency is the only honest answer to constitution III ("no capital basis invented", no conversion).

**Alternatives**: converting with stored rates (the product has none; constitution III forbids inventing); requiring one currency to be chosen first (the owner chose blocks).

## 3. Period and "today"

**Decision**: the web tier turns a preset (this week, this month, last 30 days, this year, all time, custom) into `from` and `to` **trading days** using the journal time zone's calendar date (the helper that already drives the Trades list's default month), and the API takes only `from` and `to`. Weeks are Monday to Sunday, "this week" is the week of today's date. The default is this month. Custom ranges are validated in the API (end not before start, both valid dates, at most 20 years).

**Why**: the API stays simple and testable with fixed dates (no clock dependence, which hurt two earlier tests); the presets are a screen concern. A trading day that depends on an account's day start is already stored on each trade, so the scope filter is a plain range on `trade.trading_day`.

## 3a. Entry hour

**Decision**: the entry hour is taken in the journal time zone from `entry_at` (`extract(hour from entry_at at time zone <zone>)`), in the row query. The weekday is the ISO weekday of the **trading day** (it is the day the trade belongs to), not of the calendar date of the entry (the two differ for an account that starts its day in the evening).

**Why**: weekday groups follow the trading day like everything else; the hour is a clock fact, so it follows the journal zone like every time shown.

## 4. Definitions (each flagged unconfirmed in `docs/domain.md` until the owner confirms)

| Figure | Definition | Not shown (dash with reason) |
|---|---|---|
| Win | net result > 0 (> band when a band is set; the trade is "set aside" when -band <= net <= band and band > 0) | |
| Win rate | k wins of n counted trades (set-aside trades are not counted), percent half up to a whole number | no counted trades: "no trades" |
| Profit factor | sum of winning net results / absolute sum of losing net results, **over all trades, whatever the band** (the band changes classification, not money), 6 decimals | no losing trade: "no losing trades"; fewer than 2 trades: "needs at least 2 trades, has N" |
| Expectancy (money) | net result / trades, 6 decimals | fewer than 2 trades |
| Expectancy (R) | sum of R / number of trades that have an R | no trade with R: "no stop recorded on N of N trades" |
| Average win / loss | mean net result of wins / of losses (strict, band ignored) | no win or no loss: "no winning trades" / "no losing trades" |
| Payoff ratio | average win / absolute average loss | needs a win and a loss |
| Largest win / loss | highest / lowest net result (a win must be > 0, a loss < 0), with its trading day | none: "no winning trades" / "no losing trades" |
| Maximum drawdown | largest fall of the running net result from a peak, peak starting at 0 before the first trade, trades ordered by trading day then entry time then id; in money, with the peak and trough days (the peak day is "the start" when the peak is 0) | fewer than 2 trades |
| Streaks | longest run of consecutive winning (losing) trades in the same order; a set-aside or break-even trade ends the run | fewer than 2 trades |
| Plan followed X of Y | existing rule (`docs/domain.md`): X answered Yes of Y trades; Partly never counts as followed; unanswered are "not judged yet" | |
| Few trades | a rate with n below 10 is marked "few trades" | |

The words of each definition are held once, in Go (`internal/analytics/definitions.go`), returned with every `Statistic` as `definition`, shown by the Definition panel, and checked against `docs/domain.md` by a test, so the screen, the API and the domain document cannot drift apart (FR-017).

**Why**: these are the common definitions of the field (research/14), chosen so that every figure can be reproduced with a calculator from the Trades list; "dash with reason" follows constitution III; the band changes only classification, so money figures never differ between the screens.

## 5. Edge leak and replay

**Decision** (owner answers 2026-10-27 and 2026-10-30): within a currency block, split the trades by plan answer: **followed** (Yes), **not followed** (No or Partly), **not judged yet** (no answer). Lines: followed sum, not followed sum (= the edge leak), not judged sum, actual (the three added), **without the plan-breaking trades** = actual minus the edge leak. Each line has its trade count. "Judged: J of N". Nothing is assigned to a side by guess.

**Mistake cost**: per mistake name, the trades carrying that tag (each trade counted once per mistake it carries), the sum of their net results, the plan figure of those trades, and the mistake's record count for the period (from the existing `mistake_counts` function, so it equals the counter). Mistakes with no trades in the scope are not listed.

## 6. API shape: two read routes and filters on the Trades route

**Decision**:
- `GET /analytics?from&to&accountId&band` answers one document: the scope, and per currency block: the statistics (with definition keys, `n`, dash reasons), the curve and daily results, the calendar days (result, plan figure, the account to open), the five breakdowns, the replay and the mistake cost.
- `GET /needs-you?from&to&accountId` answers the days Missing, the trades not judged yet and the weeks not marked reviewed for the scope, computed by the **existing** SQL (`day_state`, `week_state`), newest first, with a cap of 20 per list and the real total.
- `GET /trades` gets optional filters `weekday` (1 to 7), `hour` (0 to 23), `instrument`, `direction`, `mistakeId`, and `plan` (`followed`, `notfollowed`, `notjudged`). They use the same predicate fragments as the analytics row query, so a breakdown row's `n` equals the filtered list's total (SC-006).
- Home also reads the existing focus and mistake-counter routes. Nothing is stored; no new table, no migration.

**Why**: one route for everything Analytics shows keeps the figures from the same rows; Home takes the same document and shows the part it needs (a small payload cost is accepted: a month is a few kilobytes). A second route is needed for needs-you because it reuses the review states, which are per account and are not in the row query. Putting the filters on the Trades route reuses its paging, counting and screen.

**Alternatives**: one route per figure (more round trips and risk of disagreement); a Home-only summary route (duplicate figures).

## 7. Charts: hand-drawn SVG, server-rendered, with a table beside each

**Decision**: the equity curve, daily bars and the calendar are drawn in React as plain SVG/HTML (no chart library), in greyscale-friendly tokens from `DESIGN.md`, each with a `View as table` `<details>` holding the same numbers (the text equivalent of FR-020). The calendar is an HTML grid of links (keyboard reachable), not a canvas.

**Why**: three simple charts do not justify a dependency (new supply-chain surface, bundle size, theming for the night mode); the table is required for accessibility anyway and the same data feeds both. The shapes are plain: a polyline with the zero line and the lowest point marked, bars from a zero line.

**Alternatives**: a chart library (recharts, visx): rejected for now; revisit if a chart needs zooming or tooltips.

## 8. Opening a day from the calendar

**Decision**: a calendar cell opens the daily review of the account that has the most trades that day (ties: the first by name); the cell shows the day's total in its currency. With one account chosen it is that account. With several accounts, the daily review's account switcher already reaches the others.

**Why**: a daily review belongs to one account (001); this keeps "select a day to open its review" true without inventing a cross-account review. Flagged for the visual review, since it is a behaviour the owner has not seen built.

## 9. Routes, navigation and the landing page

**Decision**: `/` renders Home (replacing the redirect to `/reviews`); `/analytics` is the Statistics tab and `/analytics/replay` is Rule replay and mistakes; the sidebar gets Home (first) and Analytics (after Mistakes). Period, accounts and band are query parameters (`period`, `from`, `to`, `account`, `band`), read by the server components, so every view is a link. After sign-in the callback goes to `/` (it already does; it now shows Home). The proxy's sign-in redirect and `next` handling are unchanged.

## 10. Performance

**Decision**: one row query per request (index `(account_id, trading_day)` and `(trading_day)` exist) plus the small needs-you and focus queries; Go sums in a single pass per figure. Budget: under one second for 5,000 trades across ten accounts, measured in the browser by an added case in `zz-scale.spec.ts` (SC-005), including the all-time scope.

## 11. Security and data

**Decision**: read-only; no new stored data, secret or outbound call. Both new routes sit behind the owner gate (the route-walking gate test covers any route added); an agent token is refused like every owner route. Query parameters are parsed and bounded (dates, band >= 0 with at most 8 decimals, weekday and hour ranges, a direction in `long|short`, UUIDs), never concatenated into SQL (sqlc parameters). The export is unchanged because nothing is stored (constitution VII). The routes write no audit entry (owner reads are not audited, as today; agent reads will be when agent tools exist).

## 12. Risks and what is left for later

| Item | Why left | When to revisit |
|---|---|---|
| Composite score, setup analytics, drawdown percentage, MAE and MFE | spec exclusions | when setups or a capital basis exist |
| Agent tools for these figures | feature 006 or later; the routes are the contract (FR-017) | with the agent features |
| A chart library | not needed for three plain charts | if a chart needs interaction |
| Cross-account daily view | a daily review is per account | if the owner asks |
| Caching of the analytics document | not needed at this scale | if an all-time scope passes the budget on a bigger journal |
