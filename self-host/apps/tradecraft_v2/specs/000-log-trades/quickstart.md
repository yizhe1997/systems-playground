# Quickstart: validating Log Trades (000)

How to prove the feature works end to end once it is built. This is a run guide, not the implementation. Contracts:
[contracts/openapi.yaml](contracts/openapi.yaml). Data and rules: [data-model.md](data-model.md).

## Prerequisites

- Docker with Compose. Nothing else is needed on the machine: Go, Node and Postgres all run in containers.
- Run everything from `self-host/apps/tradecraft_v2`.
- The stack listens on the loopback address only (the written local-only exception). Do not expose it.

## Start the stack

```bash
POSTGRES_PASSWORD=<pick one> docker compose up --build -d
```

- Web: http://127.0.0.1:3100
- API: http://127.0.0.1:8081 (health check at `/health`)

## Run the automated checks

```bash
./scripts/test.sh          # Go tests against a throwaway real Postgres, then the Playwright browser run
```

Expected: every test passes, including the vectors below and the browser scenario in "Browser run".

## Scenarios (API, with curl; amounts are strings)

Create an account first (name "Funded 50K", currency USD, trading-day start "17:00"), then:

| # | Do | Expect |
|---|---|---|
| A | Log NQ long, size 2, entry 21450.00 at 09:41, exit 21452.50 at 09:58 (journal time), dollars per point 20, cost 4.60, stop 21440.00 | gross 100.00, net 95.40, risk 400.00, R 0.2385 (shown as 0.24 R) |
| B | Log ES short, size 1, entry 5300.00, exit 5298.00, dollars per point 50, cost 2.10, no stop | gross 100.00, net 97.90, risk null with the reason "no stop recorded", R null |
| C | Log a trade with dollars per point left out and `typedResult` -120.00 | net -120.00, gross null, risk null, R null, reasons name "dollars per point" |
| D | Log a trade with size 0, an empty instrument, and an exit earlier than the entry | 422; three field errors with exactly the wireframe wording |
| E | Preview a trade (`POST /trades/preview`) with the same inputs as A | the same figures as A, nothing saved |
| F | Log a trade whose exit is in the future | 422 "Times cannot be in the future." |

## Scenarios (trading day)

Account with day start 17:00, journal time zone America/Chicago (CDT, UTC-5, in October):

| # | Exit (journal time) | Expect `tradingDay` |
|---|---|---|
| G1 | Tue 7 Oct 2025 17:30 | 2025-10-08 |
| G2 | Tue 7 Oct 2025 16:59 | 2025-10-07 |
| G3 | Tue 7 Oct 2025 17:00 exactly | 2025-10-08 |
| G4 | Same account with the day start cleared, exit Tue 7 Oct 17:30 | 2025-10-07 (and the earlier trades are recomputed) |
| G5 | Exit just after clocks go forward, Sun 9 Mar 2025 03:30 (day start 17:00) | 2025-03-09 |
| G6 | A local time that does not exist, Sun 9 Mar 2025 02:30 | 422 "That time does not exist on that date in this time zone." |
| G7 | Change the journal time zone to America/New_York; exit 16:30 Chicago on Tue 7 Oct, day start 17:00 | before: 2025-10-07; after: 2025-10-08 (17:30 New York time), and no trade's instant changed |

## Scenarios (accounts, list, delete, export)

| # | Do | Expect |
|---|---|---|
| H | Create an account named "funded 50k" while "Funded 50K" exists | 422 "An account named Funded 50K already exists. Names are not case sensitive." |
| I | Archive an account that has trades | it leaves the accounts list and the account chooser; its trades remain in `GET /trades`; Restore brings it back |
| J | Change an account's currency to EUR | allowed; existing results are unchanged numbers, now labelled EUR |
| K | `GET /trades` with `accountId`, `from` and `to` | only trades of that account whose trading day is in the range, newest exit first |
| L | Delete a trade, then list, then restore | it leaves the list, appears with `deleted=true`, and returns with every field exactly as before |
| M | `GET /export` | every account (archived marked) and every trade (deleted marked); the trade count equals the count shown in the app with Show deleted switched on |

## Browser run (real Chromium, composed stack)

Playwright drives this, and the same steps can be walked by hand:

1. Open the app with no accounts: Trades says "Create an account first." Create "Funded 50K", USD, start 17:00.
2. Log a trade as in scenario A. The Result preview shows +$100.00, +$95.40, $400.00, +0.24 R and "Wed 1 Oct 2025"-style trading day while typing.
3. Clear dollars per point: the typed-result field appears and the preview shows dashes with reasons.
4. Submit the invalid trade from scenario D: the banner says "3 things to fix before this trade can be saved." and the three messages show.
5. Filter by account and date range; switch Show deleted on; Restore; Export and compare the count.
6. Edit the account's day start and watch the affected trades change day; change the time zone in Settings.
7. Compare every screen with `wireframes/` and record any difference (this feeds the visual review).

## Done when

Scenarios A to M pass, the browser run completes with no console errors, and the results (including any failures) are
recorded honestly in the feature's verification notes.
