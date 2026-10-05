# Wireframes: Journal and Reflect

**Feature**: `001-journal-and-reflect`
**Status**: signed-off 2026-10-03, signed off again 2026-10-04 (twice: after the v1 dependencies were removed, and after the requirements checklists). Greyscale wireframes: structure, wording, states and behaviour. The look is not part of this sign-off.
**Penpot**: file `Tradecraft_v2`, one page per screen (`S0 Reviews` to `S5 Weekly review`, plus a `Wireframe kit` page). Images exported to [wireframes/](wireframes/).
**Signed off**: 2026-10-03
**spec-sha256**: 0bee1f844680764b742bbb4eeeea73174562a3c8096d181dd12da3d18b73b9fd

All sample data is made up: account "Funded 50K", Wednesday 1 October 2025, NQ and ES trades.

## Why these screens

They serve every user story in `spec.md`: S1 and S2 serve stories 1 and 2, S3 serves story 3, S4 serves story 4, S5 serves story 5, and S0 is how the owner reaches any day or week. Logging and editing a trade (FR-001 and FR-002) is feature `000`'s trade form, built and approved; only the new judging fields (S2) are drawn here.

## Screen inventory

| ID | Screen | Serves | States drawn | Image |
|---|---|---|---|---|
| S0 | Reviews: one month at a time, with the month focus on top and collapsible weeks, per account | US1, FR-003 | opens on today (current month, current week open); stepped back to an older month; nothing to review yet | [opens on today](wireframes/s0-reviews-opens-on-today.png), [older month](wireframes/s0-reviews-stepped-back-to-an-older-month.png), [empty](wireframes/s0-reviews-nothing-to-review-yet.png) |
| S1 | Daily review (one account, one day) | US1, US2, US4, FR-003 to FR-012, FR-018 | filled (draft); empty day; nothing earlier to show; reviewed but trades changed; no week or month focus yet; day picker open | [filled](wireframes/s1-daily-review-filled-draft.png), [empty day](wireframes/s1-daily-review-empty-day.png), [nothing earlier](wireframes/s1-daily-review-nothing-earlier-to-show-top-of-screen.png), [trades changed](wireframes/s1-daily-review-reviewed-but-trades-changed-top-of-screen.png), [no focus](wireframes/s1-daily-review-no-week-or-month-focus-yet-top-of-screen.png), [day picker](wireframes/s1-daily-review-day-picker-open-top-of-screen.png) |
| S2 | Judge a trade (drawer opened from the Judge button) | US2, US3, FR-008, FR-009, FR-013 | a loss labelled mistake; a win flagged as a mistake | [loss](wireframes/s2-judge-a-trade-a-loss-labelled-mistake.png), [win](wireframes/s2-judge-a-trade-a-win-flagged-as-a-mistake.png) |
| S3 | Mistakes: counter, stop lines, list management | US3, FR-013 to FR-016 | counter this week; stop line editor (with an error); nothing tagged yet | [counter](wireframes/s3-mistakes-counter-this-week.png), [editor](wireframes/s3-mistakes-stop-line-editor.png), [empty](wireframes/s3-mistakes-nothing-tagged-yet.png) |
| S4 | Write a focus (week or month), a dialog | US4, FR-017, FR-018 | week; month; nothing written yet; too long | [week](wireframes/s4-set-a-focus-week.png), [month](wireframes/s4-set-a-focus-month.png), [empty](wireframes/s4-set-a-focus-nothing-written-yet.png), [too long](wireframes/s4-set-a-focus-too-long.png) |
| S5 | Weekly review (one account, one week) | US5, FR-019 to FR-021 | filled (draft); no focus yet (week and month); week picker open | [filled](wireframes/s5-weekly-review-filled-draft.png), [no focus](wireframes/s5-weekly-review-no-focus-yet-top-of-screen.png), [week picker](wireframes/s5-weekly-review-week-picker-open-top-of-screen.png) |

**How S4 is reached** (it is a dialog, not a page): the "Write one" or "Edit" button on the week and month lines of the focus card in S1; the same buttons on the focus card in S5 (week and month); the "Month focus" band under each month heading in S0 (Edit, or Write one when empty). The week's focus is reached by opening the week row, which opens S5.

## Flows

1. **Evening:** Reviews (S0) → Review this day → Daily review (S1) → Judge a trade (S2) for each trade → write the three answers and grades → Mark as reviewed.
2. **Morning:** Reviews (S0) → open today's day, or the next one: the top of the daily review (S1) shows yesterday's focus plus the week's and month's.
3. **Set the longer focus:** Daily review (S1) or weekly review (S5) focus card, or the month band in Reviews (S0) → Write one / Edit → Write a focus (S4).
4. **Look back:** Reviews (S0) → step months with the arrows, pick a month, press Today, or "Jump to date" → open a week to see its days → open the day. From any daily review (S1) the previous and next day buttons step one day, and the middle button opens a day picker that marks days with trades and days with a missing review.
5. **Watch a habit:** Mistakes (S3) → Stop line → editor.
6. **End of week:** Reviews (S0) → Open weekly review (S5) → open any day from it → Mark as reviewed. To plan ahead, step to next week (S5) and write its focus there.

## Content list

Every word the owner will read, as drawn. Money is shown in the account's currency.

### Navigation (all screens)

TRADECRAFT; Reviews, Trades, Mistakes, Accounts, Settings.

### S0 Reviews

| Element | Text |
|---|---|
| Title | Reviews |
| Subtitle | Every day and week, with what is still missing. |
| Account switcher | Account: Funded 50K |
| Filters | All, Missing 2, Draft 1, Reviewed 4 |
| Month navigation | < October 2025 v > (one month at a time; the name opens a month list) · Today · Jump to date |
| Month card (top, on its own) | This month (October) · Grade every trade, not just the day. · Edit (empty: No focus for this month yet. · Write one) · Shown on every daily and weekly review this month. |
| Week block (collapsible, newest first) | Week of 29 Sep to 5 Oct · This week · summary (1 of 3 days reviewed · 1 draft · 1 missing) · status Missing / Reviewed · Open weekly review. Open shows its days as rows; the current week is open, the others closed. A week is listed under the month it ends in. |
| Older months | < Earlier: September 2025 |
| Day row | Wed 1 Oct · 3 trades · +$45 · Plan followed 2 of 3 · 1 mistake · Draft · Open |
| Day row (missing) | Mon 29 Sep · 4 trades · +$120 · Plan followed 3 of 4 · 1 mistake · Missing · Review this day |
| Week row | Week of 29 Sep to 5 Oct · weekly review · Gathers the days once they are reviewed · Missing · Open weekly review |
| Footnote | Opens on the current month with the current week open. A week is listed under the month it ends in, so 29 Sep to 5 Oct is under October. Days with no trades are listed only after you open them. The money figure always has the plan figure beside it. |
| Empty state | Nothing to review yet for Funded 50K. / Log your first trade and its day appears here, ready to review. / Add a trade |

### S1 Daily review

