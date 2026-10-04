# Verification notes: Log Trades (000)

Run on 2026-10-04 on the owner's computer (Windows 11, Docker Desktop), stack built from the `tradecraft_v2` branch.
Everything below was run, not assumed. Failures and gaps are listed first.

## What did not fully meet the plan

1. **SC-008, the whole journal on one screen is slow.** With 5,000 trades across 10 accounts spread over twelve months,
   opening **a month** (417 trades, the page's default view) took 424 ms, changing a filter 116 ms, and saving a trade
   471 ms, so the criterion holds for the list as the owner normally sees it. Opening the **entire** unfiltered list of
   5,025 trades took about 3.9 s (7.2 s before a fix this session). It is measured by `e2e/zz-scale.spec.ts`
   ("worst case"), which only guards against it getting worse (limit 8 s). Meeting 1 s for that view needs windowing or
   paging, which changes a signed-off screen, so it is the owner's call: accept (a month is the default), or add paging.
   The API alone answers the 5,000 trades in 164 ms; the time is in drawing the rows.
2. **Dates show in the browser's own format** (for example 10/01/2025) in the two time fields, not as "Wed 1 Oct 2025".
   The time of day is a 24-hour `HH:MM` text field. Everywhere else the screens use the spec's style (Wed 1 Oct 2025, 24-hour clock).
3. **The Result preview tints only the net result.** The approved Hex skin image also tinted the gross result green.
   `DESIGN.md` (Quiet Outcome Rule) says net result only, and the build follows the written rule.
4. **The browser's Back button does not trigger "Leave without saving?"** App Router offers no hook for it. Closing the
   tab, the sidebar links, "< Trades" and Cancel all ask first.
5. **The first-run browser test needs an empty journal.** It skips itself on a used one; `scripts/test.sh` always gives it a fresh one.
6. **Chromium only.** No other browser was run.
7. **Port 3100 is taken on this computer** by something inside WSL, so the local stack publishes the web tier on 3101
   (`.env`, not committed). The documented default is still 3100.
8. **Not done yet:** the owner's decision on the look (T062), and the design critique and audit that go with it.
   The built screens for it are in `built/`.
9. The two written constitution exceptions still stand (principle I: no process information beside money until `001`;
   principle IV: no sign-in or audit log, local use only).

## Results

### Automated

| Check | Result |
|---|---|
| Go tests against a real PostgreSQL 18 (`./scripts/test.sh`, first step) | all packages pass: 55 top-level tests, 93 with subtests, 0 failures |
| Playwright in Chromium on the composed stack, fresh database | 36 pass, 2 skipped (screen capture, which is not a check), 0 fail |
| Accessibility (axe, WCAG 2 A and AA including text contrast 4.5:1), five screens and their states, light and night | no violations in 8 runs |
| No console errors or 5xx responses across every screen and the main actions | none |
| SC-009: published ports | `127.0.0.1` only, for all three services |
| Constitution IV: the database password | in no tracked file and in no container log |
| SC-010: stop and start the stack | 45 accounts and 5,028 trades identical in the full export |
| SC-001: open the form to the saved trade in the list | the first-run test finishes the whole flow in about 1.7 s, far under 60 s |
| SC-006: a given day in three actions | passes (Trades, From, To) |

### Quickstart scenarios

| # | Result | Where it is checked |
|---|---|---|
| A | pass: gross 100, net 95.4, risk 400, R 0.2385 | `trades_api_test.go` TestScenarioA; browser first-run flow shows +$100.00, +$95.40, $400.00, +0.24 R |
| B | pass: net 97.9, risk and R null, "no stop recorded" | TestScenarioB; `us1` trade B |
| C | pass: net -120, gross, risk and R null, reasons name dollars per point | `typed_result_test.go`; `us4` |
| D | pass: three errors in the wireframe wording | TestScenarioD; `us1` |
| E | pass: preview equals A, nothing saved | TestScenarioE |
| F | pass: "Times cannot be in the future." | TestScenarioF, TestFutureSlackIsOneMinute |
| G1 to G4 | pass | `tradingday_test.go` TestScenariosG1toG4 |
| G5 | pass | TestScenarioG5JustAfterClocksGoForward |
| G6 | pass: exact message on save, and in the preview | TestScenarioG6NonexistentTime; `us5` |
| G7 | pass: the day moves, the instant does not | TestScenarioG7ZoneChange; `us5` |
| H | pass | TestAccountNameIsUniqueIgnoringCaseAndSpaces, TestRenameToExistingNameRefused; `us6` |
| I | pass | TestArchiveAndRestore; `us6` |
| J | pass: currency changes, no number does | TestChangingCurrencyChangesNoNumber |
| K | pass: filters, inclusive range, newest first, stable tie-break | `trades_list_test.go`; `us2` |
| L | pass: every field identical after restore | TestDeleteHidesAndRestoreReturnsEveryField; `us3` |
| M | pass: all accounts and trades, deleted marked, count equals the list | `export_test.go`; `us2` |

Other rules checked beyond the scenarios: eight decimal places refused at the ninth; prices, size and dollars per point
above zero; costs not negative; a new trade on an archived account refused while an existing one stays editable; an edit
from an out-of-date copy refused with 409 (trade and account); no endpoint deletes an account; the repeated hour after
clocks go back uses its first occurrence.

### Browser run (quickstart steps 1 to 7)

Steps 1 to 6 are the Playwright specs `us1` to `us6`. Step 7, comparing every screen with `wireframes/`, is the visual
review: 23 states in both modes are saved in `built/` (names match the wireframes, `-light` and `-dark`). Compared by eye
with the approved Hex skins: layout, copy, states and the filled Long segment match; the gaps are items 2 and 3 above.
The "could not save" and "changed elsewhere" states were produced by simulating the failure in the browser; "could not
load" was captured with the API container really stopped.
