# Quickstart: validating Home and Analytics

How to prove the feature works end to end. Prerequisites: Docker, Node, the dev stack (`docker compose up --build -d` in `self-host/apps/tradecraft`, web on http://127.0.0.1:3101). The automated suite runs on its own throwaway project (`POSTGRES_PASSWORD=anything bash scripts/test.sh`); say so before running it, because it needs an empty journal and creates thousands of rows (do not point it at the dev stack).

## The reference month

Every example in `screens.md` is one month, October 2026, in one USD account pair (Funded 50K and Alpha 2) plus one EUR account. The same 12 USD trades are the test data of the Go and browser tests, so every figure below can be checked by adding:

| # | Day | Result | Plan | Mistakes | Hour | Instrument | Direction | Account |
|---|---|---|---|---|---|---|---|---|
| 1 | Thu 1 Oct | +120 | Yes | | 09 | NQ | long | Funded 50K |
| 2 | Fri 2 Oct | -90 | not judged | | 10 | ES | long | Funded 50K |
| 3 | Mon 5 Oct | +60 | Yes | | 09 | NQ | long | Funded 50K |
| 4 | Tue 6 Oct | -150 | No | Chased entry | 10 | NQ | short | Funded 50K |
| 5 | Thu 8 Oct | +200 | Yes | | 09 | NQ | long | Funded 50K |
| 6 | Fri 9 Oct | +80 | Yes | | 09 | NQ | long | Funded 50K |
| 7 | Mon 12 Oct | -40 | Partly | | 10 | ES | short | Funded 50K |
| 8 | Tue 13 Oct | +110 | Yes | | 09 | NQ | long | Funded 50K |
| 9 | Thu 15 Oct | -70 | not judged | | 09 | ES | long | Alpha 2 |
| 10 | Tue 20 Oct | +150 | Yes | | 10 | NQ | long | Alpha 2 |
| 11 | Thu 22 Oct | -90 | No | Chased entry, Moved stop | 10 | NQ | short | Alpha 2 |
| 12 | Tue 27 Oct | +60 | not judged | | 10 | ES | long | Alpha 2 |

Expected: net +340.00; 7 wins of 12 (58%); profit factor 780 / 440 = 1.77; expectancy +28.33; average win +111.43; average loss -88.00; payoff 1.27; largest win +200 (8 Oct), loss -150 (6 Oct); maximum drawdown -180.00 (peak +120 on 1 Oct, trough -60 on 6 Oct); longest winning streak 2 (8 to 9 Oct), losing streak 1; plan followed 6 of 12 (1 partly counted not followed, 3 not judged); replay: followed +720 (6), not followed -280 (3), not judged -100 (3), actual +340, without the plan-breaking trades +620 (9); mistake cost: Chased entry 2 trades -240, Moved stop 1 trade -90.

The trades that have an R (a stop was recorded) are 1, 3, 4, 5, 6, 8, 10 and 11 (8 of 12): R 0.60, 0.30, -1.50, 2.00, 0.40, 0.55, 0.75 and -0.60, so the expectancy in R is 2.5 / 8 = 0.3125, shown 0.31 R; the plan figure of those eight trades is 6 followed of 8. The longest losing streak is 1 trade, the earliest being Fri 2 Oct.

## Scenarios

1. **Home is the front door (US1).** Sign in; the address `/` shows Home with the cards above and "Plan followed 6 of 12 (3 not judged)" under each money card; Reviews is still in the sidebar.
2. **Scope and period (FR-002).** Change the period to Last 30 days and the account to Alpha 2: every card, chart and table changes together and the address holds the choice. Reopen the address: the same view.
3. **Two currencies.** Add a EUR account with a few trades: Home shows a USD block and a EUR block and no figure adds across them.
4. **Calendar and needs you (US4).** Select 6 Oct: the daily review of Funded 50K opens. Needs you lists the Missing days, the 3 trades not judged yet and the unreviewed week, and each link leads to the screen that fixes it; judge a trade and its line disappears.
5. **Statistics and breakdowns (US2).** Analytics shows the table above with its definitions; the weekday row Tuesday shows 4 trades and +170.00; selecting it opens the Trades list filtered to Tuesdays with a total of 4.
6. **Break-even band.** Set the band to 40.00: the win rate becomes 7 of 11 (64%), one trade is said to be set aside, money rows do not change.
7. **Dashes.** On a day with one trade the profit factor, expectancy and drawdown are dashes with their reasons.
8. **Rule replay (US3).** The Rule replay tab shows the five lines above; judging the three not-judged trades moves them into the lines and the "Judged" strip reads 12 of 12.
9. **Empty states.** A fresh journal shows "No trades yet." with Log a trade; a period with nothing shows "No trades in this period."
10. **Read-only (SC-008).** Take the export, open Home and Analytics in every state, take the export again: identical, and the audit log has no new entry.
11. **Scale (SC-005).** `zz-scale.spec.ts` seeds 5,000 trades across ten accounts; Home, Analytics (all time) and a scope change each take under one second.

## Where the checks live

Go: `internal/analytics/*_test.go` (the worked examples), `tests/analytics_test.go` (the reference month through the routes, the gate, the scope rules, read-only). Browser: `e2e/us11-home.spec.ts`, `e2e/us11-analytics.spec.ts`, `e2e/zz-a11y-home.spec.ts`, `e2e/zz-screens-home.spec.ts` (capture only), and the new case in `e2e/zz-scale.spec.ts`.
