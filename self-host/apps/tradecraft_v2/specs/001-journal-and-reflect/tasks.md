---

description: "Task list for 001-journal-and-reflect (daily review, judging, mistakes, focus, weekly review)"
---

# Tasks: Journal and Reflect

**Input**: Design documents from `specs/001-journal-and-reflect/` (spec, plan, research, data-model, contracts, quickstart, signed-off wireframes)

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/openapi.yaml, and feature `000` as built (accounts, closed trades, `trade_detail`, the rule functions, the API conventions, the Next.js app). No code, schema or screens from Tradecraft v1 (constitution 1.2.0).

**Tests**: included, because the constitution requires tests with the feature (domain logic and API against a real Postgres, the interface in a real browser). Test-first is not required.

**Organization**: grouped by user story in the order of the spec's priorities (US1 and US2 are P1, US3 and US4 P2, US5 P3). Paths are under `self-host/apps/tradecraft_v2`. Migrations continue `000`'s numbering (`00007` onward).

## Gates before and around implementation

- **Before T001 (implement gate):** the three checklists in `checklists/` are all ticked (`requirements.md`, `domain-rules.md`, `interface-and-operations.md`); `/speckit-implement` reads their state and does not change it.
- **Before T001 (design gate, constitution V): satisfied.** The visual direction (Hex, comfortable, light and night) is approved for the project; screens were signed off on 2026-10-04 (spec hash `0bee1f84…b9fd`). A task that adds a screen or state not in `screens.md` must update `screens.md` and its Penpot frames in the same change.
- **Plan gate: approved 2026-10-04** (the Plan column on the Trades list and the seven other defaults in `research.md` section 14).
- **After the last task:** the visual review (`/speckit-screens-review`) against `wireframes/`, and the owner's approval of the look.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task serves (US1 to US5, from the spec)

## Phase 1: Setup

- [X] T001 [P] Add the new sections to `docs/domain.md`, each marked **unconfirmed** with an empty "Source" line (constitution VIII): week (Monday to Sunday) and month (calendar) on the trading day; "today" per account; the daily states Missing, Draft, Reviewed and today; the weekly states; plan followed X of Y (with partly and not judged yet); win rate (whole percent, half up); valid loss; the mistake count (tags and day records, each once); the stop line and its period; "yesterday's focus" (nearest earlier non-empty answer of the same account). Use the worked sample day of `quickstart.md` as the worked example.
- [X] T002 [P] Add the dated decisions of `research.md` (sections 1 to 14, and the owner's three checklist decisions) to `docs/decisions.md`.
- [X] T003 [P] Extend `scripts/test.sh` and `README.md` only if a new command is needed (none is planned: the same Go and Playwright runs cover this feature); record "no change needed" in `docs/decisions.md` if so.

## Phase 2: Foundation (blocks every story)

- [X] T004 Migration `backend/migrations/00007_mistakes.sql`: table `mistake` exactly as data-model.md: `name text` ("1 to 60 characters after trimming, each run of spaces collapsed to one; unique ignoring case and surrounding spaces, **including retired ones**": a unique index on `lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))` and a CHECK that the stored name has no leading, trailing or repeated spaces), `stop_line integer` ("optional; 1 to 999", a CHECK), `stop_period text` ("`week` or `month`; present exactly when `stop_line` is present", a CHECK), `retired_at timestamptz`, `created_at`, `updated_at` (the `touch_updated_at` trigger from `000`); seed the five starter names once (Chased entry, Moved stop, Oversized, Ignored checklist, Traded outside plan).
- [X] T005 Migration `backend/migrations/00008_judgement.sql`: `trade_judgement` (`trade_id uuid` primary key referencing `trade`, `plan_followed text` "`yes`, `partly` or `no`; null until answered", `label text` "`valid_loss` or `mistake`; null until chosen", `created_at`, `updated_at` with the touch trigger; CHECK `label IS DISTINCT FROM 'valid_loss' OR plan_followed = 'yes'`), `trade_mistake (trade_id, mistake_id)` with a composite primary key, and `day_mistake (account_id, trading_day, mistake_id)` with a composite primary key.
- [X] T006 Migration `backend/migrations/00009_reviews_and_focus.sql`: `daily_review` (primary key `(account_id, trading_day)`; `did_well`, `could_improve`, `next_focus` text each "up to 2,000 characters" (a CHECK), default empty; `mental_grade`, `technical_grade` smallint "1 to 5 (CHECK), or null"; `reviewed_at`, `edited_at`, `created_at`, `updated_at` with the touch trigger), `focus` (primary key `(period, period_start)`; `period` `week` or `month`; `period_start` a Monday for `week` and the first of the month for `month` (CHECK); `body text` "1 to 280 characters" (CHECK on `char_length`); `created_at`, `updated_at` with the touch trigger), and `weekly_review_mark` (primary key `(account_id, week_start)`; `week_start` a Monday (CHECK); `reviewed_at timestamptz`).
- [X] T007 Migration `backend/migrations/00010_stats_functions.sql`: SQL `week_start(date)`, `account_today(account_id)` (`trading_day(now(), journal time zone, the account's day start)`), the view `judged_trade` over live trades joined to their judgement (`plan_followed`, `label`, `is_win`, `is_loss`, `mistake_tags`), the functions `day_stats(account_id, from_day, to_day)` and `period_stats(account_id, from_day, to_day)` (one definition: trades, exact net sum, followed, partly, not_followed, not_judged, mistake_tags (tags on live trades plus day records, each once), valid_losses, losses, wins), `mistake_counts(period_from, period_to, account_id or null)`, `day_state(account_id, day)` and `week_state(account_id, week_start)` with exactly the rules of data-model.md "State rules".
- [X] T008 Migration `backend/migrations/00011_judgement_triggers.sql`: after a change to `trade.net_result`, set `label = null` on a `valid_loss` judgement whose trade's net result is no longer below zero; a plan answer other than `yes` already violates the CHECK, so the API clears the label before saving (T031).
- [X] T009 [P] Go vector tests `backend/tests/stats_test.go` and `backend/tests/states_test.go` against the real database: the sample day of `quickstart.md` (net +45.00; plan followed 2 of 3 with 1 not followed, 0 partly; mistakes 1; valid losses 1 of 2 losing trades; win rate 1 of 3 = 33%); a day with an unjudged trade; a break-even trade (neither win nor loss, cannot be a valid loss); an empty day (dash cases: net result and win rate absent); the week as the sum of its days; soft-deleted trades never counted; and the state rules at their boundaries (a day that has just ended, a 17:00 account at 17:30 whose today is already tomorrow, a week crossing two months, a saved review on a day with no trades, a day with trades and no review that is today versus past).
- [X] T010 [P] Go tests `backend/tests/judgement_rules_test.go`: the CHECK refuses `valid_loss` with a plan answer other than `yes`; the trigger clears `valid_loss` when an edit through the `000` API turns a loss into a win or a break-even; a judgement survives a soft delete and restore of its trade; a mistake tag counts once per trade.
- [ ] T011 sqlc queries in `backend/queries/reviews.sql` (month listing grouped by week ending in the month, day detail, day trades with judgement, yesterday's focus, trades changed after review, calendar marks), `judgement.sql`, `mistakes.sql`, `focus.sql`, `weekly.sql`, `counter.sql`; money and ids use the same overrides as `000`; generate into `backend/internal/store`. Depends on T004 to T008.
- [X] T012 [P] Shared API plumbing in `backend/internal/api/dates.go` (parse a date and a `YYYY-MM` month; the week or month of a date comes from the SQL functions, not recomputed in Go), the 001 error wording constants (`backend/internal/api/wording.go`: "Not available: you answered that the plan was not followed.", "Not available: this trade is not a loss.", "This day has not happened yet.", "Too long: N characters over. Shorten it to save." with "1 character over" for one, "Stop line must be 1 or more.", "Stop line must be 999 or less.", "A mistake named X already exists. Names are not case sensitive."), and `conflict(...)` uses for "review", "judgement", "focus" and "mistake" (the `000` helper in `concurrency.go`: "This review was changed elsewhere. Reload to see the latest version.").
- [X] T013 [P] Test harness additions in `backend/tests/helpers_reviews_test.go`: create the three-trade sample day of `quickstart.md` (accounts via the `000` helpers, a 17:00 account, `exitTrade`), judge trades, save reviews, and a `getJSON` that decodes the 001 shapes; keep the shared clock of `main_test.go` for "today".
- [X] T014 [P] Frontend foundation: `frontend/src/lib/types.ts` additions (the 001 shapes of contracts/openapi.yaml), server fetchers in `frontend/src/lib/data.ts`, display-only helpers in `frontend/src/lib/format.ts` (the screen styles "Wed 1 Oct", "Week of 29 Sep to 5 Oct", "October 2025", singular and plural of counts), and `frontend/src/components/AccountSwitcher.tsx`, `StatusChip.tsx`, `Stars.tsx` (five options as a radio group, arrow keys, "4 of 5" or "Not graded" beside it, "1: drifted from the plan. 5: followed it fully."), `Drawer.tsx` (the native `<dialog>` as a side drawer, focus kept inside, Escape closes; closing it with unsaved changes asks "Leave without saving? Your changes will be lost." with Keep editing and Leave through its own confirm, because `useUnsavedGuard` only catches link clicks and the closing of the tab).
- [X] T015 [P] Styles for the new components in `frontend/src/styles/app.css` from the existing tokens only (chips, stars, drawer, collapsible week blocks, pickers, the numbers strip); status words and picker marks (• has trades, ! review missing) carry meaning in text or symbol, never colour alone; the profit and loss tint stays on net-result text only.
- [X] T016 [P] Playwright helpers in `frontend/e2e/helpers_reviews.ts`: create the sample day through the API (accounts, three trades, judgements), seed reviews, and read states; extend `helpers.ts` only where needed.

**Checkpoint**: migrations apply on a fresh database and on one that has `000` data; the vector tests pass; the sqlc code builds; the shared components render.

## Phase 3: User Story 1 - Review the day with yesterday's focus (Priority: P1) 🎯 MVP

**Goal**: open a day's review for an account, see its trades and numbers and yesterday's focus, answer the three questions, set grades, save a draft or mark reviewed; find days in Reviews. **Independent test**: scenarios A (figures), B, C, D, M, N, R of quickstart.md and the evening and morning browser steps, without judging.

### Tests for User Story 1

- [X] T017 [P] [US1] Go test `backend/tests/reviews_day_test.go`: `GET /reviews/day` figures for the sample day (A); `PUT /reviews/day` creates a draft with `savedAt` set and `reviewedAt` null (B); `focus.yesterday` is the 1 Oct answer on 2 Oct, still labelled 2025-10-01 on 6 Oct, skips an earlier empty answer, and is null for an account with no review (C); marking reviewed sets `reviewedAt` and a later save sets `editedAt`, a trade edit through the `000` API makes `tradesChangedAfterReview` 1, a soft delete counts too (D); marking a day that has not happened yet is refused with "This day has not happened yet."; marking reviewed needs no answers, grades or judged trades; an empty day opens and saves (R); an out-of-date save returns 409 "This review was changed elsewhere. Reload to see the latest version." (Q).
- [X] T018 [P] [US1] Go test `backend/tests/reviews_month_test.go`: `GET /reviews` lists the week of 29 Sep to 5 Oct under October and not under September (M); the filter counts equal the days listed; Missing, Draft, Reviewed and today are right at the boundaries; a 17:30 exit of the 17:00 account belongs to the next day for the review and in `GET /reviews/calendar` (N); days with no trades and no review are not listed; a saved review on a day with no trades is listed.
- [X] T019 [P] [US1] Playwright `frontend/e2e/us1-evening-morning.spec.ts`: Reviews shows the sample day as Missing (or today) and "Create an account first." with no account; Review this day opens the daily review with the figures; write the three answers, set the stars, Mark as reviewed and see "Reviewed … "; leaving with typed answers asks "Leave without saving? Your changes will be lost."; open the next day and see "Yesterday: Wed 1 Oct" with the answer; the unjudged-trades note and the "This day has not happened yet." state; the Plan line "(1 not followed · 0 partly · 1 not judged yet)"; assert that opening the review to marking it reviewed takes under 5 minutes on the three-trade sample day (SC-001, a timed run); the account switcher opens the first active account by name, keeps the chosen account when moving between Reviews, a daily review and a weekly review, lists archived accounts marked archived and keeps their past reviews readable and editable (FR-028).
- [X] T020 [P] [US1] Playwright `frontend/e2e/us1-lookback.spec.ts`: step months with the arrows, open the month list, Today, Jump to date, collapse and open weeks, open a week's days and a day; the day picker marks days with trades (•) and missing reviews (!) and has "Go to today"; stepping to the previous and next day.

### Implementation for User Story 1

- [X] T021 [US1] `backend/internal/api/day.go`: `GET /reviews/day` and `PUT /reviews/day` per contracts/openapi.yaml: the day, state, answers, grades, the three focus lines (T011 queries; the week and month focus parts stay empty until US4), `stats` from `day_stats`, `trades` with their judgement fields (null until US2), `dayMistakes` (empty until US3), `tradesChangedAfterReview`, `previousDate` and `nextDate`; validation in the order of data-model.md (account exists, real date, grades 1 to 5 or null, answers up to 2,000 characters, `markReviewed` refused for a day that has not happened yet); the version token `updatedAt` with `expectedUpdatedAt` (409); saving a reviewed review sets `edited_at`; register the routes in `server.go`.
- [X] T022 [US1] `backend/internal/api/reviews.go` and `backend/internal/api/calendar.go`: `GET /reviews` (the month's weeks, newest first, each week with its summary, state and day rows; `monthFocus` empty until US4; filters counts; `previousMonth`, `nextMonth`, `today`) and `GET /reviews/calendar` (days with trades, days missing, week states for the pickers, and `months`: the months that have live trades or a saved review for the account plus the current month, newest first, for the month list).
- [X] T023 [US1] Navigation and home: `frontend/src/components/Nav.tsx` and `frontend/src/app/layout.tsx` show Reviews, Trades, Mistakes, Accounts, Settings under the brand "Tradecraft" (the Mistakes link is added with its screen in T040 to avoid a dead link); `frontend/src/app/page.tsx` redirects `/` to `/reviews`; update 000's e2e that expect the old sidebar or the Trades home (`frontend/e2e/*.spec.ts`).
- [X] T024 [P] [US1] Reviews (S0): `frontend/src/app/reviews/page.tsx`, `frontend/src/components/MonthNav.tsx` (arrows, the name opens the month list of `GET /reviews/calendar`, Today, Jump to date), `WeekBlock.tsx` (collapsible, the current week open, status chip, summary "1 of 3 days reviewed · 1 draft · 1 missing", Open weekly review), `DayRow.tsx` (date, trades, net result with "Plan followed 2 of 3 · 1 mistake" beside it, state chip, Open or Review this day), the filters All, Missing, Draft, Reviewed with counts, the month focus card (read-only until US4), the empty state "Nothing to review yet for … " and "Create an account first." with no account, wording exactly as in `screens.md`.
- [X] T025 [P] [US1] Daily review (S1): `frontend/src/app/reviews/day/page.tsx`, `FocusCard.tsx` (Yesterday with its date, "nothing to show" state, This week and This month lines read-only until US4), `NumbersStrip.tsx` (net result with plan beside it, plan followed with the detail line including "not judged yet", mistakes, valid losses, win rate with its basis, and under the strip the "How these are counted" line of `screens.md` so every statistic states its definition, FR-023), `DayTradesTable.tsx` (time, instrument, side, size, result, followed plan, judgement, mistakes; Judge buttons arrive with US2), `ReviewForm.tsx` (three questions, two star grades, Save draft, Mark as reviewed, "Last saved 18:22", "Reviewed Wed 1 Oct 18:40 · Edited Thu 2 Oct 09:10", the changed-after-review notice, the not-judged note, the not-yet-happened state, 409 and failure banners as in `000`, `useUnsavedGuard`), `DayNav.tsx` and `DayPicker.tsx` (previous, picker, next; picker marks • and !). The empty-day state per `screens.md`.

**Checkpoint**: the owner can open any day, answer, grade and mark it reviewed, see yesterday's focus, and look back through the months. This is the MVP.

## Phase 4: User Story 2 - Grade the decision, not the result (Priority: P1)

**Goal**: plan answer, valid loss or mistake per trade, process grades with the day's money, the Plan column on the Trades list. **Independent test**: scenarios E, F, G, P and the judging browser steps.

### Tests for User Story 2

- [ ] T026 [P] [US2] Go test `backend/tests/judgement_test.go`: set a plan answer; valid loss refused with "Not available: you answered that the plan was not followed." when the answer is no or partly, saved when yes; changing yes to partly clears the label; valid loss refused on a win with "Not available: this trade is not a loss."; a win can be labelled mistake and shows as a profitable mistake (the day counts it); a break-even trade can be labelled mistake only; the day figures follow every change (E, F, G); an out-of-date judgement save returns 409; `GET /trades` and `GET /trades/{id}` carry `planFollowed` and `label` (P).
- [ ] T027 [P] [US2] Playwright `frontend/e2e/us2-judging.spec.ts`: from S1 press Judge on a trade: the drawer shows the result strip (risk "—" with "No stop recorded, so no risk figure." when there is no stop), the plan question, valid loss dashed with its reason until the answer is Yes, the win flag, the thesis read-only, "Edit trade in the trade form."; Save closes the drawer and the table and numbers update; Escape or Close with unsaved changes asks first; grades show with the day's net result; the Plan column on Trades shows Followed, Partly, Not followed, Not judged yet and the Mistake or Valid loss line, and the footnote says "The plan answer comes from the daily review."
- [ ] T028 [US2] Update feature `000` tests for the changed list: `frontend/e2e/us1-first-trade.spec.ts` and any spec that matches the Trades footnote or columns (`getByText("Each result is in its own account's currency. This list has no totals.")` now has a second sentence); `frontend/e2e/zz-screens.spec.ts` sample data may add plan answers.

### Implementation for User Story 2

- [ ] T029 [US2] Migration `backend/migrations/00012_trade_detail_plan.sql`: recreate the view `trade_detail` adding `plan_followed` and `label` (left join `trade_judgement`) without changing any existing column; regenerate sqlc; `backend/internal/api/trades.go` `toTrade` and the `tradeJSON` gain `planFollowed` and `label` (null until judged); update `contracts/openapi.yaml` of `000` is not needed (the addition is recorded in this feature's contract).
- [ ] T030 [US2] Plan column in `frontend/src/components/TradesTable.tsx` (feature `000`'s list): a "Plan" column after Net result showing Followed, Partly, Not followed or Not judged yet with "Mistake" or "Valid loss" underneath; the footnote gains "The plan answer comes from the daily review."; keep the row actions delegation of `000` (no per-row client components).
- [ ] T031 [US2] `backend/internal/api/judgement.go`: `GET` and `PUT /trades/{id}/judgement` per contracts/openapi.yaml: validation in order (trade exists; plan answer yes, partly or no; the label rules above; tag ids exist and are not retired (tags arrive with US3)); a plan answer other than yes clears a valid-loss label before saving; `validLoss.available` and its reason in the answer; `updatedAt` and `expectedUpdatedAt` (409); judging writes only the judgement tables, so `trade.updated_at` and "trades changed after review" are untouched. `day.go` fills each day trade's `judgement`.
- [ ] T032 [P] [US2] Judge drawer (S2): `frontend/src/components/JudgeDrawer.tsx` opened from the Judge button in `DayTradesTable.tsx`: title "NQ Long x2 · Wed 1 Oct · 10:14 to 10:31 · Funded 50K", the result strip (Result, Risk with its dash reason, Plan), "Did you follow your plan?" Yes, Partly, No, "What was this decision?" (losses only) with Valid loss unavailable and dashed with its reason, "This win was a mistake" for a win, "Mistakes on this trade" (filled by US3), the read-only thesis, Save, Cancel, "Edit trade in the trade form." linking to `000`'s edit page; wording exactly as in `screens.md`.
- [ ] T033 [US2] Grades and judgement in the review: `Stars.tsx` wired in `ReviewForm.tsx` (mental and technical, saved with the day), judgement chips (Mistake, Valid loss) and "Followed plan" in `DayTradesTable.tsx`, "Day total +$45 across 3 trades, 2 followed the plan." under the table.

**Checkpoint**: every trade can be judged and the day shows its process figures beside the money; the Trades list shows the plan beside each result (this ends the principle I exception of feature `000`).

## Phase 5: User Story 3 - Tag mistakes and see the counter with a stop line (Priority: P2)

**Goal**: one list of mistakes, tags on trades, day-level records, a week and month counter, optional stop lines. **Independent test**: scenarios H, I, J and the habit browser step.

### Tests for User Story 3

- [ ] T034 [P] [US3] Go test `backend/tests/mistakes_test.go`: the five starter mistakes exist; add, rename (a name already used, retired included, is refused with "A mistake named X already exists. Names are not case sensitive."), retire (hidden from `GET /mistakes` and from new tags, kept on old trades), restore, adding a retired name restores it (J); name 1 to 60 characters; stop line 0 and -1 give "Stop line must be 1 or more." and 1000 gives "Stop line must be 999 or less." (I); a stop line needs its period.
- [ ] T035 [P] [US3] Go test `backend/tests/counter_test.go`: tags on trades and day records each count once and the same mistake tagged on a trade and recorded for its day is two records (H); the split by account and by kind; status `stop` at the line in the stop line's own period and `count_only` below it, read for the viewed week or month (I); a retired mistake appears only with a count in the period; a week crossing two months counts whole in the week column and only its days of the month in that month column; soft-deleted trades are not counted and come back on restore; rename keeps the counts.
- [ ] T036 [P] [US3] Playwright `frontend/e2e/us3-mistakes.spec.ts`: tag a mistake in the drawer, record one for the whole day, see the counter on Mistakes with the split; set a stop line in the editor (error "Stop line must be 1 or more."), reach it and the row reads "STOP TRADING: 4 of 4 this week"; rename and retire with the dialogs and the 10-second Undo ("Mistake retired."); nothing-tagged empty state with "Go to the daily review".

### Implementation for User Story 3

- [ ] T037 [US3] `backend/internal/api/mistakes.go`: `GET /mistakes` (by name; `includeRetired`), `POST /mistakes` (201; restores a retired name), `PUT /mistakes/{id}` (rename, stop line and period; `expectedUpdatedAt` 409), `POST /mistakes/{id}/retire`, `POST /mistakes/{id}/restore`; the unique-name violation answers in the account-style wording of T012.
- [ ] T038 [US3] `backend/internal/api/counter.go` (`GET /mistakes/counter`: rows with week and month cells (on trades, on days, total), the split by account, stop line, status, progress "4 of 4 this week") and the tags in `judgement.go` (`mistakeIds` replace the trade's tags; retired mistakes refused for new tags) and the day-level records `PUT /reviews/day-mistakes` in `day.go` (replace the set for an account and day; one record per mistake per day).
- [ ] T039 [P] [US3] Mistakes (S3): `frontend/src/app/mistakes/page.tsx`, `MistakeCounter.tsx` (Week and Month, the period, All accounts filter, the table with counts and splits, status chips, the footnote "Each record counts once …"), `StopLineEditor.tsx` (dialog: "Counted per (week)", the 1 to 999 rule), `MistakeList.tsx` (Manage the list: Add, Rename dialog, Retire dialog with the confirm text of `screens.md`, Undo notice through the `000` toast), the empty state.
- [ ] T040 [US3] Navigation and S1/S2 wiring: add the Mistakes link in `Nav.tsx`; the tags section of `JudgeDrawer.tsx`; "Mistakes for the whole day" (Not tied to one trade, one recorded once, "+ Add a mistake") in `ReviewForm.tsx`; the numbers strip lists "Mistakes 1 (Chased entry x1)".

**Checkpoint**: habits are counted exactly, a stop line says STOP TRADING when reached, history stays right after rename and retire.

## Phase 6: User Story 4 - Plan flows down: a focus for the week or month (Priority: P2)

**Goal**: write a week and a month focus once and see them on every daily review in the period. **Independent test**: scenario K and the focus browser step.

### Tests for User Story 4

- [ ] T041 [P] [US4] Go test `backend/tests/focus_test.go`: write, replace and clear a week and a month focus; the week and month of a daily review follow its trading day and are shared by all accounts; three reviews in the week show both, the next week shows the month and "none" for the week (K, SC-007); 280 characters accepted, 281 refused with "Too long: 1 character over. Shorten it to save." and 307 with "27 characters over" (counted as Unicode characters); an empty body clears; an out-of-date save returns 409.
- [ ] T042 [P] [US4] Playwright `frontend/e2e/us4-focus.spec.ts`: Write one and Edit from the S1 and S0 cards open the dialog; tabs Week and Month with the right labels; "43 of 280 characters"; the too-long state with Save focus unavailable; Save focus updates the card; "Focus cleared." with Undo for 10 seconds; the empty states "No focus for this week yet." and "No focus for this month yet."; a week's focus appears on the weekly review.

### Implementation for User Story 4

- [ ] T043 [US4] `backend/internal/api/focus.go`: `GET /focus` and `PUT /focus` per contracts/openapi.yaml (period start from `week_start` or the first of the month in SQL, count characters with `utf8.RuneCountInString`, empty body deletes the row, version token and 409); fill `focus.week` and `focus.month` in `day.go` and `monthFocus` in `reviews.go`.
- [ ] T044 [US4] Focus dialog (S4): `frontend/src/components/FocusDialog.tsx` (title "Write a focus", tabs Week and Month, "Focus for the week of 29 Sep to 5 Oct" or "Focus for October 2025", the counter "43 of 280 characters", the too-long message and the unavailable Save focus, "Shown at the top of every daily review this week, on all your accounts.", Save focus, Cancel, Clear this focus with the Undo notice), wired to the focus card in S1, the month card in S0 and (US5) the focus card in S5; leaving with changes asks first.

**Checkpoint**: a focus is written once and shown on every daily review in its period and nowhere else.

## Phase 7: User Story 5 - Reflection flows up: the weekly review (Priority: P3)

**Goal**: a read-only roll-up of a week for an account with a reviewed mark. **Independent test**: scenario L and the end-of-week browser step.

### Tests for User Story 5

- [ ] T045 [P] [US5] Go test `backend/tests/weekly_test.go`: seven days Monday to Sunday with statuses missing, draft, reviewed, no_trades, not_yet (L); a missing day's trades count in the week totals; the week state is `missing` once the week has ended with days that have trades and no mark, never for the current week; `POST /weekly/mark` makes it `reviewed` with a time and a second call changes nothing; the mark is refused for a week that has not started; the week's figures equal the sum of its days (same SQL definitions); the weekly review stores nothing but the mark (a row-count check on the tables); there is no endpoint that removes a mark (FR-021a).
- [ ] T046 [P] [US5] Playwright `frontend/e2e/us5-weekly.spec.ts`: the seven days with the missing day named and its trades counted in the numbers; the focus card with Edit and Write one; the week picker with the Reviewed or Missing mark per week (weekends selectable); previous and next week; Mark as reviewed shows "Reviewed" with the time and "Weekly reviews save only this mark and its time."

### Implementation for User Story 5

- [ ] T047 [US5] `backend/internal/api/weekly.go`: `GET /weekly` (any date of the week; days with answers, grades, trades, net result and plan line; `stats` from `period_stats`; the week and month focus; `previousWeek`, `nextWeek`; the state from `week_state`) and `POST /weekly/mark` (idempotent; refused for a week that has not started); `reviews.go` week blocks use the same state.
- [ ] T048 [P] [US5] Weekly review (S5): `frontend/src/app/reviews/week/page.tsx`, `WeekPicker.tsx` (Mo to Su, the Week column Reviewed or Missing, "Click any day, or a row, to open that week. Weekends count.", This week), the focus card (with the S4 dialog), the days list ("What you wrote each day", Missing day text "No review for Mon 29 Sep. Its 4 trades (+$120, plan followed 3 of 4) are included in the totals below.", "No trades on Thu 2 Oct.", "This day has not happened yet.", empty weekend days on one line), "The week in numbers" with process beside each figure and the same "How these are counted" line under it, status top right (Not reviewed, Reviewed, Missing), Mark as reviewed; wording exactly as in `screens.md`.

**Checkpoint**: the week reads as its days; marking it reviewed saves only the mark and its time.

## Phase 8: Polish and cross-cutting

- [ ] T049 [P] Export (FR-025): extend `backend/internal/api/export.go` and `backend/queries/export.sql` additively with `mistakes`, `dailyReviews`, `focuses`, `weeklyMarks`, `dayMistakes`, and a `judgement` object on each trade (plan answer, label, mistake names); Go test `backend/tests/export_reviews_test.go` (scenario O: every record present, counts equal the screens, money still strings, the `000` fields unchanged); the Export button on Trades needs no change.
- [ ] T050 [P] Accessibility pass on S0 to S5 and the new dialogs, drawer and pickers in light and night: extend `frontend/e2e/zz-a11y.spec.ts` (axe WCAG 2 A and AA including 4.5:1 contrast) and add keyboard-only checks (stars with arrow keys, drawer and dialog focus and Escape, collapsible weeks, pickers); confirm no meaning is carried by colour alone.
- [ ] T051 [P] Scale and performance checks (SC-008): `backend/tests/scale_reviews_test.go` seeds 5,000 trades over 10 accounts and a year of reviews and times each read and write under 1 second; `frontend/e2e/zz-scale-reviews.spec.ts` times opening Reviews, changing the month, opening a day and a week, and saving a review and a judgement in the browser; report the numbers honestly.
- [ ] T052 [P] Finish `docs/domain.md` with every worked example used in the tests (the sample day, a week crossing two months, a 17:00 account) and keep every unconfirmed rule flagged; update `docs/decisions.md` with the date and reason of each decision made during the build (constitution VIII).
- [ ] T053 Keep the design documents in step: add the new components and the unchanged tokens to `DESIGN.md` only if a token is added; update `screens.md` and the Penpot frames for any state or text that changed during the build (principle V); record the wide-screen scale in the capture spec (`frontend/e2e/zz-screens.spec.ts`) and capture the 001 screens in light and night into `specs/001-journal-and-reflect/built/`.
- [ ] T054 Run every scenario of `quickstart.md` (A to R and the browser run) on the composed stack with `./scripts/test.sh` and record the results, including any failure, in `specs/001-journal-and-reflect/verification.md`.
- [ ] T055 Visual review (`/speckit-screens-review`): compare the built screens with `wireframes/` in a real browser, check both modes and the wide-screen scale, run the design critique and audit, save screenshots to `specs/001-journal-and-reflect/built/`, and record the owner's decision on the look.

- [ ] T056 [P] SC-003 check: Playwright `frontend/e2e/zz-process-beside-money.spec.ts` visits every screen that shows a money figure (Reviews rows, a daily review, the judge drawer result strip, the weekly review, the Trades list) in light and night on the sample data and asserts that each money figure has a plan figure beside it in the same row or card, and that every unavailable figure shows a dash with its reason (SC-004). Run it before T054.

## Dependencies and order

- Phase 1 then Phase 2 (T004 to T008 in order; T011 after T008; the rest of Phase 2 in parallel).
- US1 first (the MVP), then US2 (it adds the judgement columns the day figures already read, and ends `000`'s exception). US3 needs US2 (tags live in the drawer). US4 needs US1 (the cards). US5 needs US1 and, for its focus card, US4.
- Polish after the stories.

## Parallel examples

```text
After Phase 2:  US1 tests T017 T018 T019 T020 together, then T021 and T022, then T024 and T025 together.
Within US3:     T034 T035 T036 together, then T037 and T038, then T039.
Across stories: US3 (T034 to T040) and US4 (T041 to T044) after US2 is done.
```

## Implementation strategy

1. Phases 1 and 2, then **US1 alone**: the owner has a working daily review with a carried-forward focus. Stop and check it against the wireframes.
2. Add US2 (judging and the Plan column), then US3 and US4, then US5, checking each story on its own.
3. Phase 8, then the visual review and the converge step.

## Notes

- Every statistic is calculated in SQL by the functions of T007 and shown as the API sends it; nothing in the browser counts or does money arithmetic.
- The rules (valid loss, states, periods) live only in the migrations of T004 to T008; no other task re-implements them.
- A deviation from `screens.md` is either a defect (fix it) or a decision (ask the owner and update the wireframe in the same change).
- Commit after each task or small group, on the single branch `tradecraft_v2`; push nothing without the owner's say-so.
