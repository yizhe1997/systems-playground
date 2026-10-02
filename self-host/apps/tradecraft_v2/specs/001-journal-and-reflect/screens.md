# Wireframes: Journal and Reflect

**Feature**: `001-journal-and-reflect`
**Status**: draft, **wireframes to be redrawn**. The first draft was styled with Tradecraft v1's look by mistake (constitution 1.1.0 forbids this). The styled images are kept as `screens-superseded-styled/` for their content and layout ideas only. The inventory, wording and open questions below stay as the starting point; the Penpot pages must be redrawn in greyscale.
**Penpot**: file `Tradecraft_v2`, one page per screen (`S0 Reviews` to `S5 Weekly review`); the current frames are styled and are to be replaced
**Signed off**: not yet
**spec-sha256**: (filled in at sign-off)

All sample data is made up: account "Funded 50K", Wednesday 1 October 2026, NQ and ES trades.

## Why these screens

They serve every user story in `spec.md`: S1 and S2 serve stories 1 and 2, S3 serves story 3, S4 serves story 4, S5 serves story 5, and S0 is how the owner reaches any day or week. Logging a trade (FR-001 and FR-002) reuses the existing trade form from Tradecraft v1; only the new judging fields (S2) are drawn here.

## Screen inventory

| ID | Screen | Serves | States drawn | Image |
|---|---|---|---|---|
| S0 | Reviews: list of days and weeks, per account | US1, FR-003 | list; nothing to review yet | [S0](screens-superseded-styled/S0-reviews-list.png) |
| S1 | Daily review (one account, one day) | US1, US2, US4, FR-003 to FR-012, FR-018 | filled (draft); empty day; nothing earlier to show; reviewed but trades changed | [filled](screens-superseded-styled/S1-daily-review-filled.png), [empty day](screens-superseded-styled/S1-daily-review-empty-day.png), [nothing earlier](screens-superseded-styled/S1-daily-review-nothing-earlier.png), [trades changed](screens-superseded-styled/S1-daily-review-reviewed-trades-changed.png) |
| S2 | Judge a trade (drawer opened from the Judge button) | US2, US3, FR-008, FR-009, FR-013 | a loss labelled mistake; a win flagged as a mistake | [loss](screens-superseded-styled/S2-judge-a-loss.png), [win](screens-superseded-styled/S2-judge-a-win.png) |
| S3 | Mistakes: counter, stop lines, list management | US3, FR-013 to FR-016 | counter this week; stop line editor (with an error); nothing tagged yet | [counter](screens-superseded-styled/S3-mistakes-counter.png), [editor](screens-superseded-styled/S3-stop-line-editor.png) |
| S4 | Write a focus (week or month) | US4, FR-017, FR-018 | week; month; nothing written yet | [week](screens-superseded-styled/S4-set-a-focus.png) |
| S5 | Weekly review (one account, one week) | US5, FR-019 to FR-021 | filled (draft) | [S5](screens-superseded-styled/S5-weekly-review.png) |

## Flows

1. **Evening:** Reviews (S0) → Review this day → Daily review (S1) → Judge a trade (S2) for each trade → write the three answers and grades → Mark as reviewed.
2. **Morning:** Reviews (S0) → open today's day, or the next one: the top of the daily review (S1) shows yesterday's focus plus the week's and month's.
3. **Set the longer focus:** Daily review (S1) → Edit next to the week or month → Write a focus (S4).
4. **Watch a habit:** Mistakes (S3) → Stop line → editor.
5. **End of week:** Reviews (S0) → Open weekly review (S5) → open any day from it → write next week's focus → Mark as reviewed.

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
| Month heading | October 2026 |
| Day row | Wed 1 Oct · 3 trades · +$45 · Plan followed 2 of 3 · 1 mistake · Draft · Open |
| Day row (missing) | Mon 29 Sep · 4 trades · +$120 · Plan followed 3 of 4 · 1 mistake · Missing · Review this day |
| Week row | Week of 29 Sep to 5 Oct · weekly review · Gathers Mon to Fri once the days are reviewed · Missing · Open weekly review |
| Footnote | Days with no trades are listed only after you open them. The money figure always has the plan figure beside it. |
| Empty state | Nothing to review yet for Funded 50K. / Log your first trade and its day appears here, ready to review. / Add a trade |

