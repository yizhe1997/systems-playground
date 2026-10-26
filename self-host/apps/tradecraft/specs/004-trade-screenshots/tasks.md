---

description: "Task list for 004-trade-screenshots (images on trades: attach, see, remove, safe and recorded)"
---

# Tasks: Trade Screenshots

**Input**: Design documents from `specs/004-trade-screenshots/` (spec, plan, research, data-model, contracts, quickstart, signed-off wireframes)

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/openapi.yaml and contracts/mcp-tools.md, and features `000` to `003` as built (trades, the review drawer, the owner gate, the audit log, the agent tools) plus the list polish and the deployment of 2026-10. Nothing is taken from Tradecraft v1.

**Tests**: included, because the constitution requires tests with the feature (domain logic and API against a real Postgres, the interface in a real browser). Test-first is not required.

**Changed 2026-10-26**: the pictures are objects in the owner's SeaweedFS bucket, not a column (research.md section 1). Tasks T004, T005, T012, T019 and T033 were built that way: no `data` column; `internal/objects` (S3 client) and `api.WithObjects`; image routes answer 503 when `S3_ENDPOINT` is unset; the compose files carry a throwaway SeaweedFS for development and tests and the deploy workflow maps `S3_*` from Infisical.

**Organization**: grouped by user story in the order the work should be built: setup, the foundation every story needs (the table, the byte checks, the audit kinds, the body limits), US1 (P1), US2 (P1), US3 (P2), US4 (P2), then polish. Paths are under `self-host/apps/tradecraft`. The migration is numbered `00017`.

## Gates before and around implementation

- **Implement gate:** `checklists/requirements.md` is ticked; no custom checklist has been generated (the owner may run `/speckit-checklist`).
- **Design gate (constitution V):** the visual direction was approved on 2026-10-04 and the screens were signed off on 2026-10-26 (spec hash `fff6ad66…5f3`). The `before_implement` direction check (`/speckit-screens-direction`) runs first.
- **Security gate (principle IV):** upload code is named by the constitution. T043 and T044 are the two local review passes; findings are fixed or recorded as accepted risk before the feature is called done.
- **After the last build task:** the visual review (T049) and the owner's approval of the look.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task serves (US1 to US4, from the spec)
- Words in quotation marks are constraints quoted from `data-model.md` or the contracts; keep them verbatim in code and tests.
- While building, run only the Go test files and Playwright specs a task touches; run the whole suite once at T047.

## Phase 1: Setup

**Goal**: write down the decisions and the security rows before code, so the build has something to answer to.

- [X] T001 [P] Add the dated decisions of `research.md` (sections 2 to 11) to `docs/decisions.md`: the details live in `trade_image` and the pictures in the owner's SeaweedFS bucket (reversed from the database on 2026-10-26); a raw request body, not multipart; bytes stored as sent (no re-encoding); content judged by its bytes (PNG, JPEG, WebP only, WebP by structure); served with `nosniff` and a sandbox policy from the app's own origin; the count checked under a lock on the trade; `BodyLimit` raised to 6 MiB with a 64 KiB cap on every other route; the display name cleaned and defaulted; two binary route handlers in the web tier instead of widening the JSON pass-through; the count is a link and the account name is a link; one read-only agent tool. (The 2026-10-25 decision row already exists; do not duplicate it.)
- [X] T002 [P] `docs/security-review.md`: add findings rows G-16 a file that is not an image stored as one (a script, a page, an SVG), G-17 an image served so that a browser runs it, G-18 the image route reached without the owner's session or with an agent token, G-19 a decompression or size abuse (a tiny file declaring a huge picture, a body over the limit), G-20 content leaking into a log, an audit row or an error, G-21 the limits raced (two adds taking the last place), each with its control and the test that proves it left blank until T045.
- [X] T003 [P] `scripts/check-loopback.sh`: also fail if the bytes or the note of the test run's images appear in a tracked file or a container log (the Playwright specs write a marker string into one image's note and the file's bytes carry a marker; the script reads `${TMPDIR:-/tmp}/tradecraft-e2e-image-marker.txt` outside the repository when it exists, as it does for the agent token).

**Checkpoint**: the decisions and the review rows are written.

## Phase 2: Foundational (blocks every story)

**Goal**: the table, the byte checks, the limits and the audit kinds, with their tests, before any route uses them.

