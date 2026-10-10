# Wireframes: Sign-in and Audit Log

**Feature**: `002-sign-in-and-audit-log`
**Status**: draft
**Penpot**: file `Tradecraft_v2`, pages `A1 Sign in`, `A2 Access`, `A3 Confirm it's you`, `A4 Audit log`, `A5 Sidebar` (A for access). The frames live only in Penpot; no images are stored in the repository.
**Signed off**: not yet (structure and wording only; the look is decided elsewhere)
**spec-sha256**: <!-- filled in at sign-off -->

## Why these screens

They serve US1 (sign in and be kept out otherwise: A1, A5), US2 (the audit log: A4), and US3 (decide who counts as the owner: A2, A3). US4 (tests sign in without Google) has no screen. The greyscale wireframes carry the placeholder brand (a grey box and the title TRADECRAFT) and blank icon squares, as agreed; the real logo and icons appear only in the reskinned frames.

## Screen inventory

| ID | Screen | Serves | States drawn | Penpot frames |
|---|---|---|---|---|
| A1 | Sign in (no sidebar) | US1, FR-001 to FR-003, FR-023 | default, refused, session ended | `A1 Sign in: default`, `A1 Sign in: refused`, `A1 Sign in: session ended` |
| A2 | Access (a card in Settings) | US3, FR-009 to FR-013 | filled, add with an error, last active address | `A2 Access: filled`, `A2 Access: add with an error`, `A2 Access: last active address` |
| A3 | Confirm it's you (step-up dialog) | US3, FR-012 | dialog, Google step failed | `A3 Confirm it's you: dialog over Access`, `A3 Confirm it's you: Google step failed` |
| A4 | Audit log (new sidebar item) | US2, FR-014 to FR-018 | filled, filtered, nothing recorded yet, no match for these filters | `A4 Audit log: filled`, `A4 Audit log: filtered`, `A4 Audit log: nothing recorded yet`, `A4 Audit log: no match for these filters` |
| A5 | Sidebar on every screen | US1, FR-022 | signed in | `A5 Sidebar: signed in (every screen)` |

The existing wireframes (S0 to S5, L1 to L5) are not redrawn in this draft; they gain the Audit log item and the signed-in block when this feature is built (principle V: updated in the same change).

## Flows

1. **Sign in:** any address without a session → A1 → Continue with Google → Google → the page asked for (Reviews by default). A refusal returns to A1 with the refused notice; an expired session returns to A1 with "Your session ended. Sign in again."
2. **Sign out:** any screen → Sign out (A5) → A1.
3. **Change who can sign in:** Settings → Access (A2) → Add email / Disable / Enable. If the sign-in is older than 10 minutes: A3 first, then the change is made.
4. **Read the log:** Audit log (A4) → filter by identity, kind and period → page with Newer and Older.

## Content list

Every word the owner will read. Times are in the journal time zone. No placeholders.

### A1 Sign in

| Element | Text |
|---|---|
| Brand | TRADECRAFT |
| Title | Sign in |
| Line under it | Tradecraft is private to its owner. |
| Primary action | Continue with Google |
| Help | You will be asked to choose a Google account. · Only email addresses the owner has allowed can sign in. |
| Refused (always the same words, whatever the reason) | ! You can't sign in with that account. |
| Session ended | Your session ended. Sign in again. |

### A2 Access (inside Settings, below Time zone)

| Element | Text |
|---|---|
| Section title | Access |
| Help | Who can sign in. Every address here is you. Nothing is ever deleted; a disabled address can be enabled again. |
| Filter | All 3 · Active 2 · Disabled 1 |
| Columns | Email · Added · Last sign-in · Status |
| Status | Active · Disabled |
| Row actions | Disable (for an active address) · Enable (for a disabled one) |
| Add | Add an email · name@example.com · Add email · Adding an address needs a recent sign-in. |
| Never signed in | Last sign-in: — |
| Add error (not an address) | ! Enter a valid email address, for example name@example.com. |
| Add error (already listed) | ! That address is already on the list. Enable it instead. |
| Last active address | ! This is the last active address. Enable another one before disabling it. |

### A3 Confirm it's you

| Element | Text |
|---|---|
| Title | Confirm it's you |
| Text | You signed in more than 10 minutes ago. Confirm with Google before you change who can sign in. |
| Reassurance | Nothing has been changed yet. |
| Actions | Continue with Google · Cancel |
| Wrong account | ! That account is not the one signed in. Nothing was changed. |

### A4 Audit log

| Element | Text |
|---|---|
| Title | Audit log |
| Subtitle | Who did what, newest first. Entries are never edited or removed. |
| Filters | Identity (All identities) · What (All kinds) · Period (All dates; the same range picker as Trades) · Clear filters |
| Columns | When · Who · What · About · Changed |
| Who for a refused sign-in | Not signed in |
| What (kinds) | Sign-in · Sign-out · Sign-in refused · Step-up confirmed · Identity added · Identity disabled · Identity enabled · Export downloaded · Trade deleted · Trade restored · Account archived · Account restored · Settings changed · Mistake retired · Mistake restored |
| Changed | Field names only, for example "status", "time zone"; a dash when none |
| Paging | Showing 1 to 8 of 8 · Newer · Older |
| Empty | Nothing recorded yet. / Sign-ins, identity changes, exports and other sensitive actions appear here, newest first. |
| No match | No entries for these filters. / Try another identity, kind or a wider period. / Clear filters |

### A5 Sidebar (every screen except A1)

| Element | Text |
|---|---|
| Items | Reviews · Trades · Mistakes · Accounts · Audit log · Settings |
| Signed in block | Signed in as · owner@example.com · Sign out |

## Constitution check

- [x] Every money figure has process information beside it (principle I): this feature shows no money figure.
- [x] Every figure that can be unavailable shows a dash and a reason (principle III): the "Last sign-in" of an address that never signed in and the "Changed" of an entry with no field change show a dash; neither is a number that could be computed.
- [x] No placeholder text anywhere (principle V), apart from the example addresses, which are made up.
- [x] Greyscale only: no brand colour, brand font or colour-coded meaning (principle V). Active and Disabled are written, not coloured.

## Reactions

| Date | Screen | Owner's reaction | What changed |
|---|---|---|---|
| 2026-10-10 | Screen list | Draw A1 to A5 as proposed; Access is a card in Settings, not its own page | Done |
| 2026-10-10 | A1 to A5 | Yes to all the proposals, including the answers to the four open questions | Open questions closed; the wireframes are unchanged |

## Open questions for clarify

None open. Answered on 2026-10-10 (see `spec.md` Clarifications): 10-minute step-up and 8-hour session are right; a refused sign-in records the attempted email; only the FR-015 actions are audited; the log may name a trade by instrument, direction and time.

## Sign-off

- **Signed off by**: owner
- **Date**:
- **Spec hash**:
- **Notes**:

## Visual review

Filled in after implementation (constitution principle V).

- **Date**:
- **Visual direction**: see `docs/visual-direction.md`
- **Built screenshots**: not stored in the repository
- **Wireframe match**:
- **Design checks run**: critique, audit
- **Fixed**:
- **Parked**:
- **Owner's approval**:
