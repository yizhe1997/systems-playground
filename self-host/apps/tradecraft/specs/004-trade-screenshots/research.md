# Research: Trade Screenshots

Decisions taken while planning, with the alternatives and why. Nothing is carried over from Tradecraft v1 (its module inventory lists the image gallery as "not started"); what is reused from this project is named in section 1.

## 1. What is reused

- Feature 002's owner gate on every route, the audit helper (`writeAudit` inside `inTx`), `tradeSubject` for how the log names a trade, `isSameOrigin` and the session reader in the web tier.
- Feature 003's agent tool pattern (`s.read(...)` wrapping an owner handler) and the rule that an agent token is refused by every owner route (so it cannot open an image).
- The existing `Dialog` component, Base UI Menu and the 10-second Undo toast pattern are **not** used for removal: removal is final, so it has a confirmation (spec FR-010).

## 2. Where the bytes live, and how the API takes them

**Decision (changed 2026-10-26)**: a table `trade_image` holds each image's details; the bytes are an object in the owner's SeaweedFS bucket (`tradecraft-images`, made on first use) under the row's id, reached over the S3 API at the public address (`S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`; the same shared key as the other apps, a bucket of its own). Order of events: inside the transaction that holds the trade's row lock, the row is inserted and the object stored; a failed store rolls the row back, a failed commit deletes the object. A removal deletes the row, then the object after the commit (a failure leaves an unreferenced object, logged, never a row without its picture). The API takes an image as the **raw request body** of `POST /trades/{id}/images?name=...` with the image's own `Content-Type`, not as multipart form data. The bytes are stored exactly as sent.

**Why**: first decided as the database (2026-10-25), reversed by the owner on 2026-10-26 because the images will accumulate over the years, which an object store handles and a database backup should not carry. A raw body needs no multipart parser (a classic source of upload bugs), the size is the body's size (one number to cap), and the web tier forwards bytes untouched. Not re-encoding means a screenshot is never altered and no image library runs on untrusted bytes.

**Alternatives**: the database itself as a `bytea` column (the first decision: one backup covers everything, no new secret; reversed because of growth); Postgres large objects (rejected: awkward in sqlc and in backups); multipart (rejected: more code for no benefit here); re-encoding or resizing (rejected: alters the owner's evidence, needs a decoder, and a decoder on hostile input is a larger attack surface).

**Storage detail**: the client is `minio-go` (path-style addressing, region `us-east-1`); the endpoint is the public S3 address through the tunnel (`https://s3.<HOST>`), so the journal depends on the tunnel and SeaweedFS being up to add or show a picture (everything else works without them: with `S3_ENDPOINT` unset the image routes answer 503). Development and the tests run a throwaway `weed mini` in the compose stack.

## 3. What counts as an allowed image (FR-002)

**Decision**: judge the bytes, never the name or the claimed type.

- **PNG**: starts with `89 50 4E 47 0D 0A 1A 0A`, `image.DecodeConfig` (standard library, which reads only the header) succeeds with a width and height in range, **and** the body ends with the IEND chunk (`00 00 00 00 49 45 4E 44 AE 42 60 82`), so a file with anything after the image is refused.
- **JPEG**: starts with `FF D8 FF`, `image.DecodeConfig` succeeds in range, **and** the last two bytes (after trimming trailing `00` padding) are `FF D9`, the end-of-image marker.
- **WebP**: a RIFF container (`RIFF`, a size that matches the body, `WEBP`) whose first chunk is `VP8 `, `VP8L` or `VP8X`. Dimensions are not parsed for WebP (no new dependency); the size cap bounds it.
- **Range**: no side over 16,384 pixels and no more than 64 million pixels (PNG and JPEG), so a tiny file that expands to a huge picture cannot be stored to hurt the owner's own browser.
- **Everything else is refused**, including SVG, GIF, PDF, HTML, a script, an empty body, and a real image with trailing bytes that do not belong (checked for PNG and JPEG by their end markers, for WebP by the RIFF size).
- The stored `content_type` is **set by the server from what the bytes are**, so a mismatched request type is ignored (refused only when the bytes are not an allowed image).

Note: `DecodeConfig` alone cannot see trailing bytes, which is why the end markers are checked explicitly.

**Alternatives**: trust `Content-Type` or the extension (rejected: the exact attack); `net/http.DetectContentType` alone (rejected: it recognises GIF and others, and says nothing about well-formedness); decode the whole image to prove it (rejected: executes a decoder over the whole hostile body for little gain; the browser decodes it anyway and is sandboxed by the serving headers).

## 4. Serving an image so it can only be displayed (FR-012, FR-013)

**Decision**: `GET /images/{id}` returns the stored bytes with `Content-Type` from the stored (server-decided) type, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; sandbox`, `Cache-Control: private, max-age=3600` (an image never changes once added, a removed one answers 404), and `Content-Disposition: inline`. With `?download=1` it is `attachment` with a safe file name. The web tier's route handler passes those headers through unchanged and adds nothing the browser could reinterpret.

**Why**: the three formats are inert as images, `nosniff` stops a browser guessing another type, and the sandboxed policy means even a mistake (a script served as an image) would run with no origin and no permissions. The image is served from the app's own origin, which the page's CSP already allows (`img-src 'self' blob: data:`); no CORS and no new origin.

**Alternatives**: a separate origin for images (rejected: a second hostname for a single-owner app; the headers do the job); signed URLs (rejected: the owner's session is the credential, and there is no sharing).

## 5. Limits that hold under concurrency (FR-003)

**Decision**: the API checks size from the body, count inside the transaction that inserts: `SELECT … FROM trade WHERE id = $1 FOR UPDATE` (the same row lock as other trade changes), then `count(*)` of its images, then insert. Two adds at the same moment therefore cannot both take the tenth slot. The database repeats the limits as constraints (`size_bytes BETWEEN 1 AND 5242880`, `char_length(note) <= 200`, `size_bytes = octet_length(data)`), and a trigger-free per-trade count constraint is **not** used (a lock is simpler and correct).

**Body limit**: Fiber's `BodyLimit` is per app, not per route. It is raised to 6 MiB for the whole API, and a small middleware answers `413` to any request whose body is over 64 KiB on every route except the image upload, so the other routes keep their effective limit (they are JSON of a few KB). The web tier refuses an upload over 5 MiB by its `Content-Length` and while reading, before forwarding.

**Alternatives**: raise nothing and chunk the upload (rejected: complexity); streaming request bodies (rejected: fasthttp streaming loses the simple body-limit guard); a count trigger (rejected: harder to explain than a lock).

## 6. The display name and the note (FR-005)

**Decision**: the name is cleaned on the way in: path parts dropped, control characters and characters that could break a header or a file name removed, runs of spaces collapsed, at most 100 characters; empty after cleaning means "Screenshot " plus the date and time in the journal's time zone (`Screenshot 25 Oct 2026 09:41`). The note is text up to 200 characters, trimmed, may be empty, edited by `PUT /images/{id}`. Editing a note is **not** an audit row (spec FR-014 names add and remove; an audit row per keystroke-save would be noise; the note never reaches the log either way).

## 7. The pass-through, binary, and where each piece runs

**Decision**: the existing `/api/[...path]` handler stays JSON-only. Two route handlers are added under `/api` and take precedence over the catch-all by specificity: `POST /api/trades/{id}/images` (raw bytes in, JSON out) and `GET|PUT|DELETE /api/images/{id}`. Both read the session, check same-origin for any change, refuse over-size early, sign the service token and forward. Reads set no cookie and add no CORS.

**Why not extend the catch-all**: its job (and its tests, and its security review) is "structured data only"; widening it to binary would weaken a boundary that is easy to reason about today.

## 8. The count, and the agent (FR-008, FR-015)

**Decision**: the trade JSON gets `imageCount` (an indexed `count(*)` per listed page, or a left-joined aggregate), so the Trades list, the review drawer and the agent's trade reads all show it. A new read-only tool `list_trade_images(tradeId)` returns `[{id, name, note, contentType, sizeBytes, addedAt}]` and never bytes: the owner route it wraps returns metadata only, and the bytes route is a different route that an agent token cannot reach. The tool count goes from nine to ten and the tests that count tools are updated.

**Alternatives**: put image metadata inside every trade read (rejected: bigger answers for nothing); give an agent the bytes behind a flag (rejected by the owner: never; and it would be a token-cost and privacy decision for its own feature, constitution II).

## 9. Audit (FR-014)

Two kinds, `attachment_added` ("Attachment added") and `attachment_removed` ("Attachment removed"), subject = `tradeSubject(...)` (the way the log already names a trade), no changed fields, no name, no note. Written with `writeAudit` inside the same `inTx` as the insert or delete, so an image and its entry stand or fall together. The audit table needs no migration (kinds are a list in code).

## 10. The browser: paste, choose, drop, pending images (FR-001, FR-004)

**Decision**: a `paste` listener on the trade form attaches the first image in `clipboardData.files` and prevents the default (so no text is inserted) only when an image is present; plain text pastes as usual. Choose uses a file input restricted by `accept`, drop uses `dragover` and `drop` on the section. On a **new** trade the files are held in memory with a blob preview and uploaded one after another once the trade is created; if one upload fails the owner lands on the trade's edit screen with a message that names the images not yet added (the trade itself is already saved, as a trade without images is valid). On an existing trade each image is uploaded as soon as it is added (the section is its own small save, so Save changes is not needed and the existing "out of date" protection is unaffected).

**Alternatives**: one multi-part request carrying the trade and its images (rejected: couples two writes and doubles the failure cases); always upload at once even for a new trade (rejected: needs the trade id, so it would create a trade before Save, which breaks FR-004).

## 11. Viewer, drawer and list (FR-006 to FR-009, FR-020)

The viewer is the existing `Dialog` with a large `img`, a note field saved when it loses focus, Previous and Next, Download (a link to `?download=1`) and Remove (opens the confirmation). Each picture has an `alt` made from its note, else its name. The drawer reads the list with the judgement in the same request round. In the Trades list the count is a plain link to `/trades/{id}/edit#images` (an anchor on the section) and the account name is a link to the same list with `account` set and the owner's other filters kept; both are plain server-rendered links (a list of many rows must not hydrate a component per row, as the kebab already does).

## 12. Accepted risks and items for the owner

| Item | Why accepted | Ends |
|---|---|---|
| WebP is judged by structure, not decoded | No new dependency; the size cap and the serving headers bound what a malformed one can do | If a WebP decoder is ever added |
| No total storage limit; no thumbnails | One owner; a screen scales the full image | If the database grows heavy with images |
| An image's bytes are not in the JSON export | The owner's decision; the pictures are in the bucket, readable with any S3 tool | When a one-step export of the files is wanted |
| Neither the database nor the object store has a backup yet | Parked by the owner; images are not covered by the database backup | Before the owner relies on the journal |
| An upload that dies between the object store and the commit, or a failed delete, can leave an unreferenced object | Harmless (nothing refers to it) and logged | If the bucket grows by objects with no row: add a sweep that lists the bucket against the table |
| Removing an image is final | The owner confirms first; a trade's other data is untouched | Not planned to change |

## 13. Verified before planning

- The Fiber app's `BodyLimit` is 1 MiB today (`server.go`), so an upload needs the change in section 5.
- The browser pass-through only accepts `application/json` bodies (`app/api/[...path]/route.ts`), so the upload needs its own handler (section 7).
- The CSP set in `proxy.ts` already allows `img-src 'self' data: blob:`, so no policy change is needed for same-origin images or blob previews.
- The owner gate refuses an agent token on every owner route (feature 003 tests), so `/images/{id}` is already unreachable for an agent.