- [X] T004 Migration `backend/migrations/00017_trade_image.sql` exactly as data-model.md: table `trade_image` with "`id uuid PRIMARY KEY DEFAULT gen_random_uuid()`", "`trade_id uuid NOT NULL REFERENCES trade (id) ON DELETE CASCADE`", "`name text NOT NULL`" with a check of 1 to 100 characters and no control characters, "`note text NOT NULL DEFAULT ''`" with "`char_length(note) <= 200`", "`content_type text NOT NULL`" with "`CHECK (content_type IN ('image/png','image/jpeg','image/webp'))`", "`size_bytes integer NOT NULL`" with "`CHECK (size_bytes BETWEEN 1 AND 5242880)`", "`created_at timestamptz NOT NULL DEFAULT now()`"; index on "`(trade_id, created_at, id)`"; a `-- +goose Down` that drops the table.
- [X] T005 `backend/queries/images.sql` and regenerate `backend/internal/store/` with sqlc the way feature 003's T007 did (the `sqlc/sqlc` Docker image): `ListTradeImages` (ordered "`created_at, id`"), `GetImageMeta` (the details; the picture is fetched from the bucket by id), `InsertImage`, `UpdateImageNote`, `DeleteImage`, `CountTradeImages`, `LockTradeForImages` (`SELECT id FROM trade WHERE id = $1 FOR UPDATE`), `ImageCountsForTrades` (trade id and count for a set of ids). Add `image_count` to `backend/queries/trades.sql`'s `ListTrades` and `GetTrade` (an indexed count) and to the trade queries the daily review and the judgement use; regenerate `backend/internal/store/`.
- [X] T006 [P] `backend/internal/api/imagecheck.go`: `checkImage(body []byte) (contentType string, err)` implementing research section 3: PNG starts `89 50 4E 47 0D 0A 1A 0A`, `image.DecodeConfig` succeeds and the body ends with the IEND chunk `00 00 00 00 49 45 4E 44 AE 42 60 82` (`DecodeConfig` reads only the header and cannot see trailing bytes); JPEG starts `FF D8 FF`, `image.DecodeConfig` succeeds and the last two bytes after trimming trailing `00` padding are `FF D9`; WebP is a RIFF container ("`RIFF`", a size that matches the body, "`WEBP`") whose first chunk is "`VP8 `", "`VP8L`" or "`VP8X`"; for PNG and JPEG no side over "16,384" pixels and no more than "64,000,000" pixels; everything else (SVG, GIF, PDF, HTML, a script, an empty body, trailing bytes) is the error `image_not_allowed` with the message "Only PNG, JPEG and WebP images are allowed."; the type returned is decided from the bytes, never from the request. Also `cleanName(raw string, now time.Time, loc *time.Location) string`: path parts dropped, control characters and characters that could break a header or a file name removed, runs of spaces collapsed, at most "100" characters, and when empty "Screenshot " plus `now` in `loc` formatted `2 Jan 2006 15:04`.
- [X] T007 [P] `backend/tests/imagecheck_test.go`: a matrix of real tiny images (a 1x1 PNG, JPEG and WebP built in the test) accepted with the right type; refused: an SVG, a GIF, a PDF, an HTML page, a script, an empty body, a PNG with trailing bytes, a PNG whose header declares "20,000" by "20,000", a JPEG cut short, a WebP with a wrong RIFF size, a text file named `x.png`; the stored type ignores the claimed type; `cleanName` cases (path, control characters, long name, empty, spaces, a header-breaking character).
- [X] T008 `backend/internal/api/audit.go`: add the two kinds to `auditKinds` ("`attachment_added`", "Attachment added") and ("`attachment_removed`", "Attachment removed"); no migration. `backend/internal/api/images.go` (new, constants only for now): `maxImageBytes = 5 << 20`, `maxImagesPerTrade = 10`, `maxNoteChars = 200`, `maxNameChars = 100`.
- [X] T009 `backend/internal/api/server.go`: set `BodyLimit` to "6 MiB" and add a middleware, registered before the owner gate, that answers `413` with the standard error body and code `too_big` to any request whose body is over "64 KiB" on every route **except** `POST /trades/:id/images` (the agent door's requests are small and are not affected). Add a Go test in `backend/tests/body_limit_test.go`: a 100 KiB JSON body to `PUT /settings` is `413`; the existing JSON routes still work; a 5 MiB body is accepted on the image route (after T012).

**Checkpoint**: the table exists, the checks and their tests pass, the limits are in place. No route yet.

## Phase 3: User Story 1 - Attach a screenshot to a trade (Priority: P1) 🎯 MVP

**Goal**: add an image by paste, choose or drop on a trade's edit screen and on a new trade; see it as a small picture with a note box.

**Independent test**: open a trade, paste a screenshot, see it, reload and see it still there; add a second by choosing a file; both are listed in the order added; each refusal of the spec is shown with its message.

### Tests for User Story 1

- [X] T010 [P] [US1] `backend/tests/images_test.go`: "add stores the image and answers it" (type from the bytes, cleaned name, default name, `201`); the validation matrix of T007 through the route (`422` `image_not_allowed`, nothing stored); "an over-size body is `413` `image_too_big`" and "an eleventh image is `409` `image_limit`", each leaving nothing changed; "two adds at the same moment when nine exist: exactly one succeeds" (run twenty goroutines); "a trade that does not exist is `404`"; "works on a deleted trade and on a trade of an archived and of a Backtest account"; "the list is in the order added with the limits `maxBytes`, `maxCount`, `maxNoteChars`"; "a trade's images survive a stop and start" is covered by T040.
- [X] T011 [P] [US1] `frontend/e2e/us10-trade-images.spec.ts` (first part): paste via a synthetic `ClipboardEvent` carrying a `File` attaches an image and inserts no text, also with the cursor in the thesis box; choose a file with `setInputFiles`; drop with a `DataTransfer`; each refusal shows its message ("Only PNG, JPEG and WebP images are allowed.", "That image is 7.4 MB. The limit is 5 MB.", "This trade already has 10 images. Remove one to add another."); a new trade keeps pasted images "waiting" and stores them on Save trade, and stores nothing when the owner leaves; a second image is listed after the first; reload keeps both; from a pasted screenshot to the picture visible takes under 2 seconds (SC-001); a 4.9 MB image goes through the web tier and is stored (the request-body buffering of the web tier does not cut it); a new trade whose image upload fails after the trade was saved lands on its edit screen with "1 image was not added. Add it again here.". Images are tiny files made in the spec; one note carries the marker string of T003.

### Implementation for User Story 1

- [X] T012 [US1] `backend/internal/api/images.go`: handlers `listTradeImages` (`GET /trades/:id/images`, answers `{items, limits}` as in the contract, no bytes, `404` for an unknown trade) and `addTradeImage` (`POST /trades/:id/images?name=`): read the raw body, `checkImage`, `cleanName` with the journal time zone, then in one `inTx`: `LockTradeForImages`, "`CountTradeImages` must be below `maxImagesPerTrade`" else `409` `image_limit` with "This trade already has 10 images. Remove one to add another.", `InsertImage`, `writeAudit` kind `attachment_added` with `tradeSubject(...)` and no fields. A body over "`maxImageBytes`" is `413` `image_too_big` with "That image is %s. The limit is 5 MB." (the size in MB, one decimal). Register both routes in `server.go` behind the owner gate.
- [X] T013 [P] [US1] `frontend/src/lib/types.ts` (`TradeImage`, `TradeImages`, `Trade.imageCount`) and `frontend/src/lib/imageLimits.ts` (the limits come from the API's answer; helpers `megabytes(n)` and the three messages as constants).
- [X] T014 [US1] `frontend/src/app/api/trades/[id]/images/route.ts`: `POST`, same-origin only (`isSameOrigin`), session required, refuse a `Content-Length` over "5 MiB + 1 KiB" with `413`, read the body as bytes while counting (refuse over "5 MiB"), forward to the API with the owner's service token, the `name` query and the request's `Content-Type`, and pass the answer's status and JSON back. Also `GET` for the list (`/api/trades/{id}/images`, JSON). Never put the body in a log.
- [X] T015 [US1] `frontend/src/components/TradeImages.tsx` (C1): the section titled "Images" with the help line, the drop area "Paste a screenshot (Ctrl+V), choose a file, or drop one here.", "Choose a file", the count "3 of 10 images", each picture (small, `alt` from its note or name), its name, a note field "Note (optional)" with the hint "For example: Entry, 5 min chart" (limit "200" characters), Open and Remove (Remove wired in T027), the messages of the content list, and "Adding…". Paste: a `paste` listener on the form that takes the first image in `clipboardData.files`, attaches it and calls `preventDefault` **only** when an image is present. Choose: a file input with `accept="image/png,image/jpeg,image/webp"`. Drop: `dragover` and `drop` on the section. On an existing trade each image is uploaded at once. On a new trade the files are held in memory with a blob preview marked "Waiting for Save" and a line "Images added here are saved with the trade when you press Save trade." Expose `pending: File[]` and an `uploadPending(tradeId)` to the form.
- [X] T016 [US1] `frontend/src/components/TradeForm.tsx` and `frontend/src/app/trades/[id]/edit/page.tsx`: mount `TradeImages` below "Why I took it (thesis, optional)" with `id="images"`; load the trade's images for the edit screen; after a new trade is created call `uploadPending(id)` one image after another, and when one fails go to the trade's edit screen with a message that names the images not yet added ("2 images were not added. Add them again here."); the form's unsaved-changes guard counts pending images. The section's own adds do not change the trade's other fields and do not touch its "out of date" protection.

**Checkpoint**: US1 works by itself. Stop and look at C1 in the browser.

## Phase 4: User Story 2 - See the screenshots where the trade is looked at (Priority: P1)

**Goal**: the images are shown in the review drawer, open large in a viewer, and the Trades list shows a count that links to them; the account name links to that account's trades.

**Independent test**: attach two images; open the daily review's drawer for the trade, see both with their notes, open one large, step to the other, close with Escape; the Trades list shows 2 as a link to the edit screen's Images section.

### Tests for User Story 2

- [X] T017 [P] [US2] `backend/tests/images_test.go` (more): "an image is served by its address with the stored type, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; sandbox`, `Cache-Control: private, max-age=3600` and `Content-Disposition: inline`"; "`?download=1` is `attachment` with a safe file name"; "an unknown or removed id is `404`"; "`imageCount` is on `GET /trades` and `GET /trades/:id`, the day's trades and the judgement's trade, 0 when none".
- [X] T018 [P] [US2] `frontend/e2e/us10-trade-images-views.spec.ts`: the review drawer lists a trade's pictures in a row with their notes and shows nothing when there are none; selecting a picture opens the viewer ("Image 2 of 3", Previous and Next; from the review drawer Escape closes the viewer and leaves the drawer open, then focus is on the picture; Esc on the page closes it and focus returns to the picture, left and right arrows change image, an `alt` on each picture); the Trades list shows the count (nothing when none) as a link to `/trades/{id}/edit#images`, which lands on the section; an account name is a link that shows that account's trades and keeps the filters (range, deleted, backtests, page size); axe finds nothing on the viewer.

### Implementation for User Story 2

- [X] T019 [US2] `backend/internal/api/images.go`: `getImage` (`GET /images/:id`): `GetImage`, `404` when absent, the headers of the contract (type from the stored value only), `?download=1` as `attachment` with a file name made safe for a header (ASCII fallback plus the RFC 5987 `filename*`). Register behind the owner gate. `backend/internal/api/trades.go` (and the day and judgement JSON): `imageCount` in `tradeJSON`.
- [X] T020 [US2] `frontend/src/app/api/images/[id]/route.ts`: `GET` (session required; no same-origin check for a read, like the rest of the reads), forward to the API and return the bytes with **its** `Content-Type`, `X-Content-Type-Options`, `Content-Security-Policy`, `Cache-Control` and `Content-Disposition` unchanged, streaming the body; any other status passes through as JSON. Also `PUT` and `DELETE` are added in T026 and T027.
- [X] T021 [US2] `frontend/src/components/ImageViewer.tsx` (C2): the existing `Dialog` with the image's name as title, the large picture (`alt` from the note or name), Previous and Next (not shown for one image), "Image 2 of 3", Download (a link to `?download=1`), Remove (T027), Close, the line "Esc closes. Left and right arrows change image.", focus returned to the picture that opened it. The viewer is a second native modal over the page or over the review drawer: **Escape closes only the viewer** (the drawer stays open) and focus returns to the picture that opened it, whichever dialog is behind it. The note field is added in T026.
- [X] T022 [US2] `frontend/src/components/JudgeButton.tsx` (C4): load the trade's images with the judgement (`GET /api/trades/{id}/images`), show the "Images" section as a row of small pictures with their notes between the trade's facts and the questions, and nothing when there are none; selecting a picture opens `ImageViewer`.
- [X] T023 [US2] `frontend/src/components/TradesTable.tsx` and `frontend/src/app/trades/page.tsx` (C5): the "Images" column (heading help "How many screenshots this trade has."), the count as a plain server-rendered link `<a href="/trades/{id}/edit#images">` (nothing when 0), and each account name as `<a>` to `/trades?` built from the page's own filters with `account` set to that account (a `accountHref(accountId)` helper passed down from the page; range, deleted, backtests, size kept; page reset). Add `images` to the column keys of the `ReorderTable` (`id="trades"`), after `r`, so the saved column order still works (unknown keys are appended).

**Checkpoint**: US1 and US2 work together. Stop and look at C2, C4 and C5.

## Phase 5: User Story 3 - Remove or describe a screenshot (Priority: P2)

**Goal**: change an image's note (on the edit screen and in the viewer) and remove an image after a confirmation; deleting a trade keeps its images.

**Independent test**: attach an image, edit its note, remove it with the confirmation, see it gone everywhere.

### Tests for User Story 3

- [X] T024 [P] [US3] `backend/tests/images_test.go` (more): "a note is saved trimmed, at most 200 characters, `422` over, an empty note allowed"; "remove deletes the row and its bytes (the id then answers `404`) and writes one `attachment_removed` entry in the same transaction"; "removing an unknown id is `404`"; "a trade deleted and restored keeps every image as it was"; "editing a note writes no audit entry".
- [X] T025 [P] [US3] `frontend/e2e/us10-trade-images.spec.ts` (second part): edit a note on the edit screen and in the viewer (saved when the field is left, shown everywhere); Remove asks "Remove this image?" with the body quoting the name and "It cannot be brought back."; Cancel changes nothing; Remove deletes it and shows "Image removed."; delete a trade, show deleted, restore it: the images are back.

### Implementation for User Story 3

- [X] T026 [US3] `backend/internal/api/images.go`: `updateImageNote` (`PUT /images/:id`, `{note}`: trimmed, "at most 200 characters" else `422` with the field message "A note can be at most 200 characters.", `404` when absent, no audit entry) and register it. `frontend/src/app/api/images/[id]/route.ts`: `PUT` (same-origin, JSON). The note fields of `TradeImages.tsx` and `ImageViewer.tsx` save on blur and show a failure as the section's message.
- [X] T027 [US3] `backend/internal/api/images.go`: `removeImage` (`DELETE /images/:id`: in one `inTx` read the image's trade, `DeleteImage`, `writeAudit` kind `attachment_removed` with the trade's subject; `404` when absent; `204`). `frontend/src/app/api/images/[id]/route.ts`: `DELETE` (same-origin). `frontend/src/components/ImageViewer.tsx` and `TradeImages.tsx` (C3): the confirmation dialog "Remove this image?" with the body ""<name>" will be deleted from the journal. It cannot be brought back." and the buttons "Remove image" and "Cancel", the notice "Image removed.", focus returned sensibly.

**Checkpoint**: US1 to US3 work. Stop and look at C1 to C5 as a whole.

## Phase 6: User Story 4 - Safe, recorded and exportable (Priority: P2)

**Goal**: only the owner can fetch an image, nothing executes, add and remove are in the audit log, the export lists every image, and an agent sees names and notes only.

**Independent test**: signed out, an image's address is refused; an agent token is refused; add and remove are two audit entries with no content; the export lists the image; `list_trade_images` returns details and no bytes.

### Tests for User Story 4

- [X] T028 [P] [US4] `backend/tests/images_gate_test.go`: no token on `GET /images/:id`, `GET` and `POST /trades/:id/images` is the gate's usual `401`; an agent token on each is refused with the owner routes' refusal (extend the existing "an agent token is refused by every owner route" list); a service token is refused by `/mcp` as before; `/images/:id` with a method it does not have is `404` or `405` like other routes.
- [X] T029 [P] [US4] `backend/tests/images_audit_test.go`: add and remove write exactly one entry each, kind and label as in data-model.md, subject = the trade named as the log names it, **no** changed fields, and no byte, name or note anywhere in the row; an add that fails (limit, not an image) writes nothing; the entry and the image stand or fall together (force the audit insert to fail with a trigger as the 003 tests do and see nothing stored).
- [X] T030 [P] [US4] `backend/tests/images_export_test.go` and the export test: the export's `images` array lists every image of every trade with "`id`, `tradeId`, `name`, `note`, `contentType`, `sizeBytes`, `createdAt`, `path`" where `path` is "`/api/images/{id}`", carries no bytes, and the existing export keys are unchanged.
- [X] T031 [P] [US4] `backend/tests/mcp_test.go`: the real SDK client lists ten tools including `list_trade_images`; `list_trade_images` returns details for one trade and no bytes, writes one `agent_read` entry naming the tool and the trade, and an unknown trade is a tool error; `list_trades` and `get_day` carry `imageCount`; the tool-count assertions of 003 are updated from nine to ten.
- [X] T032 [P] [US4] `frontend/e2e/us10-trade-images-safety.spec.ts`: signed out (no cookie), `/api/images/{id}` is refused like a private page; the served response has `nosniff` and the sandbox policy; a text file named `x.png` and an SVG are refused in the browser flow; an image shows inside a page of the app (an `<img>`), and the same address opened on its own shows only the picture, never markup or a running script; the Playwright output, trace and screenshots contain no marker string of T003 beyond the page itself.

### Implementation for User Story 4

- [X] T033 [US4] `backend/queries/export.sql` and `backend/internal/api/export.go`: `ExportImages` (every column; the picture is not a column) and an `images` array in the export body as in T030, in the order "created_at, id"; the existing keys and order stay.
- [X] T034 [US4] `backend/internal/api/mcp.go`: the tool `list_trade_images` (argument `tradeId`) wrapping `GET /trades/:id/images` through `s.read(...)` and returning the owner's answer as it is (the `limits` in it are harmless to an agent); its description says it lists details only and that an image's bytes cannot be fetched by an agent. `backend/internal/api/trades.go` already carries `imageCount` (T019). Update `specs/004-trade-screenshots/contracts/mcp-tools.md` only if the final shape differs.
- [X] T035 [US4] `frontend/src/app/audit/page.tsx` and `frontend/src/components/AuditFilters.tsx`: nothing to change if the kinds list comes from `GET /audit/kinds` (confirm it does, and that the two new labels appear in the "What" filter and the table); if the page lists kinds anywhere in code, add them.
- [X] T036 [US4] `scripts/check-persistence.sh`: also count images and a checksum of their bytes before and after the stop and start (a query through the API's list and a download of each image through the owner route with the test session), so SC-006 is proven by the script as for trades.

**Checkpoint**: all four stories work. The security pass follows in Phase 7.

## Phase 7: Polish and cross-cutting

- [X] T037 [P] Accessibility: `frontend/e2e/zz-a11y-images.spec.ts` (axe WCAG 2 A and AA including 4.5:1 contrast) on C1 in its six states, C2, C3, C4, C5 and C6 in light and night; keyboard-only checks: paste, choose and drop reachable (the file chooser by keyboard), the viewer (focus trapped, Esc, arrows, focus returned), the confirmation, the drawer's pictures reachable and named, the Trades list links reachable.
- [ ] T038 [P] Penpot and `screens.md`: check that the frames L1 (Images column, links), S2 (Images row) and L2 (Images section) match what T015, T022 and T023 built (export them and compare); record any wording that changed during the build under "Content added after sign-off" in `screens.md`, and update the frames in the same change (constitution V).
- [X] T039 [P] `frontend/e2e/zz-screens-images.spec.ts` (capture only, behind `CAPTURE_SCREENS`): every frame of C1 to C6 in light and night to `CAPTURE_DIR` outside the repository, for the visual review; uses tiny generated images only.
- [X] T040 [P] Scale and persistence: add to `frontend/e2e/zz-scale.spec.ts` the Trades list of 5,000 trades and a day's review with a few images attached stay under the existing one-second budget (SC-007); run `scripts/check-persistence.sh` with images present (T036).
- [X] T041 [P] `README.md`: a "Screenshots" section (what it is, paste with Ctrl+V, the limits, that the export lists images but the pictures are in the bucket, that an agent sees names only) and a line in "Where things are" for `specs/004-trade-screenshots/`. `docs/domain.md` needs no change (no rule changes): say so in the decisions row.
- [X] T042 `scripts/test.sh` and `scripts/check-loopback.sh`: confirm the secret check runs on the whole suite's logs and reads the marker file of T003; no new variable is needed in `.env`.
- [X] T043 **Local review pass 1 (principle IV):** review `backend/internal/api/{images,imagecheck,server,audit,export,mcp}.go`, `00017_trade_image.sql`, the two web-tier route handlers and `TradeImages.tsx` / `ImageViewer.tsx` for: any way a non-image or an active image (SVG, script, page) is stored; any way the served response can be rendered as anything but a picture (type, sniffing, disposition, CSP, caching of a removed image); a route reachable without the owner's session or with an agent token; size, count and dimension limits holding under concurrency and with a lying `Content-Length`; the 6 MiB body limit not weakening other routes; the cleaned name reaching a header or a file name; any image byte, name or note in a log, an audit row, an error body, a trace or a screenshot; the pending images of a new trade; the same-origin check on every change. Fix or record each finding.
- [X] T044 **Local review pass 2:** repeat T043 on the code as fixed and on the migration (the checks, the storage setting, the Down step), and confirm each finding is closed. Repeat after any later material change.
- [X] T045 `docs/security-review.md`: fill G-16 to G-21 with the control, where it lives and the test that proves it; record the accepted risks of research section 12 (WebP by structure, no total limit, no bytes in the export, no backup yet, removal is final) with their end points; add the review passes to the table.
- [X] T046 `docs/decisions.md`: add each decision made during the build with its date and reason (constitution VIII).
- [ ] T047 Run `./scripts/test.sh` once on the composed stack (every Go test and every Playwright spec of features 000 to 004, the accessibility pass, the scale timings, the loopback, secret and persistence checks) and record the results, including any failure, in `specs/004-trade-screenshots/verification.md`.
- [X] T048 Rebuild the development stack (`docker compose up -d --build frontend backend`) so the owner can try paste with a real screenshot on `http://127.0.0.1:3101`.
- [X] T049 Visual review (`/speckit-screens-review`): compare the built C1 to C6 and the changed L1, L2 and S2 with the Penpot frames in a real browser in both modes, run the design critique and audit, and record the owner's decision on the look in `screens.md`.

## Dependencies and order

- Phase 1: T001 to T003 in parallel.
- Phase 2: T004, then T005; T006 and T007 in parallel with T004 and T005; T008 after T005; T009 after T008 (its image-route test waits for T012).
- US1 (T010 to T016): T012 after T005, T006, T008, T009; T013 anytime; T014 after T012; T015 after T013 and T014; T016 after T015; T010 and T011 alongside.
- US2 (T017 to T023): T019 after T012; T020 after T019; T021 after T020; T022 and T023 after T021 (T023 needs only T019); tests alongside.
- US3 (T024 to T027): T026 and T027 after T019; the UI parts after T021.
- US4 (T028 to T036): T033 and T034 after T012; T035 and T036 after the stories; tests after their routes.
- Polish: T037 to T042 after the stories; T043 after them; T044 after T043's fixes; T045 and T046 after T044; T047 after T046 (so the suite runs on the reviewed code); T048 after T047; T049 last.

## Parallel examples

```text
Phase 1:  T001 T002 T003 together.
Phase 2:  T006 T007 beside T004 T005; then T008, T009.
US1:      T010 T011 T013 while T012 is written; then T014, T015, T016.
US2:      T017 T018 while T019 to T021 are written; then T022 T023 together.
US3:      T024 T025 together, then T026 and T027.
US4:      T028 T029 T030 T031 T032 together; T033 T034 together.
Polish:   T037 T038 T039 T040 T041 T042 together.
```

## Implementation strategy

1. Phase 1 and the foundation (T004 to T009): the table, the byte checks and the limits, proven by their tests before any route exists.
2. **US1 alone** is the MVP: the owner can paste a screenshot onto a trade and see it. Stop and look at C1 in the browser.
3. US2 (the images where the trade is judged, the list links), then US3 (remove and describe), then US4 (the gate tests, export and the agent tool), then Phase 7: the two review passes, the full suite once, the visual review.

## Notes

- FR-018 (nothing existing changes) has no task of its own: the whole suite of T047 is its proof.
- Images are stored exactly as sent and are never re-encoded; no image library runs on untrusted bytes beyond the standard library's header decode.
- The export lists images but carries no bytes: a written exception to constitution VII until the owner wants a one-step export of the files.
- An agent can read an image's details and never its bytes; the owner gate already refuses an agent token on the image route and T028 keeps proving it.
