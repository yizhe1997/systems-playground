# Implementation Plan: Trade Screenshots

**Feature**: `004-trade-screenshots` | **Date**: 2026-10-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-trade-screenshots/spec.md` (wireframes signed off 2026-10-26, spec hash `fff6ad66…5f3`)

## Summary

A trade can carry up to 10 images (PNG, JPEG, WebP, 5 MB each) whose pictures live in the owner's SeaweedFS bucket (S3 API, under the image's id) while a table of their own in PostgreSQL holds the details, so no list ever reads or fetches a picture. The API takes an image as a raw request body for one trade, checks what the bytes **are** (magic numbers, structure and, for PNG and JPEG, the declared size), stores it with a cleaned name and an optional note, and writes one audit entry in the same transaction. An image is read back by its own address, only by the owner's session, with headers that let a browser display it and nothing else. The web tier gets two small binary route handlers (the existing pass-through is JSON text only); the browser adds paste, choose and drop in the trade form, a viewer, a remove confirmation, a count that links in the Trades list, a row of pictures in the review drawer, and one new read-only agent tool that lists a trade's images by name and note.

Nothing is taken from Tradecraft v1 (its module inventory lists the image gallery as not started). Feature 002's gate, the audit helper and the transaction helper are reused as they are.

## Technical Context

**Language/Version**: Go 1.26 and TypeScript (Next.js 16, React 19), as pinned

**Primary Dependencies**: none new. Go standard library only (`image/png`, `image/jpeg` for header checks, `crypto/rand` not needed). WebP is checked by its container structure, so `golang.org/x/image` is not added. Frontend: Base UI (already used) for the viewer and the confirmation, lucide icons (already used)

**Storage**: PostgreSQL 18; one migration `00017_trade_image.sql` ([data-model.md](data-model.md)): table `trade_image` (details only; the picture is an object in the bucket under the row's id), an index on `(trade_id, created_at, id)`, constraints that repeat the limits, and the two audit kinds (no schema change: kinds are a list in code)

**Testing**: Go tests against real Postgres (validation matrix, limits under concurrency, gate, audit, export, agent tool, persistence); Playwright on the composed stack for C1 to C6 (paste, choose, drop, viewer by keyboard, remove, drawer, Trades list links, axe in light and night, no console error, no CSP violation); the whole existing suite

**Target Platform**: Linux containers under Docker Compose; desktop browser; the public hostname behind Cloudflare's tunnel (uploads up to 5 MB are well under its limit)

**Project Type**: web application (Go API plus Next.js web tier), the same two services

**Performance Goals**: an image of 5 MB is stored and shown in under 2 seconds on this computer (SC-001); the Trades list of 5,000 trades and the daily review stay under the existing one-second budget with the new count (SC-007): the count is one indexed aggregate per page of trades, never a read of bytes

**Constraints**: owner-only; never served to an agent; never executable in a browser; every add and remove is one audit row in the same transaction; no image bytes, name or note in a log, an audit row or an error message; no outbound call; limits enforced by the API and by the database, not only by the page

**Scale/Scope**: one owner, thousands of trades, a few images on some of them; 6 wireframe pages (13 frames), 3 new components, 3 changed screens (trade form, review drawer, Trades list)

## Constitution Check

*Gate: passed before research; re-checked after design (below).*

| Principle | Status | How the plan meets it |
|---|---|---|
| I Process over outcome | Met | No money figure is added. The Trades list keeps Plan beside Net result; the new column is a count |
| II Owner in charge, agents read and draft | Met | The agent's one new tool is read-only and returns names and notes, never bytes; the image address refuses an agent token (the owner gate already does, and a test proves it); no model call; no write path for agents |
| III Honest numbers | Met | The count is a count; no figure, rule or definition changes |
| IV Security gates | **Met; upload code, reviewed** | Constitution IV names upload code for review passes: a pass is a task of this plan (security review G-16 onward). Content judged by bytes, SVG and active content refused, size and count limits in the API and the database, served with `nosniff` and a sandbox policy, same-origin check on changes, owner gate on every route, audit rows, no content in logs |
| V Design before code | Met | Wireframes signed off 2026-10-26; the visual direction is approved; the frames of L1, S2 and A4 are updated in Penpot in the same change; visual review after |
| VI One small slice | Met | Images only, trades only, no annotations, no thumbnails, no totals; two small conveniences the owner asked for are in (paste, and the two links in the Trades list) |
| VII Own your data | **Met with a written exception** | The export lists every image with its id, details and address and each image can be downloaded, but the export does not carry the bytes; they are in the owner's own bucket, which is readable with any S3 tool (owner's decision, ending when a one-step export of the files is wanted). The only outbound call is to the owner's own object store |
| VIII Decisions logged, domain sourced | Met in the plan, finished at implement | Decisions are in `research.md` and go to `docs/decisions.md`; `docs/domain.md` needs no change (no rule changes); the security review gets the new gate rows |

**Re-check after design**: no new violations. Judgement calls written down: bytes are stored as sent (no re-encoding, so a screenshot is never altered), WebP is checked by structure only, the upload is a raw body (not multipart), and editing a note is not an audit row (research 2, 3, 4, 9).

## Project Structure

### Documentation (this feature)

```text
specs/004-trade-screenshots/
├── spec.md
├── screens.md           # signed off 2026-10-26
├── plan.md              # this file
├── research.md          # decisions, alternatives, accepted risks
├── data-model.md        # the migration, constraints, audit kinds, export shape
├── quickstart.md        # setup and the scenarios that prove it
├── contracts/
│   ├── openapi.yaml     # the new routes and the changed trade shapes
│   └── mcp-tools.md     # the one new tool
├── checklists/requirements.md
└── tasks.md             # next step (/speckit-tasks)
```

### Source Code

```text
backend/
├── migrations/
│   └── 00017_trade_image.sql            # table, constraints, index, Down
├── queries/
│   ├── images.sql                       # new: list (no bytes), get bytes, insert, update note, delete, count, lock
│   ├── trades.sql                       # image_count in the list and get queries
│   └── export.sql                       # images (metadata) for the export
├── internal/api/
│   ├── server.go                        # routes; BodyLimit for the upload; the small-body cap for every other route
│   ├── images.go                        # new: list, add, note, remove, serve; the limits in one place
│   ├── imagecheck.go                    # new: what the bytes are (PNG, JPEG, WebP), the display name, the sizes
│   ├── audit.go                         # kinds attachment_added, attachment_removed
│   ├── trades.go                        # imageCount in the trade JSON
│   ├── export.go                        # images
│   └── mcp.go                           # list_trade_images
└── tests/
    ├── images_test.go                   # validation matrix, limits, concurrency, deleted trade, persistence
    ├── images_gate_test.go              # no session, agent token, wrong method, other owner routes unchanged
    ├── images_audit_test.go             # one row each, no content, same transaction
    └── mcp_test.go                      # the new tool (updated); an agent cannot fetch bytes

frontend/src/
├── app/
│   ├── api/trades/[id]/images/route.ts  # POST: raw image from this app's pages only, to the API
│   ├── api/images/[id]/route.ts         # GET bytes (inline or ?download=1), PUT note, DELETE; safe headers
│   ├── trades/page.tsx                  # account link target; passes the list's own filters down
│   └── trades/[id]/edit/page.tsx        # loads the images
├── lib/
│   ├── imageLimits.ts                   # the limits, read from the API's answer and shown in messages
│   └── types.ts                         # TradeImage, Trade.imageCount
├── proxy.ts                             # no change (the CSP already allows img-src 'self' blob: data:)
└── components/
    ├── TradeImages.tsx                  # C1: the section, paste, choose, drop, the list, pending images on a new trade
    ├── ImageViewer.tsx                  # C2 and C3: large view, note, Previous and Next, Download, Remove, confirmation
    ├── TradeForm.tsx                    # hosts the section; uploads pending images after a new trade is saved
    ├── JudgeButton.tsx                  # C4: the row of pictures in the drawer
    └── TradesTable.tsx                  # C5: the count and the account name as links
frontend/e2e/
├── us10-trade-images.spec.ts            # C1 to C3 flows (paste, choose, drop, refuse, remove)
├── us10-trade-images-views.spec.ts      # C4, C5 and the viewer by keyboard
├── us10-trade-images-safety.spec.ts     # served headers, signed out, agent, a script named .png
├── zz-a11y-images.spec.ts               # axe on C1 to C6, both modes
└── zz-screens-images.spec.ts            # capture for the visual review
scripts/check-loopback.sh                # + image bytes and notes of the test run are in no log
docs/
├── decisions.md, security-review.md     # the decisions; gate rows G-16 onward and the review pass
└── README.md                            # "Screenshots" section
```
