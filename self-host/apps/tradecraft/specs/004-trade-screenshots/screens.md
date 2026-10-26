# Wireframes: Trade Screenshots

**Feature**: `004-trade-screenshots`
**Status**: signed-off
**Penpot**: file `Tradecraft_v2`, pages `C1 Trade images`, `C2 Image viewer`, `C3 Remove image`, `C4 Review drawer images`, `C5 Trades list images`, `C6 Audit log attachments`; C for screenshots (the page letter of feature 004). Drawn 2026-10-25; the frames live only in Penpot and no image of them is stored in the repository. The sidebar is the current one, with the account menu.)
**Signed off**: 2026-10-26, confirmed again the same day after the analysis, and re-confirmed on 2026-10-26 after the storage change to SeaweedFS (no screen changed; structure and wording only; the look is decided elsewhere)
**spec-sha256**: c4a0cf1a0b56bf0829db64dd60987002cfd18c4a3710bbd3c9af2d9458370dfa

## Why these screens

They serve US1 (attach: C1), US2 (see: C2, C4, C5), US3 (remove and describe: C1, C2, C3) and US4 (recorded: C6). The existing screens are not redrawn; C4 to C6 show only the part that changes.

## Screen inventory

| ID | Screen | Serves | States drawn | Penpot frames |
|---|---|---|---|---|
| C1 | Trade edit screen, Images section (changed part of L2) | US1, US3, FR-001 to FR-005, FR-009 | no images, three images, refused file, too big, eleventh image, new trade with images waiting for Save | `C1 Trade images: none yet`, `C1 Trade images: three images`, `C1 Trade images: file refused`, `C1 Trade images: too big`, `C1 Trade images: limit reached`, `C1 Trade images: new trade, waiting for Save` |
| C2 | Large image viewer (a dialog) | US2, US3, FR-007, FR-010, FR-019 | one image of several, the only image | `C2 Image viewer: 2 of 3`, `C2 Image viewer: only image` |
| C3 | Remove an image (a confirmation dialog over the viewer or the trade) | US3, FR-010 | asking | `C3 Remove image: asking` |
| C4 | Daily review drawer, a trade's images (changed part of S2) | US2, FR-006, FR-009 | with images, none | `C4 Review drawer images: with images`, `C4 Review drawer images: none` |
| C5 | Trades list, Images column (changed part of L1) | US2, FR-008 | some trades with images | `C5 Trades list images: count and account as links` |
| C6 | Audit log, attachment rows (changed part of A4) | US4, FR-014 | filled with the two new kinds | `C6 Audit log attachments: rows` |

## Flows

1. **Attach:** take a screenshot (Win+Shift+S), open the trade (Trades list, Edit), press Ctrl+V (C1). The picture appears; add a note if wanted; leave or Save changes. On a new trade the picture waits for Save (C1, last frame).
2. **Judge with the evidence:** daily review, open a trade's drawer: its pictures are there (C4); open one large (C2), step with Next and Previous, Esc to close.
3. **Find the trades that have evidence:** the Trades list shows how many images each trade has (C5).
4. **Remove a mistake:** open the picture (C2) or the edit screen (C1), Remove, confirm (C3). It is gone for good.
5. **See what was done:** Audit log, filter What: Attachment added or Attachment removed (C6).

## Content list

Every word the owner will read. No placeholders.

### C1 Trade edit screen, Images section

The section sits below "Why I took it (thesis, optional)" and above the form's buttons, titled **Images**.

| Element | Text |
|---|---|
| Section title | Images |
| Help line | Screenshots of the chart, for you to read when you judge this trade. PNG, JPEG or WebP, up to 5 MB each, up to 10 per trade. |
| Drop area (none yet) | Paste a screenshot (Ctrl+V), choose a file, or drop one here. |
| Choose button | Choose a file |
| Count | 3 of 10 images |
| Each picture | a small picture box (cross, caption "screenshot"), its name (for example "Screenshot 25 Oct 2026 09:41"), a note field with the label "Note (optional)" and the hint "For example: Entry, 5 min chart", and the actions Open and Remove |
| Note limit | 200 characters |
| Adding | Adding… |
| Refused file | ! That file can't be added. Only PNG, JPEG and WebP images are allowed. |
| Too big | ! That image is 7.4 MB. The limit is 5 MB. |
| Limit reached | ! This trade already has 10 images. Remove one to add another. (The drop area is shown as unavailable.) |
| New trade, waiting | Images added here are saved with the trade when you press Save trade. |
| Could not add | ! The image was not added. Check your connection and try again. |
| Notice after add | Image added. |
| Some images not added after a new trade was saved | ! 2 images were not added. Add them again here. (one image: "1 image was not added. Add it again here.") |

### C2 Large image viewer

