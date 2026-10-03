# Wireframes: Log Trades

**Feature**: `000-log-trades`
**Status**: draft, greyscale wireframes drawn 2026-10-03 and revised 2026-10-04 after clarify (archive controls, currency notice). Next: sign-off.
**Penpot**: file `Tradecraft_v2`, pages `L1 Trades list`, `L2 Log a trade`, `L3 Accounts`, `L4 Account dialog`, `L5 Settings` (L for log-trades, so they do not clash with the 001 pages). Images in [wireframes/](wireframes/).
**Signed off**: not yet (structure and wording only; the look is decided elsewhere)
**spec-sha256**: (filled in at sign-off)

All sample data is made up: accounts "Funded 50K", "Practice" and "Swing EUR", Wednesday 1 October 2025, NQ and ES trades.

## Why these screens

They serve every user story in `spec.md`: L1 serves stories 2 and 3 (see and correct trades), L2 serves stories 1, 3, 4 and 5 (log, edit, typed result, trading day), L3 and L4 serve stories 1 and 6 (accounts), and L5 holds the time zone (FR-014).

## Screen inventory

| ID | Screen | Serves | States drawn | Image |
|---|---|---|---|---|
| L1 | Trades list (the home screen) | US1, US2, US3, FR-004, FR-015 to FR-019 | filled; no accounts yet; no trades at all; filters match nothing; showing deleted | [filled](wireframes/l1-trades-list-filled.png), [no accounts](wireframes/l1-trades-list-no-accounts-yet.png), [none at all](wireframes/l1-trades-list-no-trades-at-all.png), [no match](wireframes/l1-trades-list-filters-match-nothing.png), [deleted](wireframes/l1-trades-list-showing-deleted.png) |
| L2 | Log or edit a trade | US1, US3, US4, US5, FR-005 to FR-012, FR-020 | new; filled with the result computed; dollars per point blank (typed result); validation errors; edit | [new](wireframes/l2-log-a-trade-new.png), [filled](wireframes/l2-log-a-trade-filled-result-computed.png), [typed result](wireframes/l2-log-a-trade-dollars-per-point-blank.png), [errors](wireframes/l2-log-a-trade-validation-errors.png), [edit](wireframes/l2-edit-a-trade.png) |
| L3 | Accounts list | US1, US6, FR-003, FR-004, FR-004a | list; showing archived; none yet | [list](wireframes/l3-accounts-list.png), [archived](wireframes/l3-accounts-showing-archived.png), [none yet](wireframes/l3-accounts-none-yet.png) |
| L4 | Account dialog (new or edit) | US1, US5, US6, FR-001 to FR-004a | new; edit; name already used | [new](wireframes/l4-account-dialog-new.png), [edit](wireframes/l4-account-dialog-edit.png), [name used](wireframes/l4-account-dialog-name-already-used.png) |
| L5 | Settings (time zone) | US5, FR-014 | time zone | [time zone](wireframes/l5-settings-time-zone.png) |

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

APP NAME; Trades, Accounts, Settings.

### L1 Trades list

| Element | Text |
|---|---|
| Title and subtitle | Trades · Your closed trades, newest first. |
| Actions | Log a trade · Export |
| Filters | Account (All accounts) · From (1 Oct 2025) · To (31 Oct 2025) · Clear filters · Show deleted (switch) |
| Columns | Exit time · Account · Instrument · Direction · Size · Net result · R · Edit · Delete |
| Result cell | -$125.00; a typed result adds "typed in" underneath |
| R cell | -0.50 R, or a dash with a reason underneath: "no stop recorded", "no dollars per point" |
| Footnote | Each result is in its own account's currency. This list has no totals. |
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
| Actions | Save account · Cancel · Archive account (edit only) |

### L5 Settings

| Element | Text |
|---|---|
| Title and subtitle | Settings · Applies to the whole journal. |
| Time zone | Time zone · Times you enter and see, and the trading day, are read in this zone. Changing it never moves a trade in time. · Central Time (America/Chicago) · Current time in this zone: Wed 1 Oct 2025 10:42 · Save |

## Constitution check

- [ ] Every money figure has process information beside it (principle I). **Not met in this feature, and cannot be:** plan adherence and mistakes arrive with `001`. This list shows R beside each result and has no totals. Needs the owner's decision (see open questions).
- [x] Every figure that can be unavailable shows a dash and a reason (L1 R cell, L2 preview)
- [ ] No placeholder text anywhere (sample data is made up; the owner confirms the wording at sign-off)
- [x] Greyscale only: no brand colour, brand font or colour-coded meaning (meaning is carried by words and a dark fill for selected and primary)

## Reactions

| Date | Screen | Owner's reaction | What changed |
|---|---|---|---|
| 2026-10-03 | All | Wants to see the screens drawn before reacting | Screens drawn as proposed |
| 2026-10-04 | All | Looks good enough for now | Proceeded to clarify |
| 2026-10-04 | Sign-off check | FR-004 (no trade without an account) had no screen | Added the trades list state "no accounts yet" and the missing error messages to the content list |
| 2026-10-04 | Clarify: time zone | Chose the recommendation | One time zone for the whole journal; Settings holds it (as drawn) |
| 2026-10-04 | Clarify: typed result | Chose the recommendation | A typed result is after costs; the costs field is "not used" (as drawn) |
| 2026-10-04 | Clarify: retiring an account | Chose the recommendation (archive only) | Archive and Restore on the accounts list, Show archived switch, Archive account in the edit dialog |
| 2026-10-04 | Clarify: currency change | Allow it, "after all it's just a label" | Edit dialog warns that existing results are relabelled, not converted |
| 2026-10-04 | Clarify: R | Chose the recommendation | R is net result over risk (as drawn) |

## Open questions for clarify

None. The six points from the spec were decided on 2026-10-04 (see Reactions and the spec's Clarifications), and three defaults were applied without asking: no duplicate-trade warning, the only active account is preselected when logging a trade, and R is shown with two decimals.

Left for the sign-off step: the principle I exception (process information beside money figures cannot be met until `001`; a written exception that ends when `001` is built).

## Sign-off

- **Signed off by**: owner
- **Date**:
- **Spec hash**:
- **Notes**:
