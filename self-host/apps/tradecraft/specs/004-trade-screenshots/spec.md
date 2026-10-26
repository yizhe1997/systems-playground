# Feature Specification: Trade Screenshots

**Feature Directory**: `specs/004-trade-screenshots`

**Created**: 2026-10-25

**Status**: Draft

**Input**: Owner's decision (2026-10-25): attachments are the next feature, and the first version is **images only**: no PDFs or other files, no annotations. The owner attaches images to a trade, sees them where they look at the trade, removes them, and can paste a screenshot straight from the clipboard. The images live in the journal's own database so one backup covers everything. Only the owner sees them; the audit log records adding and removing; an agent never receives an image, only that one is there.

## Why this feature, and who it is for

The owner is one person who judges **decisions**. The chart at the moment of entry, and again at the exit, is the evidence for a decision: "I entered into resistance", "the stop was inside the noise". Today a trade can carry words (its thesis, a review's notes) but no picture, so the owner keeps screenshots in a folder that the journal knows nothing about, and the evening review happens with the trade on one screen and the chart on another.

This feature lets a trade carry its screenshots. The everyday flow is short: take a screenshot of the chart (on Windows, Win+Shift+S), open the trade, press **Ctrl+V**, and the image is attached. The owner can also choose a file from the computer instead.

The first versions of the journal listed attachments as out of scope (features 000 and 001: "its own later feature"); this is that feature. It is deliberately small (constitution VI): **images only**, on **trades only**, with no drawing tools.

This feature does not change any figure, any trading rule or the trading day.

## Clarifications

### Session 2026-10-25

- Q: Which kinds of file in the first version? → A: **Images only** (PNG, JPEG, WebP). No PDFs, no other files.
- Q: Annotations (arrows, text on the image)? → A: **No**, not in this feature.
- Q: Paste from the clipboard in the trade form? → A: **Yes.** (The clipboard is what the computer holds after Copy, or after a screenshot tool such as Win+Shift+S; Ctrl+V pastes it.)
- Q: How do the image files leave the journal in the export? → A: The export lists each image by **id, details and address**, not the files; any single image can be downloaded; the complete copy is the database backup. (A written exception to constitution VII, ending when the owner wants a one-step export of the image files.)
- Q: Is a picture's note editable from the large viewer, or only from the trade's edit screen? → A: **Editable in the viewer** too (a note field under the picture, saved when the owner leaves it).
- Q: In the daily review drawer, pictures small in a row or large and stacked? → A: **Small in a row**, the judgement questions stay on screen; a picture opens large on selecting it.
- Q: Should the image count in the Trades list be a link? → A: **Yes**, it opens that trade's Images section on its edit screen. The owner also asked that the **account name** in the Trades list be a link: it shows the Trades list for that account (the same as choosing it in the account chooser).
- Q: Where do the images live? → A: In the owner's **SeaweedFS object store** (changed 2026-10-26; first decided as the journal's own database on 2026-10-25). The pictures will accumulate for years, which is what an object store is for; the journal's database keeps only each image's details. The object store needs its own backup (see Assumptions).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Attach a screenshot to a trade (Priority: P1)

The owner opens a trade (its edit screen, or a new trade being logged) and adds an image in either of two ways: they **paste** (Ctrl+V while the trade form is open) or they **choose a file** (or drop one onto the form). The image appears as a small picture on the trade, with a place for a short optional note ("Entry, 5 min chart"). They can add several, up to a limit. Saving the trade keeps them.

**Why this priority**: this is the whole point of the feature, and it is useful on its own with nothing else.

**Independent Test**: open a trade, paste a screenshot, see it on the form, reload, and see it still there; add a second by choosing a file; both are listed in the order they were added.

**Acceptance Scenarios**:

1. **Given** the edit screen of a trade and an image on the clipboard, **When** the owner presses Ctrl+V, **Then** the image is attached and shown as a small picture within a second or two, with no further steps.
2. **Given** the edit screen of a trade, **When** the owner chooses an image file (or drops one onto the screen), **Then** it is attached the same way.
3. **Given** a new trade being logged, **When** the owner pastes or chooses an image before saving, **Then** the image is shown on the form and is stored when the trade is saved; if the trade is not saved (the owner leaves, or saving is refused), nothing is stored.
4. **Given** a trade that already has the maximum number of images, **When** the owner adds another, **Then** it is refused with a plain message that says the limit and nothing else changes.
5. **Given** a file that is not an allowed image (a PDF, a text file, an SVG, a file renamed to look like a PNG), **When** the owner adds it, **Then** it is refused with a plain message that names what is allowed.
6. **Given** an image over the size limit, **When** the owner adds it, **Then** it is refused with the limit stated.
7. **Given** the clipboard holds text and no image, **When** the owner presses Ctrl+V in a text field, **Then** the text pastes as usual and nothing is attached.

