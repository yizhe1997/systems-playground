# Quickstart: Trade Screenshots

How to run the feature and prove it works, end to end. Details are in [contracts/openapi.yaml](contracts/openapi.yaml), [contracts/mcp-tools.md](contracts/mcp-tools.md) and [data-model.md](data-model.md).

## Prerequisites

- The stack from the README (`docker compose up -d --build` in `self-host/apps/tradecraft`, web on `http://127.0.0.1:3100` for development) and a signed-in owner session.
- A few test images: a PNG, a JPEG and a WebP under 5 MB, one over 5 MB, an SVG, a PDF, and a text file renamed `x.png`. The Playwright specs make their own tiny images and need nothing from you.

## Run the checks

```bash
POSTGRES_PASSWORD=anything bash scripts/test.sh      # Go tests, the whole Playwright suite, the secret and persistence checks
```

The feature's own pieces: Go `tests/images_test.go`, `images_gate_test.go`, `images_audit_test.go`, the updated `mcp_test.go`; Playwright `us10-trade-images*.spec.ts` and `zz-a11y-images.spec.ts`.

## Scenarios

1. **Paste (SC-001).** Take a screenshot (Win+Shift+S), open a trade's edit screen, press Ctrl+V. The image appears within two seconds with no other step; reload: it is still there. With the cursor in the thesis box the image is attached and no text is inserted.
2. **Choose and drop.** "Choose a file" and dropping a file attach the same way. A second image is listed after the first.
3. **A new trade.** Log a trade, paste an image before saving: it shows "waiting"; Save trade stores both; leave without saving: nothing is stored.
4. **Refusals (SC-003).** Each of these is refused with a message that names the reason and changes nothing: the PDF, the SVG, the text file named `x.png`, the over-size image, the eleventh image.
5. **See it (SC-002).** Daily review, open the trade's drawer: the pictures are in a row with their notes; select one to open it large; Next and Previous; edit its note and click away; Esc closes and focus returns to the picture.
6. **Trades list.** The Images column shows a count that opens the trade's Images section; an account name shows that account's trades with the other filters kept.
7. **Remove.** Remove asks "Remove this image?"; Cancel changes nothing; Remove deletes it for good.
8. **Safety (SC-004).** Signed out, request `/api/images/{id}`: refused like any private page. With an agent token on the API: refused. The served headers include `nosniff` and the sandbox policy. A trade deleted and restored keeps its images.
9. **Audit (SC-005).** One "Attachment added" and one "Attachment removed" entry, naming the trade, holding no name, note or data.
10. **Agent.** `list_trade_images` returns names, notes, types and sizes only; `list_trades` shows `imageCount`.
11. **Export.** The download lists each image (id, trade, name, note, type, size, time, path); the viewer's Download saves one image.
12. **Persistence (SC-006).** Stop and start the stack (`scripts/check-persistence.sh`): every image is identical afterwards (the pictures are in the stack's SeaweedFS volume); with the storage stopped, adding an image fails with a plain message and nothing is added.

## Expected outcomes

The suite passes, the secret check finds no image bytes or note in a tracked file or a container log (SC-008), the Trades list of 5,000 trades and the daily review stay under one second (SC-007), and the visual review of C1 to C6 is approved by the owner.