| Element | Text |
|---|---|
| Title | the image's name |
| Picture | a large picture box (cross, caption "screenshot, fits the window") |
| Note | label "Note (optional)" with the note in a field the owner can edit (200 characters at most; saved when the owner leaves the field); with only the hint "200 characters at most. Saved when you leave the field." |
| Picture text alternative (for screen readers) | the note, or the image's name when there is no note |
| Position | Image 2 of 3 (not shown when there is only one) |
| Actions | Previous, Next (not shown when there is only one), Download, Remove, Close |
| Keyboard line | Esc closes. Left and right arrows change image. |

### C3 Remove an image

| Element | Text |
|---|---|
| Title | Remove this image? |
| Body | "Screenshot 25 Oct 2026 09:41" will be deleted from the journal. It cannot be brought back. |
| Actions | Remove image, Cancel |
| Notice after | Image removed. |

### C4 Daily review drawer, a trade's images

The section sits inside the drawer where a trade is judged, below the trade's facts and above the judgement questions, titled **Images**.

| Element | Text |
|---|---|
| Section title | Images |
| Each picture | a small picture box, its note beneath (or nothing when it has none); selecting it opens C2 |
| None | (the section is not shown) |
| Link | Edit trade in the trade form. (already in the drawer; it is also where images are added) |

### C5 Trades list, Images column

| Element | Text |
|---|---|
| Column heading | Images |
| Cell | a number that is a link, for example 2 (nothing when the trade has none); it opens the trade's edit screen at its Images section |
| Account column | each account name is a link that shows the Trades list for that account |
| Heading help (hover) | How many screenshots this trade has. |

### C6 Audit log, attachment rows

| Element | Text |
|---|---|
| What (kinds) | Attachment added · Attachment removed |
| About | the trade as the log names it, for example "NQ long, exit Wed 1 Oct 09:58" |
| Changed | — |
| Who | the owner's address, as for any change |

## Constitution check

- [x] Every money figure has process information beside it (principle I): these screens show no money figure of their own; the Trades list keeps its Plan column beside Net result.
- [x] Every figure that can be unavailable shows a dash and a reason (principle III): no figure is added; the Images count is a count, empty when there are none.
- [x] No placeholder text anywhere (principle V): every word is in the content list.
- [x] Greyscale only: no brand colour, brand font or colour-coded meaning (principle V): errors are marked with `!` and text.

## Reactions

| Date | Screen | Owner's reaction | What changed |
|---|---|---|---|
| 2026-10-25 | Screen list | Draw C1 to C6 as proposed | none |
| 2026-10-25 | C2, C4, C5 (the three open questions) | Go with the recommendations (note editable in the viewer, pictures small in a row in the drawer), except the Trades list: the image count is a link; and make the account name a link too | C2 keeps the editable-note frame, C4 keeps the row, C5 shows the count and the account name as links (the account link filters the list to that account: the owner's wording was "hyperlinked", this is the reading to confirm at sign-off) |

## Open questions for clarify

None. The three questions the draft raised were answered on 2026-10-25 (see Reactions).

## Sign-off

- **Signed off by**: owner
- **Date**: 2026-10-26
- **Spec hash**: c4a0cf1a0b56bf0829db64dd60987002cfd18c4a3710bbd3c9af2d9458370dfa
- **Notes**: signed off with the account name in the Trades list drawn as a link that shows that account's trades (the owner confirmed this reading), and the image count as a link to the trade's Images section.

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

## Visual review

**Date**: 2026-10-26. **Approved by the owner**: yes, 2026-10-26 (the look; structure and wording were signed off earlier).

- **Screenshots**: 26 (C1 empty, filled, refusal, full, waiting on a new trade; C2 viewer 2 of 3 and the only image; C3 removal question; C4 drawer with and without images; C5 Trades list; C6 Audit log; light and night), made by `frontend/e2e/zz-screens-images.spec.ts` into `tradecraft-built/004-trade-screenshots` in the system temp folder. None is stored in the repository.
- **Checks run**: the built screens read against the content lists and states above (not an overlay of the Penpot frames); axe WCAG 2 A and AA with contrast (`e2e/zz-a11y-images.spec.ts`), clean in both modes. The impeccable critique and audit skills were not run.
- **Fixed**: the image notes in the review drawer overlapped and the removal dialog's text was cut off, both because they open inside a table cell that does not wrap text (dialogs now wrap; notes are cut at 3 lines).
- **Accepted as built**: account names in the Trades list are underlined links and can wrap onto two lines; an image waiting on a new trade is called "Screenshot" until it is saved.
- **Not exercised**: the Penpot frames L1, L2 and S2 were not updated for the Images column, the Images section and the Images row beyond what the C frames show (task T038).