### S1 Daily review

| Element | Text |
|---|---|
| Title and subtitle | Daily review · Wednesday 1 October 2026 · Funded 50K |
| Status chips | Draft, Reviewed |
| Day navigation | Tue 30 Sep, Thu 2 Oct |
| Focus card labels | Yesterday: Tue 30 Sep · This week (29 Sep to 5 Oct) · This month (October) · Edit |
| Nothing earlier | Yesterday: nothing to show / No earlier focus yet. What you write in the last box below will appear here tomorrow. |
| Numbers | Net result +$45 (Plan followed on 2 of 3 trades) · Plan followed 2 of 3 (1 trade off plan) · Mistakes 1 (Chased entry x1) · Valid losses 1 (of 2 losing trades) · Win rate — (Needs 5 trades; you have 3) |
| Trades table | Trades · Central Time. The result is the outcome; the judgement is what counts. · Time, Instrument, Side, Size, Result, Followed plan, Judgement, Mistakes · Not judged yet · Judge · Day total +$45 across 3 trades, 2 followed the plan. · Add a trade |
| Judgement chips | Mistake, Valid loss |
| Habits | Habits that were not tied to one trade · Recorded once for the day. · Revenge mode · + Add a habit |
| Questions | Your review · What did I do well today? · What could I improve on? · What will I focus on next session? · Write a sentence or two. · Your answer to the last question is shown at the top of your next review for Funded 50K. |
| Grades | Process grades for the day · Grade the decisions, not the result. · Mental · Technical · A, B, C · A: followed the plan. B: mostly. C: drifted. |
| Actions | Mark as reviewed · Save draft · Last saved 18:22 |
| Empty day | No trades on Wed 1 Oct for Funded 50K. / You can still write what you will focus on next session. Trades logged later appear here. / Add a trade |
| Changed after review | 2 trades changed after you marked this review as reviewed on Wed 1 Oct at 18:40. Check your answers still fit, then mark it reviewed again. |

### S2 Judge a trade

| Element | Text |
|---|---|
| Title | NQ Long x2 · Wed 1 Oct · 10:14 to 10:31 · Funded 50K · Close |
| Result strip | Result -$240 · Risk — (No stop recorded, so no risk figure.) · Plan Not followed (or Followed, Partly followed) |
| Plan question | Did you follow your plan? · Yes, Partly, No |
| Decision (losses only) | What was this decision? · Only for losing trades. · Valid loss: I followed my rules. No change needed. · Mistake: I broke my rules. Tag what I did wrong below. |
| Win flagged | This win was a mistake / It made money, but I was off plan. It will show as a profitable mistake, not a clean win. |
| Mistakes | Mistakes on this trade · Chased entry, Moved stop, Oversized, Ignored checklist, Traded outside plan, + New mistake |
| Thesis | Why I took it (thesis) |
| Actions | Save · Cancel · Edit stop, entries and costs in the trade form. |

### S3 Mistakes

| Element | Text |
|---|---|
| Title | Mistakes · How often each habit showed up, and the line you set for each. Across all accounts. |
| Period and filter | Week, Month, 29 Sep to 5 Oct 2026, All accounts |
| Table | Mistake, This week, This month, Stop line, Status, By account · Stop line (button) |
| Statuses | STOP TRADING: 4 of 4 this week · Near the line: 5 of 6 this month · 2 of 3 this month · Count only |
| Stop line cells | 4 per week · 6 per month · 3 per month · none set |
| Manage | Manage the list · Retiring a mistake hides it from new tags; past trades keep it, so history and counts stay correct. · Add a mistake (e.g. Averaged down) · Add, Rename, Retire |
| Stop line editor | Stop line for Moved stop · When the count reaches this number, Moved stop shows STOP TRADING. It is advice. It does not block you. · Stop line · Counted per (week) · Stop line must be 1 or more. · Save, Cancel, Remove the stop line |
| Empty state | No mistakes tagged this week yet. / Tag them while you judge a trade in your daily review. They will be counted here, and you can set a stop line for any of them. / Go to the daily review |