| Element | Text |
|---|---|
| Title and subtitle | Daily review · Wednesday 1 October 2025 · Funded 50K |
| Status chips | Draft, Reviewed. After an edit to a reviewed review the line under the title reads: Reviewed Wed 1 Oct 18:40 · Edited Thu 2 Oct 09:10 |
| Day navigation | < Tue 30 Sep (previous day) · Wed 1 Oct v (opens a day picker) · Thu 2 Oct > (next day) |
| Day picker | < September 2025 > · Mo to Su · • has trades · ! review missing · Go to today |
| Focus card labels | Yesterday: Tue 30 Sep · This week (29 Sep to 5 Oct) · This month (October) · Edit |
| No week or month focus | This week (29 Sep to 5 Oct): No focus for this week yet. · Write one · This month (October): No focus for this month yet. · Write one |
| Nothing earlier | Yesterday: nothing to show / No earlier focus yet. What you write in the last box below will appear here tomorrow. |
| Numbers | Net result +$45 (Plan followed on 2 of 3 trades) · Plan followed 2 of 3 (1 not followed · 0 partly) · Mistakes 1 (Chased entry x1) · Valid losses 1 (of 2 losing trades) · Win rate 1 of 3 (1 winning trade of 3) |
| Trades table | Trades · Central Time. The result is the outcome; the judgement is what counts. · Time, Instrument, Side, Size, Result, Followed plan, Judgement, Mistakes · Not judged yet · Judge · Day total +$45 across 3 trades, 2 followed the plan. · Add a trade |
| Judgement chips | Mistake, Valid loss |
| Mistakes for the day | Mistakes for the whole day · Not tied to one trade. Same list as the mistakes on trades. Recorded once for the day. · Revenge mode · + Add a mistake |
| Questions | Your review · What did I do well today? · What could I improve on? · What will I focus on next session? · Write a sentence or two. · Your answer to the last question is shown at the top of your next review for Funded 50K. |
| Grades | Process grades for the day · Grade the decisions, not the result. · Mental · Technical · five stars each, with "4 of 5" or "Not graded" beside them · 1: drifted from the plan. 5: followed it fully. |
| Actions | Mark as reviewed · Save draft · Last saved 18:22 |
| Empty day | No trades on Wed 1 Oct for Funded 50K. / You can still write what you will focus on next session. Trades logged later appear here. / Add a trade |
| Changed after review | 2 trades changed after you marked this review as reviewed on Wed 1 Oct at 18:40. Check your answers still fit. They stay editable. |

### S2 Judge a trade

| Element | Text |
|---|---|
| Title | NQ Long x2 · Wed 1 Oct · 10:14 to 10:31 · Funded 50K · Close |
| Result strip | Result -$240 · Risk — (No stop recorded, so no risk figure.) · Plan Not followed (or Followed, Partly followed) |
| Plan question | Did you follow your plan? · Yes, Partly, No |
| Decision (losses only) | What was this decision? · Only for losing trades. · Valid loss: I followed my rules. No change needed. (unavailable, dashed, with "Not available: you answered that the plan was not followed." unless the plan answer is Yes) · Mistake: I broke my rules. Tag what I did wrong below. |
| Win flagged | This win was a mistake / It made money, but I was off plan. It will show as a profitable mistake, not a clean win. |
| Mistakes | Which mistakes? · Pick every one that applies. Each counts once in the Mistakes counter. · Chased entry, Moved stop, Oversized, Ignored checklist, Traded outside plan (checkboxes, shown once the decision is Mistake; a retired mistake already on the trade stays, marked Retired) · Nothing tagged yet. Labelled Mistake, not tagged: it adds nothing to the counter. · New mistakes are added on the Mistakes screen (Penpot frame shows a "See Mistakes" pill in its place) |
| Thesis | Why I took it (thesis) · read-only text · Written when you logged the trade. Shown here to read, not edit. |
| Actions | Save · Cancel · Edit trade in the trade form. |

### S3 Mistakes

| Element | Text |
|---|---|
| Title | Mistakes · How often each mistake showed up, and the line you set for each. Across all accounts. |
| Period and filter | Week, Month, 29 Sep to 5 Oct 2025, All accounts |
| Table | Mistake (with the accounts it was on, for example Funded 3 · Practice 1), This week, This month (each count with its split, for example 3 on trades · 1 on the day), Stop line, Status · Stop line (button) · Each record counts once, whether it was tagged on a trade or recorded for the whole day. |
| Statuses | STOP TRADING: 4 of 4 this week · 5 of 6 this month · 2 of 3 this month · Count only (no "near the line" status) |
| Stop line cells | 4 per week · 6 per month · 3 per month · none set |
| Manage | Manage the list · Retiring a mistake hides it from new tags; past trades keep it, so history and counts stay correct. · Add a mistake (e.g. Averaged down) · Add, Rename, Retire |
| Stop line editor | Stop line for Moved stop · When the count reaches this number, Moved stop shows STOP TRADING. It is advice. It does not block you. · Stop line · Counted per (week) · Stop line must be 1 or more. · Save, Cancel, Remove the stop line |
| Empty state | No mistakes tagged this week yet. / Tag them while you judge a trade in your daily review. They will be counted here, and you can set a stop line for any of them. / Go to the daily review |

### S4 Write a focus

| Element | Text |
|---|---|
| Title and tabs | Write a focus · Week, Month |
| Labels | Focus for the week of 29 Sep to 5 Oct · Focus for October 2025 |
| Field | One sentence you want to see every day this week. (greyed hint) · 43 of 280 characters · Up to 280 characters. |
| Too long | The counter reads, for example, "307 of 280 characters". ! Too long: 27 characters over. Shorten it to save. Save focus is unavailable (dashed). |
| Help | Shown at the top of every daily review this week, on all your accounts. |
| Actions | Save focus · Cancel · Clear this focus |

### S5 Weekly review

| Element | Text |
|---|---|
| Title | Weekly review · Week of 29 Sep to 5 Oct 2025 · Funded 50K |
| Week navigation | < Previous week · Week of 29 Sep to 5 Oct v (opens a week picker) · Next week > |
| Week picker | < September 2025 > · Mo to Su · Week column: Reviewed, Missing · Click any day, or a row, to open that week. Weekends count. · This week |
| Focus | This week (29 Sep to 5 Oct) · A+ setups only. Maximum three trades a day. · Edit · This month (October) · Grade every trade, not just the day. · Edit |
| No focus yet | No focus for this week yet. · No focus for this month yet. · Write one (each) |
| Days | The days · What you wrote each day. Days without a review are named, and their trades still count below. |
| Week status (title, top right) | Not reviewed (current week, or nothing marked yet) · Reviewed · Missing (the week has ended with no reviewed mark). No draft state. |
| Day statuses | Missing, Reviewed, Draft, No trades, Not yet. All seven days are listed; an empty Saturday or Sunday is one line. |
| Day cells | Did well · Could improve · Next focus · Mental 4 of 5 · Technical 4 of 5 · Open · Review this day |
| Missing day | No review for Mon 29 Sep. Its 4 trades (+$120, plan followed 3 of 4) are included in the totals below. |
| No trades / future | No trades on Thu 2 Oct. · This day has not happened yet. |
| Numbers | The week in numbers · Net result +$85 (Plan followed on 7 of 9 trades) · Plan followed 7 of 9 (2 not followed · 0 partly) · Mistakes 3 (Moved stop x2, Chased entry x1) · Valid losses 2 (of 4 losing trades) · Win rate 5 of 9 (56% of 9 trades) |
| Actions | Mark as reviewed · Weekly reviews save only this mark and its time. The focus is saved from its own dialog. |

## Content added after sign-off (not drawn)

Wording for states that were accepted as not drawn, and for new refusals, written at the plan stage (2026-10-04). They follow the structure of the signed-off screens. On 2026-10-04 the following were drawn in Penpot and exported to [wireframes/](wireframes/): S0 Reviews: today row, S0 Reviews: no account yet, S1 Daily review: trades not judged yet, S1 Daily review: day not happened yet, S3 Mistakes: rename a mistake, S3 Mistakes: rename, name already used, S3 Mistakes: retire a mistake. The Undo and failure notices are drawn once, on the trades list of feature 000, as before. All frames of S0 to S5 now carry the shared sidebar (TRADECRAFT; Reviews, Trades, Mistakes, Accounts, Settings).

| Where | Text |
|---|---|
| S3 Rename a mistake (dialog) | Rename mistake · Name · Save · Cancel · ! A mistake named Moved stop already exists. Names are not case sensitive. |
| S3 Retire a mistake | Retire Moved stop? · It stops appearing in new tags. Past trades keep it, so history and counts stay correct. · Retire · Cancel. After retiring: Mistake retired. · Undo (10 seconds). A retired mistake appears in the counter only when it has a count in the period, marked Retired. |
| S3 Add a mistake that was retired | The retired mistake comes back with its stop line; no extra message. |
| S1 Today row and today's review | In S0 the row for the current trading day reads Today instead of Missing or Draft; its review is the same as a Draft. |
| S1, S5 "How these are counted" line (FR-023) | A small line under the numbers strip: How these are counted: followed = answered Yes (Partly does not count) · win = net result above zero · mistakes = each tag and each whole-day record once · deleted trades never count. (drawn in Penpot 2026-10-04; S3 keeps its own footnote "Each record counts once …"; S0 keeps "The money figure always has the plan figure beside it.") |
| S0 Month list | The month name opens a list of the months that have trades or reviews for the account, plus the current month, newest first; choosing one opens it. |
| S1 Unjudged trades note | N trades are not judged yet. (under the title, when above zero; "1 trade is not judged yet." for one) |
| S1 Day not happened yet | ! This day has not happened yet. Mark as reviewed is unavailable. |
| S1 Plan line | Plan followed 1 of 3 (1 not followed · 0 partly · 1 not judged yet) |
| S1, S5 Plan answer change | If a valid-loss label is cleared because the plan answer changed or the trade is no longer a loss: the trade shows Not judged yet. |
| S1 Trades changed | 1 trade changed after you marked this review as reviewed on Wed 1 Oct at 18:40. (singular), N trades (plural) |
| S1 Leave | Leave without saving? / Your changes will be lost. / Keep editing · Leave (as on the trade form) |
| S4 Cleared | Focus cleared. · Undo (10 seconds). Too long, one over: ! Too long: 1 character over. Shorten it to save. |
| S4, S1, S2 Out of date | ! This review was changed elsewhere. Reload to see the latest version. · Reload (also "This focus", "This judgement", "This mistake") |
| S2 Valid loss unavailable, not a loss | Not available: this trade is not a loss. |
| S3 Stop line editor | Stop line is a whole number from 1 to 999. (error: Stop line must be 1 or more. / Stop line must be 999 or less.) |
| S0, S1, S5 No account | Create an account first. / Every review belongs to an account. / New account |
| Trades list (000 L1) | New column "Plan" beside Net result: Followed · Partly · Not followed · Not judged yet, with "Mistake" or "Valid loss" underneath when labelled. Footnote adds: The plan answer comes from the daily review. |

## Constitution check

- [x] Every money figure has process information beside it (S0 rows, S1 numbers and table, S2 result strip, S5 numbers)
- [x] Every figure that can be unavailable shows a dash and a reason (S2 risk "No stop recorded, so no risk figure.")
- [x] Greyscale only: no brand colour, brand font or colour-coded meaning (meaning is carried by words such as "STOP TRADING", "(x) Mistake"; selected and primary use a dark fill)
- [x] Every entry point has its empty state (S1 and S5 focus cards when no focus is written; S0 with nothing to review; the S4 dialog when nothing is written)
- [x] No placeholder text anywhere (sample data is made up and labelled as such; wording confirmed by the owner at sign-off)

## Reactions

| Date | Screen | Owner's reaction | What changed |
|---|---|---|---|
| 2026-10-02 | Look | Wireframes must not assume v1's look | Redrawn in greyscale; the look is decided later in the visual-direction step |
| 2026-10-02 | S0 | Cannot see how to look at older reviews; month label alone is not navigation | Month stepper, month list, jump to date and month grouping added; older-month state drawn |
| 2026-10-02 | S1 | The two buttons at the top right were confusing | Replaced with previous day, a middle button that opens a day picker, and next day; picker state drawn |
| 2026-10-02 | S4 | Could not see how to reach the dialog | Entry points named on the screens ("Write one" when empty, "Edit" when filled, "Write a focus" on S0); empty-focus states drawn for S1 and S5 (a missed state) |
| 2026-10-02 | S2 | Where are trade attachments? | Not in this feature; kept out on purpose (see spec non-goals) |
| 2026-10-03 | Clarify: weekly review | Chose option A | The weekly review stores only a reviewed mark and its time; everything else is a read-only roll-up (FR-021a) |
| 2026-10-03 | Clarify: Partly followed | Chose the recommendation | Partly is not counted as followed; the detail line shows it ("1 not followed · 0 partly") |
| 2026-10-03 | Clarify: Missing | Chose the recommendation | A day is Missing only after it has ended; today never is (FR-007a) |
| 2026-10-03 | Clarify: Near the line | No weird statuses; a count or a stop | No "near the line" status; colour may hint at proximity later, in the visual direction, never replacing the count |
| 2026-10-03 | Clarify: valid loss and plan | A loss cannot be valid if the plan was not followed | Valid loss is unavailable unless the plan answer is Yes; shown dashed with a reason on S2 |
| 2026-10-03 | Grades | Five stars better, for mental and technical | Stars with a "1: drifted, 5: followed fully" line; S5 shows "4 of 5" |
| 2026-10-03 | Win rate | Unsure; asked what the reference product does | It has no minimum, so none here; the win rate is a count ("1 of 3") |
| 2026-10-04 | Re-sign-off | Signed off after the v1 dependencies were removed from the spec | Hash and notes updated |
| 2026-10-04 | Analyze | How to show the definition of each statistic (FR-023); what the month list holds | Owner took the proposals: a "How these are counted" line under the numbers on S1 and S5, and a month list of the months with trades or reviews plus the current month; drawn in Penpot, no spec change |
| 2026-10-04 | Checklists | Mark as reviewed requires nothing; leaving unsaved asks first; Undo for clearing a focus and retiring a mistake; yes to the Plan column and the seven plan defaults | Spec, screens addendum and plan updated; signed off a third time |
| 2026-10-03 | Trade form | Yes to the suggested split | Thesis is written when logging; the rest of the judging stays in the review (S2 shows the thesis read-only). The trade form is not redrawn here; it is feature `000`'s, and the thesis field is already in it |
| 2026-10-03 | Habits and mistakes | They are the same thing | One shared list; day-level and trade-level records; the counter shows the split |
| 2026-10-03 | Reviewed state | No need to lock | Never locked; "Edited" time shown |
| 2026-10-03 | S0 | Redesign: defaults to now, collapsible weeks with days, month focus on top | Done; weeks that cross two months are listed under the month they end in; older months by arrows, picker, Today or jump to date (no endless scroll) |
| 2026-10-03 | S5 | The box for next week's focus is noise when you can step to that week | Removed; next week's focus is written on next week's review. Month focus added to the focus card (it matched S1) |
| 2026-10-03 | S5 | Prev and next week cannot reach a week far back | Middle button opens a week picker with a Reviewed or Missing mark per week |
| 2026-10-03 | S5 | Weekends | All seven days listed; an empty weekend day is one line; weekends selectable in both pickers |
| 2026-10-03 | S0 | A Write a focus button on S0 is pointless; entry should be through rows | Button removed; a Month focus band with Edit sits under each month heading, because there is no monthly review page yet |
| 2026-10-03 | Strategy on trades | Show read-only in S1 and S2? | Ignored for now (owner: asked only because forgotten); strategy builder and playbooks stay a later feature |
| 2026-10-02 | Account scope | Chose one review per account | Every screen carries an account switcher; S1 and S5 are per account; S3 counts across accounts with a per-account split |

## Open questions for clarify

None from the wireframes: the six questions were decided on 2026-10-03 (see Reactions). Clarify may still ask about the spec itself.

Known limits of this wireframe set: the trade form (Log or Edit trade) is feature `000`'s and is not redrawn; the thesis field is already in it. The S2 link was corrected on 2026-10-04 to "Edit trade in the trade form." (a trade has one entry and one exit). The stop-line editor is shown but the retire and rename dialogs on S3 are not drawn. The state for today (trades logged, nothing saved yet, listed as today and not as Missing) is not drawn separately; it uses the same row as a Draft without the tag.

## Sign-off