---

### User Story 2 - See the screenshots where the trade is looked at (Priority: P1)

The images are visible wherever the owner looks at a trade to judge it: on the trade's edit screen, and in the daily review's drawer where each trade is judged. A small picture opens large (a viewer that closes with Escape and can step to the next and previous image of the same trade). The note, if any, is shown beside it.

**Why this priority**: an image nobody sees while judging the trade has no value; this is the other half of the feature.

**Independent Test**: attach two images to a trade; open the daily review for that trade's day, open the judge drawer, see both pictures and their notes, open one large, step to the other, close with Escape.

**Acceptance Scenarios**:

1. **Given** a trade with images, **When** the owner opens its edit screen, **Then** the images are listed with their notes.
2. **Given** a trade with images, **When** the owner opens it in the daily review's drawer, **Then** the same images are shown there, without leaving the review.
3. **Given** a small picture, **When** the owner opens it, **Then** it shows large, with its note, and Previous and Next when the trade has more than one; Escape closes it and focus returns to the picture that opened it.
4. **Given** a trade with no images, **When** it is looked at, **Then** nothing is shown in place of images except how to add one on the edit screen.
5. **Given** the Trades list, **When** a trade has images, **Then** the row shows how many (a count that is a link to the trade's Images section), so the owner can find the trades that carry evidence and reach them in one click; it shows no picture.
6. **Given** the Trades list, **When** the owner selects an account's name in a row, **Then** the list shows that account's trades (FR-020).

---

### User Story 3 - Remove or describe a screenshot (Priority: P2)

The owner can change an image's note and can remove an image they attached by mistake. Removing asks for a confirmation, because the image cannot be brought back.

**Why this priority**: mistakes happen (the wrong chart, a screenshot with an account number in it), and an attachment that cannot be removed would make the owner afraid to paste.

**Independent Test**: attach an image, edit its note, remove it with the confirmation, and see that it is gone from the trade and from every screen.

**Acceptance Scenarios**:

1. **Given** an attached image, **When** the owner edits its note and saves, **Then** the new note shows everywhere the image does.
2. **Given** an attached image, **When** the owner removes it and confirms, **Then** it is gone from the trade and its stored bytes are gone from the journal; cancelling the confirmation changes nothing.
3. **Given** a trade that is deleted (it can be restored), **When** it is restored, **Then** its images are all still there; deleting a trade does not remove its images.

---

### User Story 4 - Safe, recorded and exportable (Priority: P2)

Images are the owner's private records. They are served only to the signed-in owner, never to an agent, and can never run as a page or a script. Adding and removing are recorded in the audit log. The export carries every image's details, and the owner can get the images themselves out of the journal.

**Why this priority**: uploads are the riskiest thing a journal can accept (constitution IV names upload code for review passes), and the owner must stay in control of their data (constitution VII).

**Independent Test**: sign out and request an image's address: refused. Add and remove an image: two entries in the Audit log. Download the export: it lists the image with its size and note. Open an agent's view of the trade: the image's name and note are listed, no image data.

**Acceptance Scenarios**:

1. **Given** no signed-in session, **When** an image's address is requested, **Then** it is refused exactly like any other private page.
2. **Given** a file that is really a page or a script with an image name, **When** it is added, **Then** it is refused; and an allowed image, when served, can only be displayed, never run.
3. **Given** an added or removed image, **When** the owner opens the Audit log, **Then** there is one entry for each, naming the trade the way the log already names a trade, and holding no image data.
4. **Given** an agent with a valid token, **When** it reads a trade, **Then** it sees how many images the trade has and each one's name, note, type and size, and **cannot** fetch an image through its token.
5. **Given** the export, **When** it is downloaded, **Then** it lists every image of every trade with its id, trade, name, note, type, size, when it was added and the address it is served from; and **Given** the image viewer, **When** the owner chooses Download, **Then** that one image is saved to their computer.

### Edge Cases

- The same image is pasted twice: it is attached twice (the owner may want two notes); the journal does not guess they are duplicates.
- Ctrl+V when the clipboard holds a screenshot **and** the owner's cursor is in the thesis box: the image is attached to the trade and no text is inserted.
- A very large screenshot (a 4K monitor): within the size limit it is stored as it is; over it, it is refused with the limit stated (the journal does not shrink it silently).
- A file whose name is long, empty, or has odd characters: its note-free display name is cleaned to something safe; a pasted image with no name is called "Screenshot" with the time.
- The connection drops half-way through adding: nothing partial is kept and the owner is told it was not added.
- The owner adds an image to a trade, then archives its account: the images stay, as the trade does.
- An image is added to a trade of a Backtest account: it works the same.
- Two images are added at the same moment: both are kept, in the order they arrived.
- A new trade is saved but one of its pasted images then fails to store (the connection drops): the trade is saved as a trade without that image, the owner lands on its edit screen and a message says how many images were not added so they can add them again; nothing partial is kept.
- The journal is restored from a backup: the details come back with the database and the pictures with the object store's own backup; a detail whose picture is missing shows a plain notice instead of a picture, and nothing else breaks.
- A trade is edited in two browser tabs and an image is added in one: the other shows it after reload; the existing "out of date" protection for trade edits is not changed by images (an image is added and removed on its own, it does not change the trade's other fields).
- A browser that cannot paste images from the clipboard: choosing a file and dropping one still work.

## Requirements *(mandatory)*

### Functional Requirements

**Adding**

- **FR-001**: The owner MUST be able to attach an image to a trade, on the trade's edit screen and on the form for a new trade, by pasting from the clipboard (Ctrl+V), by choosing a file, and by dropping a file onto the form.
- **FR-002**: Only PNG, JPEG and WebP images MUST be accepted, judged by what the file **is**, not by its name or the type the browser claims. Anything else (including SVG, GIF, PDF and any page or script) MUST be refused with a plain message that names what is allowed.
- **FR-003**: An image MUST NOT be larger than 5 MB, and a trade MUST NOT hold more than 10 images. A refusal MUST state the limit that was hit and MUST NOT change anything.
- **FR-004**: On a new trade, images added before saving MUST be stored only when the trade is saved, and MUST be discarded if it is not.
- **FR-005**: Each image MUST have a display name (the file's name cleaned of anything unsafe, or "Screenshot" with the date and time for a pasted image with none) and an optional note of up to 200 characters. The owner MUST be able to edit the note after adding.

**Seeing**

- **FR-006**: A trade's images MUST be shown, in the order they were added, on the trade's edit screen and in the daily review's drawer for that trade, each with its note.
- **FR-007**: The owner MUST be able to open an image large, with its note (which can be edited there, saved when the owner leaves the field), step through the trade's images (Previous, Next), and download that image. The viewer MUST close with Escape and return focus to the picture that opened it, and MUST work from the keyboard (constitution V; the same accessibility rules as the rest).
- **FR-008**: The Trades list MUST show how many images a trade has (nothing when it has none), and the count MUST be a link that opens that trade's edit screen at its Images section. It MUST NOT show the images.
- **FR-009**: A trade with no images MUST show nothing in their place on the review drawer, and on its edit screen a way to add one.

**Removing**

- **FR-010**: The owner MUST be able to remove an image, after a confirmation that says it cannot be brought back. Removing MUST delete the stored image, not hide it.
- **FR-011**: Deleting a trade MUST keep its images, and restoring the trade MUST bring them back as they were.

**Safety**

- **FR-012**: An image MUST be served only to a signed-in owner session, by the same gate as every other private route, and MUST be refused to anyone else, including an agent token.
- **FR-013**: An image MUST be served so that it can only be displayed and never run: it MUST NOT be treated as a page or a script by the browser, whatever its name or its content.
- **FR-014**: Adding an image and removing one MUST each be recorded in the audit log (kinds "Attachment added" and "Attachment removed"), naming the trade as the log names a trade and holding no image data and no note.
- **FR-015**: An agent reading a trade MUST be told how many images it has and, for each, its name, note, type, size and when it was added. The agent's tools MUST NOT return any image, and the agent token MUST NOT open an image's address (constitution II and VII: the app makes no model call, and nothing leaves the journal without the owner).

**Data and export**

- **FR-016**: The export MUST list every image of every trade: its id, its trade, display name, note, type, size, when it was added, and the address it is served from (which only a signed-in owner can open, FR-012). The owner MUST be able to download any single image from the viewer. The image files themselves are **not** in the export: a complete copy of them is the database backup (FR-017). This is a written exception to constitution VII ("all data MUST be exportable") chosen by the owner on 2026-10-25, ending when the owner asks for a one-step export of all the image files (a later change).
- **FR-017**: The pictures MUST be kept in the owner's own object store (SeaweedFS, in a bucket of their own), and each image's details in the journal's database. An image is stored only after the journal has judged its bytes, a refused or failed store MUST change nothing in the journal (no detail, no audit entry), and removing an image MUST remove its picture too. The journal MUST NOT send an image to any service but the owner's own object store.
- **FR-018**: The feature MUST NOT change any trade field, trading day, figure, review, mistake or rule. Apart from the attachment parts (the edit screen, the drawer, the Trades list's count and the agent's trade read), no existing screen changes, and existing data is untouched.
- **FR-019**: The new and changed screens MUST meet the same accessibility rules as the rest (keyboard, contrast, no meaning by colour alone) in light and night, and the image viewer MUST give each image a text alternative made from its note or name.
- **FR-020**: In the Trades list, an account's name MUST be a link that shows the Trades list for that account (the same result as choosing the account in the list's account chooser, keeping the other filters the owner has set). This is a small convenience the owner asked for while this feature was drafted; it changes no figure.

### Key Entities

- **Attachment (screenshot)**: an image belonging to one trade: its stored bytes, its type, its size, a display name, an optional note, and when it was added. It is never shared between trades and is deleted only by the owner removing it.
- **Trade**: unchanged; it gains a count of attachments for display and for agents.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From a screenshot on the clipboard to the image attached on an open trade takes one action (Ctrl+V), and the image is visible in under 2 seconds on this computer.
- **SC-002**: The owner can see a trade's screenshots from the daily review without leaving it, in no more than 2 actions from the day's page (open the trade's drawer, open an image).
- **SC-003**: Every refused file (a PDF, an SVG, a script renamed as an image, an over-size image, an eleventh image) is refused with a message that names the reason, in 100% of the cases tried.
- **SC-004**: A request for an image without a signed-in owner session, or with an agent token, is refused in 100% of the cases tried, and no image is ever returned to an agent.
- **SC-005**: Adding and removing an image each write exactly one audit entry, and no entry holds image data or a note.
- **SC-006**: After the journal is stopped and started again, every image is still on its trade, identical to what was added; and when the image storage is unreachable, adding an image fails with a plain message and changes nothing.
- **SC-007**: Opening the Trades list of 5,000 trades, and the daily review of a day, stays within the one-second budget the journal already meets, with attachments in place.
- **SC-008**: No image data, note or token appears in a log, a screenshot of the test run or an error message (the existing secret and content checks cover it).

## Assumptions

- The owner is the only person; every image belongs to a trade of the owner's journal and is seen only by the owner.
- Limits are **5 MB per image and 10 images per trade**. They are a reasonable default for chart screenshots (a full-screen PNG is typically well under 2 MB) and can be changed later by a recorded decision.
- Images are stored as they were added, with no resizing, compression or thumbnails made from them in the first version, except that the screens show them scaled to fit. If the journal grows heavy with images, thumbnails are a later change.
- There is no limit on the total number or size of images in the journal in this feature; 10 images on every one of 5,000 trades would be large, which the owner does not expect. A total limit and a storage figure are a later change if it ever matters.
- Attachments are on **trades only** in this feature; the daily review, the weekly review and focus texts do not take images.
- Pasting from the clipboard needs a browser that allows it (all current desktop browsers do on the address the journal is served from); choosing and dropping a file are always available.
- An image is not part of any figure: a trade's results, plan answer and mistakes are exactly what they were. Images are evidence for the owner reading the trade, not data the journal computes from.
- The pictures are not covered by the host's backup of the database. The object store has no backup yet either (infra/seaweedfs says so); until one is set up, a picture lost with the object store is lost. This feature does not add a backup of its own, and the owner is told so in the hand-over.
- Agents read only the names, notes, types and sizes of images; a future feature may let an agent look at an image on request, with its own token cost decision (constitution II).

## Open questions

None. The three questions raised by the wireframes were answered on 2026-10-25 (see Clarifications). The one question marked when this spec was written (how the image files leave the journal) was answered on 2026-10-25: the export lists each image by id, details and address, any one image can be downloaded, and the database backup is the complete copy (FR-016).

## Wireframes

The greyscale wireframes of this feature are listed in [screens.md](screens.md). They are a draft until the owner signs them off.

Questions raised by the draft, for clarify:

1. Should a picture's note be editable straight from the large viewer, or only from the trade's edit screen? (Drawn read-only in the viewer.)
2. In the daily review drawer, should the pictures be small in a row, or large and one under another, because the owner reads the chart while judging?
3. Should the image count in the Trades list be a link to the trade's pictures, or a plain number? (Drawn plain.)

## Signed-off wireframes

The wireframes in `screens.md` were signed off by the owner on 2026-10-26 (confirmed again the same day after the analysis added one edge case and one message) for structure, content, states and behaviour. Plan, tasks and implementation MUST honour them. The look is not signed off here: it follows the project's approved visual direction and passes a visual review after implementation (constitution principle V). Any change to an interface covered here MUST update `screens.md` and its Penpot frames in the same change.
