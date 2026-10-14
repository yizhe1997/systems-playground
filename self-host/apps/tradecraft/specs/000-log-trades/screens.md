# Wireframes: Log Trades

**Feature**: `000-log-trades`
**Status**: signed-off 2026-10-04 (again, after the requirements checklist review). Greyscale wireframes: structure, wording, states and behaviour. The look is not part of this sign-off.
**Penpot**: file `Tradecraft_v2`, pages `L1 Trades list`, `L2 Log a trade`, `L3 Accounts`, `L4 Account dialog`, `L5 Settings` (L for log-trades, so they do not clash with the 001 pages). Images in the Penpot frames.
**Signed off**: 2026-10-04 (structure and wording only; the look is decided elsewhere)
**spec-sha256**: e7fad36a909ebe36f735228fd9a50c455da2fa3794d4b80d752dcc47dac8a5ad

All sample data is made up: accounts "Funded 50K", "Practice" and "Swing EUR", Wednesday 1 October 2025, NQ and ES trades.

## Why these screens

They serve every user story in `spec.md`: L1 serves stories 2 and 3 (see and correct trades), L2 serves stories 1, 3, 4 and 5 (log, edit, typed result, trading day), L3 and L4 serve stories 1 and 6 (accounts), and L5 holds the time zone (FR-014).

## Screen inventory

| ID | Screen | Serves | States drawn | Image |
|---|---|---|---|---|
| L1 | Trades list (the home screen) | US1, US2, US3, FR-004, FR-015 to FR-019, FR-023 | filled; no accounts yet; no trades at all; filters match nothing; showing deleted; could not load; trade deleted (undo) | filled, no accounts, none at all, no match, deleted, could not load, undo |
| L2 | Log or edit a trade | US1, US3, US4, US5, FR-005 to FR-012, FR-020 to FR-023 | new; filled with the result computed; dollars per point blank (typed result); validation errors; edit; could not save; changed elsewhere; leave without saving | new, filled, typed result, errors, edit, could not save, changed elsewhere, leave |
| L3 | Accounts list | US1, US6, FR-003, FR-004, FR-004a | list; showing archived; none yet | list, archived, none yet |
| L4 | Account dialog (new or edit) | US1, US5, US6, FR-001 to FR-004a | new; edit; name already used; start time 00:00 refused | new, edit, name used, 00:00 |
| L5 | Settings (time zone) | US5, FR-014 | time zone | time zone |

## Flows

1. **First run:** open the app, see Trades saying "Create an account first", press New account (L4), save, return to Trades, press Log a trade (L2), save the trade, land on Trades (L1).
2. **Log a trade:** Trades (L1) → Log a trade (L2) → fill the Basic fields, watch the Result preview → Save trade → back on Trades.
3. **Find a trade:** Trades (L1) → choose an account and a date range → read the list.
4. **Correct a trade:** Trades (L1) → Edit → change a field → Save changes; or Delete.
5. **Restore a trade:** Trades (L1) → switch on Show deleted → Restore.
6. **Set up the trading day:** Accounts (L3) → Edit (L4) → set the trading-day start; Settings (L5) → time zone.
6a. **Retire an account:** Accounts (L3) → Archive; Show archived → Restore.
7. **Export:** Trades (L1) → Export.

## Content list

Every word the owner will read, as drawn. Money is shown in the account's currency.

### Navigation (all screens)

TRADECRAFT; Reviews, Trades, Mistakes, Accounts, Settings (the same sidebar on every screen of features 000 and 001; Reviews and Mistakes belong to feature 001; changed 2026-10-04).

### L1 Trades list

| Element | Text |
|---|---|
| Title and subtitle | Trades · Your closed trades, newest first. |
| Actions | Log a trade · Export |
| Filters | Account (All accounts) · Date range (1 Oct 2025 – 31 Oct 2025; one button that opens a two-month calendar in a popover: click the first day, then the last, or the same day twice for one day; This month and All dates below the calendar) · Clear filters · Show deleted (switch) |
| Columns | Exit time · Trading day · Account · Instrument · Direction · Size · Net result · **Plan** · R · Edit · Delete. The Plan column (added 2026-10-04 by feature 001, FR-027, owner approved; it ends the principle I exception) shows Followed, Partly, Not followed or Not judged yet, with Mistake or Valid loss underneath when the trade is labelled so. The trading day can differ from the exit date when the account has a start time (a Tue 17:30 exit with a 17:00 start is on Wed). |
| Result cell | -$125.00; a typed result adds "typed in" underneath |
| R cell | -0.50 R, or a dash with a reason underneath: "no stop recorded", "no dollars per point" |
| Footnote | Each result is in its own account's currency. This list has no totals. The plan answer comes from the daily review. |
| Could not load | ! Could not reach the journal. · Try again (drawn on L1; every screen uses the same notice) |
| Trade deleted | Trade deleted. · Undo (for 10 seconds; Show deleted keeps it restorable afterwards) |
| No accounts yet | Create an account first. / Every trade belongs to an account. Log a trade is available as soon as you have one. / New account · Log a trade is unavailable until an account exists |
| No trades at all | No trades yet. / Log your first trade and it appears here. / Log a trade |
| Filters match nothing | No trades for these filters. / Try another account or a wider date range. / Clear filters |
| Showing deleted | Showing deleted trades. They are hidden everywhere else until restored. · rows tagged Deleted with a Restore button |

### L2 Log or edit a trade

| Element | Text |
|---|---|
| Title | Log a trade, or Edit trade with "NQ Long x2 · Wed 1 Oct 2025 · Funded 50K" |
| Back | < Trades |
| Basic fields | Account · Instrument · Direction (Long, Short) · Size · Entry price · Entry time (Central Time) · Exit price · Exit time (Central Time) · Dollars per point (optional) · Costs (total) · Stop price (optional) |
| Placeholders | Choose an account · e.g. NQ · 1 · 0.00 · Date and time · e.g. 20 · 0.00 · e.g. 21440.00 |
| Typed result | Result after costs (required) · Needed while dollars per point is blank. · dollars per point shows "Leave blank to type the result" |
| Details | Details (collapsible) · Why I took it (thesis, optional) |
| Preview | Result preview · Gross result (+$100.00, with its formula underneath) · Costs · Net result · Risk · R (net result over risk) · Trading day (Wed 1 Oct 2025, "exit read in Central Time; Funded 50K has no trading-day start") · All money is exact. Nothing is rounded until it is shown. |
| Preview, typed result | Gross result: dash, "needs dollars per point" · Costs: not used, "a typed result is already after costs" · Net result: -$120.00, "typed in" · Risk and R: dash, "needs dollars per point" · Add dollars per point and the result is computed instead. |
| Preview, new | dashes with "needs prices, size and dollars per point", "needs a stop and dollars per point", "needs a net result and a risk", "needs an exit time" |
| Errors | 3 things to fix before this trade can be saved. · ! Instrument is required. · ! Size must be above zero. · ! Exit must not be earlier than the entry. · Fix the fields marked with a !. |
| Saving problems | ! Could not reach the journal. Nothing was saved. What you typed is still here. · Try again |
| Changed elsewhere | ! This trade was changed elsewhere. Reload to see the latest version. · Reload |
| Leave prompt | Leave without saving? / Your changes will be lost. / Keep editing · Leave |
| Numbers | ! Enter a number with a point for decimals, for example 21450.25. · ! At most 8 decimal places. · prices, size and dollars per point must be above zero |
| Time messages | ! That time does not exist on that date in this time zone. · Times are typed to the minute and shown on a 24-hour clock |
| More error messages | ! Times cannot be in the future. · ! Entry price and exit price are required. · ! Result is required while dollars per point is blank. · ! Dollars per point must be above zero. · ! Costs cannot be negative. · ! Choose an account. |
| Actions | Save trade, or Save changes · Cancel · Delete trade (edit only) · Last saved Wed 1 Oct 10:05 |

### L3 Accounts

| Element | Text |
|---|---|
| Title and subtitle | Accounts · Where your trades happen. |
| Actions | New account · Show archived (switch) |
| Columns | Name · Currency · Trading-day start · Edit · Archive |
| Archived view | rows tagged Archived with a Restore button · Archived accounts keep all their trades. Restore one to use it again. |
| Footnote | A trade that exits at or after the start time counts to the next day. With no start time, a trade counts to the calendar date of its exit. |
| None yet | No accounts yet. / Create an account to start logging trades. / New account |

### L4 Account dialog

| Element | Text |
|---|---|
| Titles | New account · Edit account |
| Fields | Name (e.g. Funded 50K) · Currency (USD) · Trading-day start (optional, e.g. 17:00) |
| Help | Leave the start empty to use the calendar date of each exit. Example: with 17:00, a trade that exits at 17:30 counts to the next day. |
| Edit notices | Changing the start time moves this account's trades to the right trading days. · Changing the currency only changes the label. Existing results are not converted. |
| Error | ! An account named Funded 50K already exists. Names are not case sensitive. |
| Start time error | ! Start time cannot be 00:00. Leave it empty to use the calendar date of each exit. |
| Other messages | Account archived. · Undo (10 seconds) · This account was changed elsewhere. Reload to see the latest version. |
| Actions | Save account · Cancel · Archive account (edit only) |

### L5 Settings

| Element | Text |
|---|---|
| Title and subtitle | Settings · Applies to the whole journal. |
| Time zone | Time zone (type to search any standard time zone) · Times you enter and see, and the trading day, are read in this zone. Changing it never moves a trade in time. · Central Time (America/Chicago) · Current time in this zone: Wed 1 Oct 2025 10:42 · Save |

## Constitution check

- [x] Every money figure has process information beside it (principle I). **Not met, accepted as a written exception by the owner on 2026-10-04, expiring when `001` is built:** plan adherence and mistakes arrive with `001`. This list shows R beside each result and has no totals. Needs the owner's decision (see open questions).
- [x] Every figure that can be unavailable shows a dash and a reason (L1 R cell, L2 preview)
- [x] No placeholder text anywhere (sample data is made up and labelled as such; wording confirmed by the owner at sign-off)
- [x] Greyscale only: no brand colour, brand font or colour-coded meaning (meaning is carried by words and a dark fill for selected and primary)

## Reactions

| Date | Screen | Owner's reaction | What changed |
|---|---|---|---|
| 2026-10-03 | All | Wants to see the screens drawn before reacting | Screens drawn as proposed |
| 2026-10-04 | All | Looks good enough for now | Proceeded to clarify |
| 2026-10-04 | Sign-off check | FR-004 (no trade without an account) had no screen | Added the trades list state "no accounts yet" and the missing error messages to the content list |
| 2026-10-04 | Re-sign-off | Signed off again after the checklist fixes | Hash and notes updated |
| 2026-10-04 | Re-sign-off | Signed off again after the checklist fixes | Hash and notes updated |
| 2026-10-04 | Requirements checklists | Asked to fix all the gaps in the spec | 48 findings resolved in the spec, data model, contract and tasks; screens gained a Trading day column and six new states (could not load, trade deleted undo, could not save, changed elsewhere, leave without saving, start time 00:00) and a time zone search hint |
| 2026-10-04 | Clarify: time zone | Chose the recommendation | One time zone for the whole journal; Settings holds it (as drawn) |
| 2026-10-04 | Clarify: typed result | Chose the recommendation | A typed result is after costs; the costs field is "not used" (as drawn) |
| 2026-10-04 | Clarify: retiring an account | Chose the recommendation (archive only) | Archive and Restore on the accounts list, Show archived switch, Archive account in the edit dialog |
| 2026-10-04 | Clarify: currency change | Allow it, "after all it's just a label" | Edit dialog warns that existing results are relabelled, not converted |
| 2026-10-04 | Clarify: R | Chose the recommendation | R is net result over risk (as drawn) |
| 2026-10-04 | Feature 001 plan | Yes to the Plan column on the Trades list and to the shared sidebar | L1 gains a Plan column and footnote sentence; every L screen shows the sidebar Reviews, Trades, Mistakes, Accounts, Settings under the brand TRADECRAFT; Penpot frames, Hex skins and wireframe images updated the same day |
| 2026-10-14 | L1, L3, L5 and the sidebar: list polish | Do it: row actions in a kebab menu (L1 Edit and Delete, L3 Edit and Archive), columns that can be dragged into any order, 10 rows per page with Rows per page of 10, 25, 50, 100, a sidebar that stays the height of the window and is grouped (Journal, Manage), and Settings split into General, Access and Integrations pages | Built and recorded in `docs/decisions.md` (2026-10-14). L5 is now the General page (time zone only). The sidebar of every wireframe frame is redrawn (see feature 002). The row actions as a kebab menu are drawn on B2 (which supersedes L3); the superseded L1 and L3 frames keep Edit and Delete as words, and the Rows per page control is not drawn. They are redrawn in the owner's visual pass before the first live deployment |

## Open questions for clarify

None. The six points from the spec were decided on 2026-10-04 (see Reactions and the spec's Clarifications), and three defaults were applied without asking: no duplicate-trade warning, the only active account is preselected when logging a trade, and R is shown with two decimals.

Left for the sign-off step: the principle I exception (process information beside money figures cannot be met until `001`; a written exception that ends when `001` is built).

## Sign-off

- **Signed off by**: owner
- **Date**: 2026-10-04
- **Spec hash**: e7fad36a909ebe36f735228fd9a50c455da2fa3794d4b80d752dcc47dac8a5ad
- **Notes**: Re-signed after the checklist review changed the spec. Two written exceptions kept: principle I (ends when 001 is accepted) and principle IV, no sign-in or audit log, local use only (ends when those features are accepted, and before any exposure). Accepted gaps: the failure and Undo notices are drawn once, on the trades list.

## Visual review

**Status**: findings recorded 2026-10-04. The owner chose "approve, fix 1 and 4 first"; both were fixed the same day (below); the owner then approved the look.
**Built screens** (not stored in the repository; regenerate with `zz-screens`): 23 states in light and night, named like their wireframes (`-light.png`, `-dark.png`), captured in real Chromium on the composed stack with sample data (`frontend/e2e/zz-screens.spec.ts`). "Could not load" was captured with the API container really stopped; "could not save" and "changed elsewhere" by simulating the failure in the browser.
**Checks run**: comparison with each wireframe and with the approved Hex skins; axe (WCAG 2 A and AA, including 4.5:1 text contrast) on five screens and their states in both modes, no violations; Impeccable detector on `frontend/src`, no findings; the Impeccable critique, run inline in one context (⚠️ DEGRADED: single-context, because this session does not spawn sub-agents), so its heuristic scoring is lighter than a full run.

**Matches the wireframes**: structure, wording, every state and behaviour on L1 to L5 (empty, filled, error, deleted, undo, leave prompt, conflict, typed result, name already used, start 00:00). Dashes always carry a reason; the list shows no totals.

**Differences, for the owner to decide**

| # | Difference | Kind | Proposal |
|---|---|---|---|
| 1 | The two time fields use the browser's date format (10/01/2025) plus a separate 24-hour HH:MM box; the wireframe shows one field reading "Wed 1 Oct 2025 09:41". The filter dates also use the browser format. | Decision | Keep (picker, accessible, cheap) or build one typed field that reads and shows the spec's style |
| 2 | In the edit form, numbers come back without trailing zeros (4.6, 21452.5) where the wireframe shows 4.60 and 21452.50. Trailing zeros carry no meaning (spec), but it reads less tidy. | Decision | Keep, or show prices to the instrument's usual decimals (needs a decision on what that is) |
| 3 | The Result preview tints only the net result; the approved skin image tinted the gross result too. | Decision | Keep the written rule (Quiet Outcome Rule) unless you say otherwise |
| 4 | The whole unfiltered list of 5,000 trades opens in about 3.9 s (a month opens in 0.4 s). | Decision | Accept, or add paging (a change to the signed-off list screen) |
| 5 | In the deleted view the "Deleted" tag sits beside the instrument, not in its own column. | Minor | Keep |
| 6 | When the journal cannot be reached, Log a trade is shown disabled and Export is hidden. | Minor | Keep |

**Critique, in short.** Strengths: the screens read as the quiet notebook that `DESIGN.md` describes, with a single ink, thin rules, and colour only on the net-result text; the preview is the clearest part (formula under each figure, dash plus reason otherwise); every error is written out with "!" and never carried by colour. Weaker: the most-used input (time) is the least polished (item 1); rows with a two-line cell are slightly taller than 48 px, so the list rhythm is a little uneven; the page has no phone layout (not a goal) and below 1100 px the table scrolls sideways.

**Fixed during the review**: the month abbreviation read "Sept" (now "Sep" as in the wireframes); the preview's trading-day value wrapped onto two lines (now one line); the list of 5,000 rows took 7.2 s (now 3.9 s, see item 4).

**Fixed at the owner's request (2026-10-04)**: item 1, each time is one typed field (placeholder "Date and time"); it accepts `2025-10-01 09:41` or `Wed 1 Oct 2025 09:41` and shows the second form. Item 4, the trades list is paged at 200 trades: below the table, "Showing 1 to 200 of 5,023", Newer and Older (these two interface changes are not yet in the Penpot wireframes, which were unreachable; update them with the next Penpot session). The whole 5,000-trade list now opens in about 0.3 s a page.

**Parked**: items 2 and 3 stay as built unless the owner says otherwise. `spec.md` still says lists are not paged; changing it makes the sign-off stale.

**Owner's approval of the look**: approved by the owner on 2026-10-04, after fixes 1 and 4 were built. The owner has further feel and design changes they are not happy about; those come after feature 001 is specified.