- **Signed off by**: owner
- **Date**: 2026-10-04 (first signed off 2026-10-03; third sign-off after the checklists)
- **Spec hash**: 0bee1f844680764b742bbb4eeeea73174562a3c8096d181dd12da3d18b73b9fd
- **Notes**: Third sign-off 2026-10-04, after the requirements checklists changed the spec (definitions, the owner's three decisions, FR-027 to FR-030, SC-008); the wording of states that were not drawn is in the section Content added after sign-off, and those states were drawn in Penpot on 2026-10-04. Earlier: re-signed after the spec stopped depending on Tradecraft v1 (accounts and trades come from feature `000`; no open trades; local use only, no sign-in or audit log yet; one entry and one exit per trade). The S2 link text ("Edit trade in the trade form.") was corrected in Penpot on 2026-10-04. Accepted exceptions at sign-off, since resolved: (1) the trade form is feature `000`'s and already has the thesis field; (2) the rename and retire dialogs for mistakes were drawn on 2026-10-04; (3) export stays on the existing Export button of the Trades screen (plan default approved 2026-10-04); (4) the Today row was drawn on 2026-10-04.

## Differences found while building (2026-10-05)

Wording and small structure that changed from the signed-off frames during the build. The structure of each screen is as signed
off; these are the exceptions, recorded here so the frames and the screens stay in step (principle V). The S2 frames were
updated in Penpot and re-exported; the others are small enough that the drawn frame still shows the right structure.

| Screen | Built as | Drawn as |
|---|---|---|
| S2 tags | "Which mistakes?" checkboxes, only once the decision is Mistake; no "+ New mistake" in the drawer | "Mistakes on this trade" chips with "+ New mistake" (frame now reads Which mistakes? with a "See Mistakes" pill) |
| S1 whole-day mistakes | A "Mistakes for the whole day" card: recorded ones as chips with a remove button, a chooser and "+ Add a mistake"; saved at once, apart from the review | Chips and "+ Add a mistake" (the same, saved with its own card) |
| S3 table | Rows are the mistakes with a count in the viewed period or a stop line; the heads read "This week"/"This month" for the current period and "Week"/"Month" for another one; each row has a "Stop line" button | Heads This week, This month |
| S3 list | "Manage the list" lists every mistake in use with Stop line, Rename and Retire; a retired mistake in the counter carries a "Retired" chip | Add, Rename, Retire |
| S3 empty state | "No mistakes tagged this week yet." for the current period, "No mistakes tagged in this week." (or month) for another | No mistakes tagged this week yet. |
| S4 from Reviews | The month card opens the dialog with the Month tab only (no tabs) | Tabs Week and Month |
| S4 focus dialog | Leaving with changes asks "Leave without saving?"; Clear this focus shows "Focus cleared." with Undo for 10 seconds | (as written in the table above) |
| S5 mark | After marking, the button is replaced by "Reviewed <Wed 1 Oct 18:40>" and the helper line stays; a week that has not started shows the button unavailable with "This week has not started yet." | Mark as reviewed |
| S5 days | A day with a review shows its answers in two columns; a day with nothing is one line with its status chip | Day cells |
| Reviews week row | "Open weekly review" is a separate link on the row, outside the collapsible summary (keyboard and screen reader order) | Button on the row |

## Visual review

**Date**: 2026-10-05. **Approved by the owner**: yes, the look of feature 001 as built (choice "Approve").

- **Screenshots**: `built/` holds every state of S0 to S5 in light and night at 1440 x 900, and in light and night on a 2560 x 1440 window
  (`-wide`), 80 images, captured by `frontend/e2e/zz-screens-reviews.spec.ts` on a fresh stack.
- **Compared with the wireframes**: structure, content, wording and states match, apart from the differences recorded above under
  "Differences found while building". The S2 frames were updated in Penpot to the built wording; the other differences are small and were
  recorded here only.
- **Checks run**: axe WCAG 2 A and AA (4.5:1 contrast) in light and night on every screen and dialog; keyboard-only checks; the impeccable design
  detector (no findings); a design critique run by one reviewer in one context, not by two isolated agents as the critique command asks, because
  this session was not allowed to start sub-agents; the process-beside-money check (SC-003, SC-004); timings (SC-008).
- **Fixed during the review**: "Open weekly review" moved out of the collapsible summary (a control inside a control); focus returns to the
  button after a drawer or dialog closes; row actions underlined so they read as actions; "no trades" instead of "0 trades · Plan followed 0
  of 0" on an empty day of the weekly review; "No days to review yet" instead of "0 of 0 days reviewed"; "is included" for one trade; the status
  chip lines up with the account chooser.
- **Parked**: the lines "No trades on Thu 2 Oct." repeat the "No trades" chip (signed-off wording); empty future weeks on Reviews take a full
  card each; the wider design and feel changes the owner asked to deal with after 001 (nothing started).
- **Not exercised**: no phone layout (out of scope); the wide-screen scale is judged by eye only.