### S4 Write a focus

| Element | Text |
|---|---|
| Title and tabs | Write a focus · Week, Month |
| Labels | Focus for the week of 29 Sep to 5 Oct · Focus for October 2026 |
| Field | One sentence you want to see every day this week. (placeholder) · 43 of 280 characters · Up to 280 characters. |
| Help | Shown at the top of every daily review this week, on all your accounts. |
| Actions | Save focus · Cancel · Clear this focus |

### S5 Weekly review

| Element | Text |
|---|---|
| Title | Weekly review · Week of 29 Sep to 5 Oct 2026 · Funded 50K · Previous week, Next week |
| Focus | Focus for this week · Shown on every daily review this week. · Edit |
| Days | The days · What you wrote each day. Days without a review are named, and their trades still count below. |
| Day statuses | Missing, Reviewed, Draft, No trades, Not yet |
| Day cells | Did well · Could improve · Next focus · Mental B · Technical B · Open · Review this day |
| Missing day | No review for Mon 29 Sep. Its 4 trades (+$120, plan followed 3 of 4) are included in the totals below. |
| No trades / future | No trades on Thu 2 Oct. · This day has not happened yet. |
| Numbers | The week in numbers · Net result +$85 (Plan followed on 7 of 9 trades) · Plan followed 7 of 9 (2 trades off plan) · Mistakes 3 (Moved stop x2, Chased entry x1) · Valid losses 2 (of 4 losing trades) · Win rate 5 of 9 (56% of 9 trades) |
| Next week | Focus for next week · Week of 6 Oct to 12 Oct. Shown on every daily review next week, on all your accounts. |
| Actions | Mark as reviewed · Save draft |

## Constitution check

- [x] Every money figure has process information beside it (S0 rows, S1 numbers and table, S2 result strip, S5 numbers)
- [x] Every figure that can be unavailable shows a dash and a reason (S1 win rate "Needs 5 trades; you have 3", S2 risk "No stop recorded, so no risk figure.")
- [ ] Greyscale only: no brand colour, brand font or colour-coded meaning (the styled draft used colour for meaning; the redraw must use text labels instead)
- [ ] No placeholder text anywhere (the rough draft still has sample data; owner to confirm wording at sign-off)

## Reactions

| Date | Screen | Owner's reaction | What changed |
|---|---|---|---|
| 2026-10-02 | Account scope | Chose one review per account | Every screen carries an account switcher; S1 and S5 are per account; S3 counts across accounts with a per-account split |

## Open questions for clarify

1. **Weekend and holiday days:** the weekly review lists Monday to Friday and shows "No trades" or "Not yet". Should Saturday and Sunday appear when there are no trades, or stay hidden?
2. **Grades:** A, B and C for both mental and technical, with the meaning "followed the plan / mostly / drifted". Is a three-step scale right, or would you rather use 1 to 5 stars?
3. **Win rate:** shown as a dash with "Needs 5 trades" under that threshold. Is five the right minimum, or should a win rate not appear on a daily review at all?
4. **Where "Add a trade" goes:** it opens the existing v1 trade form. Should the form gain the judging fields (S2) too, so a trade can be judged as it is logged?
5. **Habits not tied to a trade (S1):** drawn as chips ("Revenge mode"). Should these share the same list as trade mistakes (S3 shows them together) or have their own?
6. **Reviewed state:** after "Mark as reviewed" the answers stay editable. Should a reviewed review lock until you press Reopen?

## Sign-off

- **Signed off by**: owner
- **Date**:
- **Spec hash**:
- **Notes**:
