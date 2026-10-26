import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { api, dropFiles, makeAccount, makePng, makeTrade, pasteImage, tradesFor, uniq, uploadImage } from "./helpers";
import { dayUrl, sampleDay } from "./helpers_reviews";

// Not a check: it captures the built screens of feature 004 (C1 to C6) for the visual review, in a folder outside the
// repository. Run it on a fresh stack:
//   CAPTURE_SCREENS=light npx playwright test e2e/zz-screens-images.spec.ts   (and =dark)
const scheme = process.env.CAPTURE_SCREENS;
const out = process.env.CAPTURE_DIR ?? path.join(tmpdir(), "tradecraft-built", "004-trade-screenshots");

test.skip(!scheme, "set CAPTURE_SCREENS=light or dark to capture the built screens");
test.use({ colorScheme: scheme === "dark" ? "dark" : "light", trace: "off", screenshot: "off", video: "off" });

async function shot(page: Page, name: string) {
  mkdirSync(out, { recursive: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, `${name}-${scheme}.png`), fullPage: false });
}

test("capture", async ({ page }) => {
  test.setTimeout(240_000);
  const s = await sampleDay("Funded 50K");
  const imgs = [
    ["Screenshot 25 Oct 2026 09:41", makePng(960, 540)],
    ["exit - 5 min chart.png", makePng(800, 500)],
    ["levels.png", makePng(640, 400)],
  ] as const;
  for (const [name, body] of imgs) expect((await uploadImage(s.w, body, name)).status).toBe(201);
  const list = await api<{ items: { id: string }[] }>("GET", `/trades/${s.w}/images`);
  await api("PUT", `/images/${list.data.items[0].id}`, { note: "Entry at the retest of the opening range high" });
  await api("PUT", `/images/${list.data.items[1].id}`, { note: "Exit into the prior day high" });

  // C1 empty, filled (with one refusal), full
  const bare = await makeTrade(s.id, { instrument: "ES", entryAt: "2025-10-02T09:41", exitAt: "2025-10-02T09:58" });
  await page.goto(`/trades/${bare.id}/edit`);
  await expect(page.locator("#images")).toBeVisible();
  await page.locator("#images").scrollIntoViewIfNeeded();
  await shot(page, "c1-trade-images-empty");
  await page.goto(`/trades/${s.w}/edit`);
  await page.locator("#images").scrollIntoViewIfNeeded();
  await shot(page, "c1-trade-images-filled");
  await page.locator("#images").locator('input[type="file"]').setInputFiles({ name: "report.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7") });
  await expect(page.locator("#images").getByRole("alert")).toBeVisible();
  await shot(page, "c1-trade-images-refusal");
  const full = await makeTrade(s.id, { instrument: "CL", entryAt: "2025-10-03T09:41", exitAt: "2025-10-03T09:58" });
  for (let i = 0; i < 10; i++) await uploadImage(full.id, makePng(300 + i, 200), `chart ${i + 1}.png`);
  await page.goto(`/trades/${full.id}/edit`);
  await page.locator("#images").scrollIntoViewIfNeeded();
  await shot(page, "c1-trade-images-full");
  await page.goto("/trades/new");
  await page.getByLabel(/^Instrument/).fill("NQ");
  await pasteImage(page, makePng(640, 360));
  await dropFiles(page, "#images", [{ name: "second.png", type: "image/png", body: makePng(480, 300) }]);
  await expect(page.getByText("Waiting for Save")).toHaveCount(2);
  await page.locator("#images").scrollIntoViewIfNeeded();
  await shot(page, "c1-trade-images-waiting-new-trade");

  // C4 the drawer with images and without, then C2 and C3 over it
  await page.goto(dayUrl(s.id));
  await page.getByRole("button", { name: /^Judge NQ Long at 10:14/ }).click();
  await shot(page, "c4-review-drawer-images-none");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^Judge NQ Long at 09:41/ }).click();
  await expect(page.getByRole("button", { name: /^View / }).first()).toBeVisible();
  await shot(page, "c4-review-drawer-images-with-images");
  await page.getByRole("button", { name: /^View levels.png/ }).click();
  await shot(page, "c2-image-viewer-3-of-3");
  await page.getByRole("dialog", { name: "levels.png" }).getByRole("button", { name: "Previous" }).click();
  await shot(page, "c2-image-viewer-2-of-3");
  await page.getByRole("dialog").last().getByRole("button", { name: "Remove" }).click();
  await shot(page, "c3-remove-image-asking");
  await page.getByRole("dialog", { name: "Remove this image?" }).getByRole("button", { name: "Cancel" }).click();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  const single = await makeTrade(s.id, { instrument: "GC", entryAt: "2025-10-04T09:41", exitAt: "2025-10-04T09:58" });
  await uploadImage(single.id, makePng(700, 420), "only image.png");
  await page.goto(`/trades/${single.id}/edit`);
  await page.locator("#images").getByRole("button", { name: /^View / }).click();
  await shot(page, "c2-image-viewer-only-image");
  await page.keyboard.press("Escape");

  // C5 the Trades list
  await page.goto(tradesFor(s.id));
  await expect(page.getByRole("link", { name: /^3 images on / })).toBeVisible();
  await shot(page, "c5-trades-list-images");

  // C6 the audit log (an add and a removal)
  const fl = await api<{ items: { id: string }[] }>("GET", `/trades/${full.id}/images`);
  expect((await api("DELETE", `/images/${fl.data.items[0].id}`)).status).toBe(204);
  await page.goto("/audit");
  await expect(page.locator("tbody").getByText("Attachment added").first()).toBeVisible();
  await shot(page, "c6-audit-log-attachments");
});
