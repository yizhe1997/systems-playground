# Wireframes: Sign-in and Audit Log

**Feature**: `002-sign-in-and-audit-log`
**Status**: signed-off
**Penpot**: file `Tradecraft_v2`, pages `A1 Sign in`, `A2 Access`, `A3 Confirm it's you`, `A4 Audit log`, `A5 Sidebar` (A for access). The frames live only in Penpot; no images are stored in the repository.
**Signed off**: 2026-10-10 (structure and wording only; the look is decided elsewhere)
**spec-sha256**: c5cf17cc17f91001ba69045d86432c524b7afab91df7aeebe4cd5e6428518bf6

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
| 2026-10-10 | Spec FR-005 | A Google re-confirmation restarts the 8 hours; re-run the sign-off | Spec clarified, hash updated; the wireframes are unchanged |

## Open questions for clarify

None open. Answered on 2026-10-10 (see `spec.md` Clarifications): 10-minute step-up and 8-hour session are right; a refused sign-in records the attempted email; only the FR-015 actions are audited; the log may name a trade by instrument, direction and time.

## Sign-off

- **Signed off by**: owner
- **Date**: 2026-10-10
- **Spec hash**: c5cf17cc17f91001ba69045d86432c524b7afab91df7aeebe4cd5e6428518bf6
- **Notes**: Signed off on the owner's instruction ("sign off, then go to plan") after clarify closed the four open questions. Checked before signing: every user story but US4 has a screen (US4, the local-only session, has none by design); every requirement that touches the interface is covered (FR-001 to FR-003, FR-009 to FR-013, FR-018, FR-022, FR-023); no TODO, TBD or placeholder text in the content list; empty, error, refused, session-ended, no-match and step-up states are drawn; no money figure appears on these screens. The existing S and L frames are not redrawn here; they gain the Audit log item and the signed-in block at implementation. **Re-signed 2026-10-10** on the owner's instruction after `spec.md` FR-005 and its Clarifications gained one line (a Google re-confirmation starts a new eight hours); re-checked against the clarified spec: no screen, state or wording changed, A3 already says "more than 10 minutes ago".

## Build notes (what the built screens do differently from the wireframes)

Recorded during the build for the visual review. None changes a signed-off word, state or flow.

- **Sign out and the sidebar icons:** the built Sign out control is a quiet button with a small exit icon, and the Audit log item has a scroll icon; the greyscale frames show text and a blank square, as agreed.
- **Paging of the Audit log:** a log of one page shows "Showing 1 to n of n" without Newer and Older (the same rule as the Trades list); the two buttons appear when there is more than one page of 50.
- **Sign-in screen:** the built screen shows the real logo where the greyscale frame shows the grey box and the title, per the standing rule that only reskin frames carry the real brand.
- **Settings:** the Access card sits below Time zone in the built Settings screen; the greyscale Settings frame (L5) is unchanged and the card is drawn on A2.
- **Existing frames:** S0 to S5 and L1 to L5 in Penpot now carry the Audit log item and the signed-in block in the sidebar (updated 2026-10-10).

## Visual review

Done 2026-10-10. **The owner approved the look the same day** (constitution principle V).

- **Date**: 2026-10-10 (built screens captured in light and night, on a fresh stack)
- **Visual direction**: see `docs/visual-direction.md` (Hex, comfortable, light and night; approved 2026-10-04)
- **Built screenshots**: not stored in the repository. Captured by `frontend/e2e/zz-screens-auth.spec.ts` to the system temp folder (`tradecraft-built/002-sign-in-and-audit-log`), one file per frame and mode: `a1-sign-in-default`, `a1-sign-in-refused`, `a1-sign-in-session-ended`, `a2-access-filled`, `a2-access-add-error`, `a2-access-already-listed`, `a3-confirm-its-you-dialog`, `a3-confirm-its-you-failed`, `a4-audit-filled`, `a4-audit-filtered`, `a4-audit-nothing-recorded-yet`, `a4-audit-no-match`, `a5-sidebar-signed-in`
- **Wireframe match**: structure, wording and states match A1 to A5. The differences are listed under "Build notes" above (real logo and icons instead of the greyscale placeholders; Audit log paging only when there is more than one page)
- **Design checks run**: axe (WCAG 2 A and AA including 4.5:1 contrast) on every state in both modes; the Impeccable design hook on each new component file (no deterministic issues); a manual look at every captured frame against the wireframes and `DESIGN.md`
- **Fixed**: date cells in the Access and Audit tables were top-aligned (a grid class was applied to table cells); the "Add email" label wrapped; the filter chips looked like plain links (now the same pill chips as Reviews)
- **Parked**: none
- **Owner's approval**: approved 2026-10-10 ("Approve", after seeing the built sign-in, Access, Confirm it's you and Audit log screens in light and night)
