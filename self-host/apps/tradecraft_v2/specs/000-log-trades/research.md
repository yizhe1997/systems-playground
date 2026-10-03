# Research and decisions: Log Trades (000)

**Date**: 2026-10-04. Nothing here is copied from Tradecraft v1 (constitution 1.2.0). The stack comes from the
constitution (Go with Fiber, Postgres, Next.js, Docker Compose). Everything else below is a fresh choice for v2,
with the alternatives that were weighed. The owner reviews these at the plan gate; any can be overruled.

## 1. Where the money maths lives

**Decision**: in Postgres. Exact decimals use the `numeric` type. The derived figures (gross result, net result,
risk, R) are small IMMUTABLE SQL functions, used by stored generated columns on the trade table and by the
"preview" endpoint, so the screen preview and the saved number cannot differ.

**Why**: one definition, exact decimal arithmetic with no library, and the same columns are directly summable by
feature 001 (daily totals, counts) without recomputing in application code. A rule that lives in the database
also holds no matter who writes the data (the later agent access, constitution II).

**Alternatives**: compute in Go with a decimal library and store the results (two definitions to keep in step,
and a second place for a bug); compute on read (cannot be summed or filtered in SQL, so 001 would have to
recompute everywhere).

**Consequence**: Go still parses and validates input (so error messages match the wireframes word for word), and
the database repeats the hard rules as CHECK constraints as a safety net.

## 2. The trading day

**Decision**: a SQL function `trading_day(exit_at, time_zone, day_start)` is the only definition. A trigger fills
a stored, indexed `trading_day` column on each trade when it is written, and recomputes the affected trades
when an account's trading-day start or the journal's time zone changes.

**Rule**: read the exit instant in the journal time zone; with no day start, the day is that calendar date; with a
day start S, add (24 hours − S) to the local time and take the date. So with S = 17:00, an exit at 17:00 or later
lands on the next date and an exit at 16:59 stays on the same date.

**Why**: 001 groups reviews by `account` and `trading_day`, so it should be a plain indexed column; a trigger keeps
it right however it is written, and the function is testable on its own at the boundaries and across a clock change.

**Alternatives**: compute in Go on every write (misses writes made another way, and a settings change needs a
separate recompute path); compute in every query (slow to filter, easy to get differently in two queries).

## 3. Which time zone a typed time means

**Decision**: forms take local date and time in the journal time zone, the server converts to an exact instant,
and the instant is stored as `timestamptz`. If a local time does not exist (the hour skipped when clocks go
forward) it is refused with "That time does not exist on that date in this time zone." If it happens twice (the hour
repeated when clocks go back) the first occurrence is used.

**Why**: futures sessions close at the weekend, so these hours are practically never traded; a simple, stated rule
is enough. **Unconfirmed domain interpretation**, to be written into the domain document.

## 4. Data types and limits

- **Money, prices, size**: `numeric(24,8)`. API values are JSON strings, never numbers, so no floating point ever
  touches them. The browser does no arithmetic; it shows what the server returns.
- **Size**: a positive decimal, not an integer, so stocks with fractional shares are not designed out.
- **Prices**: must be above zero. (A price of zero or below, such as the oil futures price in 2020, is refused for
  now. Recorded as unconfirmed; it can be relaxed later.)
- **Currency**: a fixed list of standard three-letter codes in the code, USD first; it is only a label.
- **R**: net result ÷ risk, stored to 6 decimal places (a ratio, not money), shown with 2.
- **Names and text**: account name 1 to 80 characters, unique ignoring case and surrounding spaces, kept even when
  the account is archived; instrument 1 to 40 characters as typed, not unique; thesis up to 5,000 characters.
- **Display**: a result is shown rounded to the currency's usual decimals only when displayed; stored values keep full precision.
- **Decimal strings in the API** are normalised: trailing zeros are dropped but at least two decimals are kept ("95.40", "100.00", R "0.2385").

## 5. Web tier and API shape

**Decision**: Next.js (App Router, TypeScript) renders pages and calls the Go API from the server side only; the
browser never talks to the API directly. The API is REST with JSON, described by an OpenAPI 3.1 file in
`contracts/`. Errors share one shape: a code, a message and a list of field errors whose text is the exact wording
drawn in the wireframes.

**Why**: this is the shape sign-in will need later (a tier in front of the API that can hold a session), so adding
it will not change the screens or the API paths. For now the API listens on the loopback address only, matching the
written local-only exception (constitution IV).

**Alternatives**: the browser calls the API directly (a second origin to secure later); GraphQL (more machinery than
a log with five screens needs).

## 6. Libraries

| Need | Choice | Alternatives weighed |
|---|---|---|
| Go HTTP | Fiber (named in the constitution) | none |
| Database driver and queries | pgx with sqlc (typed queries from plain SQL files) | hand-written SQL strings (drift and injection risk), an ORM (hides the SQL and the database rules this plan depends on) |
| Migrations | goose, plain SQL files, applied at start by the single API instance | golang-migrate (no real difference for one instance) |
| Decimal parsing in Go | shopspring/decimal, for input validation only | parsing with math/big directly (more code for no gain) |
| Time zones | Go standard library plus the embedded zone database | relying on the container's zone files (breaks in a minimal image) |
| Web | Next.js, React, TypeScript | any other framework (the constitution names Next.js) |
| Styling | not chosen here: components use CSS variables for every colour, size and font, and the real look arrives with the visual direction | picking a UI kit now would pre-empt the look (constitution V) |
| API tests | Go tests against a real Postgres started by Docker Compose | mocks of the database (the constitution forbids), an in-memory database |
| Browser tests | Playwright driving a real Chromium against the composed stack | manual checking only (the constitution asks for a verified browser run) |

Versions are pinned at implementation to the then-current stable releases (Go, Node, PostgreSQL 17 or newer) in the
`go.mod`, `package.json` lockfile and Docker images, and recorded in the plan's tasks, not guessed here.

## 7. Export

**Decision**: one JSON file with the journal settings, every account (archived ones marked) and every trade
(deleted ones marked), all money as strings. The trades list has an Export button that downloads it.

**Why**: it is complete and lossless, which is what "own your data" needs, and the trade count in the file can be checked
against the screen (SC-007). **Alternatives**: CSV of trades (convenient for a spreadsheet, but flat and lossy; can be added later as
a second format without changing this one).

## 8. Domain document

The domain document (`docs/domain.md`) does not exist in v2 yet. It is created in the same change as the behaviour,
with the trading day, gross and net result, risk, R, the time rule in section 3 and the price rule in section 4, each
marked **unconfirmed** until the owner confirms it and a source is added (constitution VIII).

## 9. Testing the hard parts

Test vectors, worked out by hand (not generated from the code under test): long and short trades, with and without costs, a typed result, a
stop equal to the entry, a missing stop, a missing dollars-per-point, very large and very small numbers, trades just
before, at and after a day start, an account with no day start, and a clock change in the journal time zone.
