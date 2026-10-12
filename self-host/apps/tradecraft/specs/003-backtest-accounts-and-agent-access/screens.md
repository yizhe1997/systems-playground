# Wireframes: Backtest Accounts and Agent Read Access

**Feature**: `003-backtest-accounts-and-agent-access`
**Status**: signed-off
**Penpot**: file `Tradecraft_v2`, pages `B1 Account form`, `B2 Accounts list`, `B3 Reviews of a backtest`, `B4 Trades list`, `B5 Mistakes counter`, `B6 Agent access`, `B7 New token`, `B8 Audit log agents` (B for backtests and agents). The frames live only in Penpot; no images are stored in the repository.
**Signed off**: 2026-10-12 (structure and wording only; the look is decided elsewhere; first signed 2026-10-11)
**spec-sha256**: d945239fab9199375b3fff26cd0408722a20ccf3e8fec9cbe156db1c66aa7092

## Why these screens

They serve US1 (backtests kept apart from live: B1 to B5), US2 (the switch and the tokens: B6, B7) and US3 (what an agent reads is recorded: B8). US4 (a trade belongs to its entry day) has no screen of its own; it changes one line of the trade form's preview and the wording of the Audit log's trade name, described below. The greyscale wireframes carry the placeholder brand and blank icon squares, as agreed.

## Screen inventory

| ID | Screen | Serves | States drawn | Penpot frames |
|---|---|---|---|---|
| B1 | Account form (a dialog over Accounts) | US1, FR-001, FR-002 | new account Live, new account Backtest, changing the kind of an existing account | `B1 Account form: new account, Live`, `B1 Account form: new account, Backtest`, `B1 Account form: changing the kind of an account` |
| B2 | Accounts list | US1, FR-006 | Kind column | `B2 Accounts list: Kind column` |
| B3 | Reviews of a Backtest account (changed part of S0) | US1, FR-003 | days with Reviewed, Draft and no state | `B3 Reviews of a backtest: days are never Missing` |
| B4 | Trades list (changed part of L1) | US1, FR-004, FR-026 | Show backtests off, on | `B4 Trades list: Show backtests off`, `B4 Trades list: Show backtests on` |
| B5 | Mistake counter (changed part of S3) | US1, FR-004 | account chooser open | `B5 Mistakes counter: account chooser open` |
| B6 | Settings, Agent access card | US2, FR-008 to FR-012 | off, on with no tokens, tokens listed, confirm with Google first | `B6 Agent access: off`, `B6 Agent access: on, no tokens yet`, `B6 Agent access: tokens`, `B6 Agent access: confirm with Google first` |
| B7 | New token dialog | US2, FR-009 | name it, name missing or used, value shown once | `B7 New token: name it`, `B7 New token: name missing or used`, `B7 New token: shown once` |
| B8 | Audit log with agent rows (changed part of A4) | US3, FR-017, FR-020 | filled with agent rows | `B8 Audit log: agent rows` |

The existing wireframes (S0 to S5, L1 to L5, A1 to A5) are not redrawn; B3 to B5 and B8 show only what changes on them.

## Flows

1. **Make a backtest account:** Accounts, New account (B1), choose Backtest, Save. It appears in B2 with a Backtest tag and in every chooser marked "(Backtest)".
2. **Work in it:** Reviews with that account chosen (B3): days show Reviewed, Draft or "—", never Missing. Trades list shows its trades when the account is chosen, or with Show backtests on (B4). The mistake counter counts it only when chosen (B5).
3. **Let an agent read:** Settings, Agent access (B6): turn it on, New token (B7), name it, Create token, copy the value (shown once). Each of these steps asks for a recent Google confirmation first (B6, last frame) when the sign-in is older than 10 minutes.
4. **See what it read:** Audit log (B8), filter What: Agent read.
5. **Stop it:** Revoke one token (B6, tokens), or turn the switch off.

## Content list

Every word the owner will read. No placeholders.

### B1 Account form

| Element | Text |
|---|---|
| Title | New account · Edit account |
| Fields | Name · Currency · Trading-day start (optional) · Kind |
| Kind choices | Live · Backtest |
| Help under Live | Counts in your reviews, trades and mistake counter. |
| Help under Backtest | Kept apart from live trading: its days are never Missing, and it stays out of live figures until you choose it. |
| Notice when changing the kind of an existing account | Changing the kind moves this account's days and trades in or out of live figures. Nothing you typed changes. |
| Actions | Save account · Cancel |

### B2 Accounts list

| Element | Text |
|---|---|
| Columns | Name · Currency · Kind · Trading-day start · Status |
| Kind | Live · Backtest |
| Help | Backtest accounts are marked in every account chooser and left out of live figures until you choose them. |

### B3 Reviews of a Backtest account

| Element | Text |
|---|---|
| Account chooser entry | NQ ORB backtest 2024 (Backtest) |
| Info line | Backtest account: its days are never marked Missing and nothing here changes your live figures. |
| Day review state | Reviewed · Draft · — (a day with trades and no review) |
| Week line | 6 trades · Net +$388.50 · Plan followed 4 of 6 |
| Note for comparison | For a live account, a day with trades and no review would show Missing here. |

### B4 Trades list

| Element | Text |
|---|---|
| Columns | Entry time · Exit time · Trading day · Account · Instrument · Direction · Size · Net result · Plan · R |
| New switch | Show backtests |
| Backtest rows | the account name followed by a Backtest tag |
| Footer, off | Showing 3 trades. Backtests are hidden; turn on Show backtests or choose a backtest account. |
| Footer, on | Showing 5 trades, backtests included. |

### B5 Mistake counter

| Element | Text |
|---|---|
| Chooser | All live accounts · each live account · Backtests: each backtest account (Backtest) |
| Footer | Counting live accounts only. Choose a backtest account to count its mistakes on their own. |

### B6 Agent access (a card in Settings, below Access)

| Element | Text |
|---|---|
| Title | Agent access |
| Help | Lets an agent you choose read your journal. Everything it reads is written to the Audit log. |
| Switch | Off · On |
| Off | Turn agent access on to create tokens. |
| On, no tokens | No tokens yet. · A token is what you give your agent so it can read. You can revoke it at any time. · New token |
| Columns | Name · Created · Last used · Status |
| Status | Active · Revoked |
| Last used | a time, or Never used |
| Row action | Revoke (for an Active token) |
| Confirm dialog | Confirm it's you · You signed in more than 10 minutes ago. Confirm with Google before you change agent access. · Nothing has been changed yet. · Continue with Google · Cancel |

### B7 New token

| Element | Text |
|---|---|
| Title | New token |
| Field | Name |
| Help | Choose a name you will recognise. It is shown in the Audit log next to everything this token reads. |
| Line | This token can read your journal. |
| Error | ! That name is already used. Choose another. · ! Name is required. |
| Actions | Create token · Cancel |
| Shown once: title | Token created |
| Shown once: text | Copy this token now and paste it into your agent's settings. It cannot be shown again. |
| Shown once: help | If you lose it, revoke this token and make a new one. |
| Actions | Copy · Done |

### B8 Audit log

| Element | Text |
|---|---|
| New kinds in What | Agent read · Agent refused · Agent token created · Agent token revoked · Agent access turned on · Agent access turned off · Account kind changed |
| Who for an agent | the token's name followed by [agent], for example `Claude Desktop, backtests [agent]` |
| Who for a refused call | Not signed in |
| About for an agent read | which read, and for which account, for example `Trades, NQ ORB backtest 2024`; never a figure |

### Changed wording on existing screens (no new frame)

| Where | Was | Now |
|---|---|---|
| Trade form preview | exit read in Central Time; Funded 50K starts its trading day at 17:00 | entry read in Central Time; Funded 50K starts its trading day at 17:00 |
| Audit log, a trade's name | NQ long trade of Wed 1 Oct 09:58 (the exit time) | the same form with the **entry** time |
| Account form, help under Trading-day start | Leave the start empty to use the calendar date of each exit. Example: with 17:00, a trade that exits at 17:30 counts to the next day. | Leave the start empty to use the calendar date of each entry. Example: with 17:00, a trade entered at 17:30 counts to the next day. |
| Accounts list, footer | A trade that exits at or after the start time counts to the next day. With no start time, a trade counts to the calendar date of its exit. | A trade entered at or after the start time counts to the next day. With no start time, a trade counts to the calendar date of its entry. |
| Account form, start 00:00 error | ... Leave it empty to use the calendar date of each exit. | ... Leave it empty to use the calendar date of each entry. |
| Daily review, trades table | first column "Time" shows the exit time; trades in exit order | first column "Entry time" shows the entry time; trades in entry order (the same in the row's accessible name and the judgement dialog's heading) |

## Constitution check

- [x] Every money figure has process information beside it (principle I): B3's day rows and week line and B4's rows each show the plan answer beside the net result; agent answers carry the same (FR-015).
- [x] Every figure that can be unavailable shows a dash and a reason (principle III): a Backtest day with no review shows "—", not a zero or a missing mark.
- [x] No placeholder text anywhere (principle V), apart from the made-up token value in B7, which is marked as an example and is never a real secret.
- [x] Greyscale only: no brand colour, brand font or colour-coded meaning (principle V). Live, Backtest, Active, Revoked and On, Off are written, not coloured.

## Reactions

| Date | Screen | Owner's reaction | What changed |
|---|---|---|---|
| 2026-10-11 | Screen list | Draw the set B1 to B8 as proposed; accounts get a Live or Backtest kind | Done |
| 2026-10-11 | Trading day | A trade belongs to its entry day | Spec US4 and FR-024 to FR-026; wording changes listed above |
| 2026-10-11 | B4 Trades list | Entry time as the first time column | B4 redrawn with Entry time, Exit time, Trading day; the list is ordered by entry time (FR-026) |
| 2026-10-11 | B4, B5 | Show backtests off by default; "All live accounts" is fine | No change |
| 2026-10-11 | Clarify | A token reads the whole journal; one audit row per agent read (no preference) | Recorded in spec Clarifications; no frame changes |
| 2026-10-12 | Build of US1 | (no reaction; the existing frames kept in step) | S3's chooser reads "All live accounts". L1 filled, L3 list and L4 new and edit are marked "superseded by" B4, B2 and B1, which draw those screens in full. The closed choosers of S0 to S5 are unchanged; "(Backtest)" and the Backtests group appear in B3 and B5's open choosers |
| 2026-10-13 | B6 | The same change as B7: B6's help must not say the agent "cannot change anything" | B6's help reads "Lets an agent you choose read your journal. Everything it reads is written to the Audit log." (the parked follow-up 2 of the visual review is done) |
| 2026-10-12 | B7 built | The line under the name must not say the token "cannot change anything": agents are meant to be able to do more than read in later features, and the line would then be wrong | B7's line reads "This token can read your journal." (B6's help still says "It can read; it cannot change anything." and is the owner's to decide) |
| 2026-10-12 | Build of US4 | (no reaction; the existing frames kept in step) | L2's preview line, L3's footer, L4's help line and S1's trades-table header ("Entry time") are updated in Penpot to the wording above |
| 2026-10-12 | Analysis of the tasks | A day's trades follow the entry too | The daily review's trades table shows Entry time and is in entry order (listed above); to be confirmed with the re-sign-off |

## Open questions for clarify

None open. Answered on 2026-10-11 (see `spec.md` Clarifications): Entry time is the first time column of the Trades list; "Show backtests" is off by default; "All live accounts" is fine; a token reads the whole journal; one audit row per agent read.

