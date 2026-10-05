# Verification: 001 Journal and reflect

**Date**: 2026-10-05
**How**: `POSTGRES_PASSWORD=<throwaway> ./scripts/test.sh` on a fresh composed stack (Go tests against a real Postgres 18, then Playwright on host
Chromium against the stack, then the loopback, secret and persistence checks). Last full run: Go `ok`, **74 Playwright tests passed, 0 failed**
(3 skipped: the capture specs, which are not checks), loopback `ok`, no secret in a tracked file or a container log, data identical after a stop
and start.

## Quickstart scenarios (API)

| # | Result | Where it is checked |
|---|---|---|
| A figures of the sample day | pass | `reviews_day_test.go` TestScenarioAFigures, `stats_test.go` |
| B draft and yesterday's focus | pass | TestScenarioBAndCDraftAndYesterdaysFocus |
| C nearest earlier answer, none for a new account | pass | same test |
| D reviewed, trades changed after review, editedAt | pass | TestScenarioDReviewedAndTradesChanged |
| E valid loss needs plan Yes; changing the answer clears it | pass | `judgement_test.go` TestScenarioEValidLossAndThePlanAnswer |
| F valid loss on a win refused; a loss that becomes a win loses the label | pass | TestScenarioFValidLossNeedsALoss, `judgement_rules_test.go` |
| G a win flagged as a mistake | pass | TestScenarioGAWinFlaggedAsAMistake |
| H day-level records count once; tag plus record is two | pass | `counter_test.go` TestScenarioHRecordsCountOnce, `stats_test.go` |
| I stop line, status in its own period, 0 and 1000 refused | pass | TestScenarioIStopLine, TestStopLineRules |
| J rename, retire, restore, adding a retired name restores it | pass | `mistakes_test.go` TestScenarioJRenameRetireRestore |
| K focus follows the period, 280 and 281 characters, clear, 409 | pass | `focus_test.go` |
| L the week as seven days, missing day counted, mark | pass | `weekly_test.go` |
| M week listed under the month of its Sunday | pass | `reviews_month_test.go` TestScenarioMWeekIsUnderTheMonthItEndsIn (the 000 export scenario M is also green) |
| N a 17:30 exit for a 17:00 account belongs to the next day | pass | TestScenarioNEveningExitBelongsToTheNextDay |
| O export carries every record | pass | `export_reviews_test.go` |
| P trades carry plan answer and label | pass | TestScenarioPTradesCarryThePlanAnswer |
| Q out-of-date save refused for a review, a focus, a mistake and a judgement | pass | TestOutOfDateReviewIsRefused, TestFocusWriteReplaceClear, TestScenarioJ..., TestOutOfDateJudgementIsRefused |
| R an empty day, third answer only, saved as a draft | pass | `reviews_day_test.go` (empty-day test), `states_test.go` |

## Browser run (real Chromium)

| Step | Result | Spec |
|---|---|---|
| 1 Evening: find the day, judge, answer, grade, mark reviewed | pass | `us1-evening-morning`, `us2-judging` |
| 2 Morning: yesterday's answer on top | pass | `us1-evening-morning` |
| 3 Longer focus, too-long state, clear and Undo | pass | `us4-focus` |
| 4 Look back: months, list, Today, jump, day picker | pass | `us1-lookback` |
| 5 Habit: counts with the split, stop line editor, STOP TRADING | pass | `us3-mistakes` |
| 6 End of week: seven days, missing day counted, mark | pass | `us5-weekly` |
| 7 Trades changed after review | pass | `us1-evening-morning` |
| 8 Trades list Plan column | pass | `us2-judging`, `zz-process-beside-money` |
| 9 Compare with wireframes | done, see `screens.md` "Differences found while building" and "Visual review" | |

## Other checks

- **Accessibility (FR-024)**: axe WCAG 2 A and AA including 4.5:1 contrast, light and night, on Reviews, the daily review, the judge drawer (loss,
  win, leave confirmation), Mistakes (counter, stop line editor with an error, rename with an error, retire, empty), the weekly review, its week
  picker and the focus dialog (`zz-a11y-reviews`). Keyboard-only: stars by arrow keys, drawer and dialogs keep focus inside and Escape closes them
  and returns focus, collapsible weeks, day and week pickers. **One real defect found and fixed**: "Open weekly review" sat inside a collapsible
  `<summary>` (axe `nested-interactive`); it is now beside it. Focus was lost after a drawer or dialog closed; it now returns to the button.
- **No meaning by colour alone**: states and labels are written (`zz-a11y-reviews`, last test).
- **SC-003 and SC-004**: every screen with a money figure has the plan figure beside it, and an unavailable figure is a dash with its reason, light
  and night (`zz-process-beside-money`).
- **Console**: no console error or failed request across Reviews, a day, a week, Mistakes and the dialogs (`zz-console`). The dead
  "Open weekly review" link, which used to give a 404 on prefetch, now works.
- **Scale (SC-008)**, 5,000 trades over 10 accounts. API, with half the trades judged, a year of reviews and focuses (`scale_reviews_test.go`):
  Reviews month 21 ms, calendar 8 ms, a busy day 14 ms, a week 8 ms, counter 6 to 7 ms, save a review 21 ms, save a judgement 18 ms, save a
  focus 3 ms, export 194 ms. Browser (`zz-scale`): Reviews 179 ms, change month 157 ms, a day 101 ms, a week 98 ms, the counter 82 ms, save a
  review 121 ms, save a judgement 86 ms. One earlier run of the 000 list timing read 1,557 ms for the first open (cold, under machine load) and
  passed on the next two runs at about 300 ms; recorded here so it is not forgotten.
- **Detector (impeccable)**: no deterministic finding on the 001 pages and components.

## Not exercised

- No phone layout (out of scope in PRODUCT.md); the wide-screen scale was captured at 2560 x 1440 but is checked by eye only.
- The Penpot frames of S0, S1, S3, S4 and S5 were not redrawn for the small differences listed in `screens.md`; only the S2 frames were.
- Every rule is still marked **unconfirmed** in `docs/domain.md` until the owner confirms it.