Existing frames that change when this is built (principle V, updated in the same change): L1 Trades list (the Entry time column and the order), L2 Log a trade (the preview line says "entry read in ..."), the daily review's trades table (Entry time first column), and S0 to S5 for the account chooser's "(Backtest)" mark.

## Sign-off

- **Signed off by**: owner
- **Date**: 2026-10-12 (first signed 2026-10-11)
- **Spec hash**: d945239fab9199375b3fff26cd0408722a20ccf3e8fec9cbe156db1c66aa7092
- **Notes**: Signed off on the owner's instruction ("sign off, then go to plan") after clarify closed every open question. Checked before signing: every story but US4 has a screen (US4 has none by design: a preview line and a log name, listed under "Changed wording on existing screens"); every requirement that touches the interface is covered (FR-001 to FR-007 by B1 to B5, FR-008 to FR-012 by B6 and B7, FR-017 and FR-020 by B8, FR-024 to FR-026 by the wording table and B4); no TODO or TBD in the content list (the token value in B7 is a made-up example string); the 17 frames named in the inventory exist in Penpot; no money figure appears without the plan figure beside it. One small gap accepted: B7 draws the "name already used" error and the "Name is required." error is the same layout with the other sentence. The existing S, L and A frames gain the changes listed in the open-questions section at build time.
- **Re-sign-off 2026-10-12**: the sign-off of 2026-10-11 went stale when the spec was clarified after the analysis of the tasks (an audited call is a read or a refused request; the agent's trade filters trimmed; no expiry wording; a day's trades in entry order with the entry time shown; a browser request to the agent door recorded). Checked: no TODO or TBD, no wireframe redrawn, one row added to "Changed wording on existing screens" (the daily review's trades table, first column Entry time), which the owner approved. Signed off on the owner's instruction ("yes run the sign-off").

## Visual review

Filled in after implementation (constitution principle V).

- **Date**: 2026-10-12
- **Visual direction**: see `docs/visual-direction.md` ("The Lab Notebook", approved 2026-10-04)
- **Built screenshots**: not stored in the repository; captured by `frontend/e2e/zz-screens-agent.spec.ts` (B1 to B8 and the changed trade form, light and night) to a folder outside it
- **Wireframe match**: B1 (new Live, new Backtest, changing the kind), B2, B3, B4 (off, on), B5, B6 (off, on, tokens, confirm with Google), B7 (name it, name missing, shown once) and B8 match the signed-off structure, content and states. Differences, all decided and recorded above: B7's line reads "This token can read your journal." (the owner's change, 2026-10-12); the daily review's table shows Entry time (re-sign-off 2026-10-12); the account-form help and the Accounts list footer say entry instead of exit
- **Design checks run**: critique and audit against `DESIGN.md` and `PRODUCT.md`, run inline in one context and so marked degraded (no sub-agents were started); the impeccable detector on the eight new or changed components found nothing; axe WCAG 2 A and AA in light and night for B1 to B8 and a keyboard-only pass (`e2e/zz-a11y-agent.spec.ts`)
- **Fixed**: the Kind choice in the account form showed the browser's box around a fieldset (now plain, like the other fields); the "Counting live accounts only" note on Mistakes touched the next card (now inside the counter); the trade-form capture was taken before the preview had answered (a capture fix, not a product one)
- **Parked** (follow-ups, not blocking): (1) the Trades list is wider than a 1440 px window with long account names and the Backtest tag, so Plan, R and the actions scroll; (2) ~~B6's help still says "It can read; it cannot change anything."~~ done on 2026-10-13 (the same change as B7); (3) after a token is made, offer a ready-to-paste Claude Code command in the "shown once" dialog (the first real attempt failed on a missing space after Bearer); (4) a week with no trades shows a "Not reviewed" chip on a backtest account
- **Not exercised**: a phone layout (the product has none); the step-up through real Google
- **Owner's approval**: approved on 2026-10-12 ("approve the look of feature 003"), with the four parked items as follow-ups
