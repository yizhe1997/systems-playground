import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { dropFiles, fillTrade, makeAccount, makePng, makeTrade, pasteImage, tradesFor, uniq, uploadImage } from "./helpers";

// Feature 004, user story 1 (screen C1): attach a screenshot to a trade by paste, choose or drop.
// The images are tiny files made here; one note carries a marker that scripts/check-loopback.sh looks for in logs.
// (kept in the file between workers and runs, so the note and the check always agree)
const markerFile = join(tmpdir(), "tradecraft-e2e-image-marker.txt");
if (!existsSync(markerFile)) writeFileSync(markerFile, "marker-" + Math.random().toString(36).slice(2, 12));
const MARKER = readFileSync(markerFile, "utf8").trim();

const png = makePng(3, 2);

async function openEdit(page: import("@playwright/test").Page, instrument: string) {
  const acct = await makeAccount(uniq("Img"));
  const t = await makeTrade(acct.id, { instrument });
  await page.goto(`/trades/${t.id}/edit`);
  await expect(page.getByRole("heading", { name: "Edit trade" })).toBeVisible();
  return { acct, t };
}

test("paste (Ctrl+V) attaches the image at once, inserts no text, and it is still there after a reload", async ({ page }) => {
  const { t } = await openEdit(page, "PST1");
  const images = page.locator("#images");
  await expect(images.getByText("Paste a screenshot (Ctrl+V), choose a file, or drop one here.")).toBeVisible();

  // the cursor is in the thesis box: the image is attached and no text goes into the box
  await page.locator("details.details summary").click();
  const thesis = page.getByLabel("Why I took it (thesis, optional)");
  await thesis.focus();
  const started = Date.now();
  const taken = await pasteImage(page, png);
  expect(taken, "the page took over the paste").toBe(true);
  await expect(images.getByRole("img")).toHaveCount(1);
  expect(Date.now() - started, "SC-001: visible within 2 seconds").toBeLessThan(2000);
  await expect(thesis).toHaveValue("");
  await expect(images.getByText("1 of 10 images")).toBeVisible();
  await expect(images.getByText(/^Screenshot \d{1,2} \w{3} \d{4} \d{2}:\d{2}$/)).toBeVisible(); // a pasted image is named by its time

  await page.reload();
  await expect(page.locator("#images").getByRole("img")).toHaveCount(1);
  expect((await (await page.request.get(await page.locator("#images img").first().getAttribute("src") as string)).body()).length).toBeGreaterThan(20);
  void t;
});

test("plain text on the clipboard pastes as usual and attaches nothing", async ({ page }) => {
  await openEdit(page, "PST2");
  await page.locator("details.details summary").click();
  const thesis = page.getByLabel("Why I took it (thesis, optional)");
  await thesis.focus();
  const taken = await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.setData("text/plain", "hello");
    return !window.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  expect(taken, "a text paste is left to the browser").toBe(false);
  await expect(page.locator("#images").getByRole("img")).toHaveCount(0);
});

test("choose a file and drop a file attach the same way, in the order added, each with a note", async ({ page }) => {
  await openEdit(page, "CHS1");
  const images = page.locator("#images");
  await images.locator('input[type="file"]').setInputFiles({ name: "first chart.png", mimeType: "image/png", buffer: png });
  await expect(images.getByText("first chart.png")).toBeVisible();
  await dropFiles(page, "#images", [{ name: "second.png", type: "image/png", body: makePng(4, 4) }]);
  await expect(images.getByRole("img")).toHaveCount(2);
  const names = await images.locator(".image-name").allInnerTexts();
  expect(names).toEqual(["first chart.png", "second.png"]);

  // a note is saved when the field is left, and is there after a reload
  const note = images.getByLabel("Note (optional)").first();
  await note.fill(`Entry, 5 min chart ${MARKER}`);
  await note.blur();
  await page.reload();
  await expect(page.locator("#images").getByLabel("Note (optional)").first()).toHaveValue(`Entry, 5 min chart ${MARKER}`);
});

test("each refusal says why and changes nothing", async ({ page }) => {
  const { t } = await openEdit(page, "REF1");
  const images = page.locator("#images");
  const input = images.locator('input[type="file"]');

  await input.setInputFiles({ name: "report.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7 hello") });
  await expect(images.getByRole("alert")).toContainText("! Only PNG, JPEG and WebP images are allowed.");
  // an SVG is not an allowed type either
  await input.setInputFiles({ name: "x.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') });
  await expect(images.getByRole("alert")).toContainText("Only PNG, JPEG and WebP images are allowed.");
  // a page renamed to look like a PNG passes the browser's check and is refused by the journal, which reads the bytes
  await input.setInputFiles({ name: "evil.png", mimeType: "image/png", buffer: Buffer.from("<html><script>alert(1)</script></html>") });
  await expect(images.getByRole("alert")).toContainText("Only PNG, JPEG and WebP images are allowed.");
  // too big
  await input.setInputFiles({ name: "big.png", mimeType: "image/png", buffer: Buffer.alloc(Math.round(7.4 * 1024 * 1024)) });
  await expect(images.getByRole("alert")).toContainText("! That image is 7.4 MB. The limit is 5 MB.");
  await expect(images.getByRole("img")).toHaveCount(0);

  // the eleventh
  for (let i = 0; i < 10; i++) expect((await uploadImage(t.id, makePng(2 + i, 2), `n${i}.png`)).status).toBe(201);
  await page.reload();
  await expect(page.locator("#images").getByText("10 of 10 images")).toBeVisible();
  await expect(page.locator("#images").getByText("Adding is unavailable until you remove an image.")).toBeVisible();
  await dropFiles(page, "#images", [{ name: "eleventh.png", type: "image/png", body: png }]);
  await expect(page.locator("#images").getByRole("img")).toHaveCount(10);
});

test("a 4.9 MB image goes through the web tier and is stored", async ({ page }) => {
  await openEdit(page, "BIG1");
  const big = makePng(1500, 1100, true);
  expect(big.length).toBeGreaterThan(4.5 * 1024 * 1024);
  expect(big.length).toBeLessThan(5 * 1024 * 1024);
  await page.locator("#images").locator('input[type="file"]').setInputFiles({ name: "wide.png", mimeType: "image/png", buffer: big });
  await expect(page.locator("#images").getByRole("img")).toHaveCount(1, { timeout: 15_000 });
});

test("a new trade keeps its images waiting, stores them on Save, and nothing when the owner leaves", async ({ page }) => {
  const acct = await makeAccount(uniq("ImgNew"));
  const fill = async (instrument: string) => {
    await page.goto("/trades/new");
    await fillTrade(page, { account: acct.name, instrument, direction: "Long", size: "1", entryPrice: "10", entryDate: "2025-10-01", entryTime: "09:00", exitPrice: "11", exitDate: "2025-10-01", exitTime: "09:30", dollarsPerPoint: "5" });
  };

  // leave without saving: the images were never stored
  await fill("NEW0");
  await pasteImage(page, png);
  const images = page.locator("#images");
  await expect(images.getByText("Waiting for Save")).toBeVisible();
  await expect(images.getByText("Images added here are saved with the trade when you press Save trade.")).toBeVisible();

  // save: the trade and its image
  await fill("NEW1");
  await pasteImage(page, png);
  await pasteImage(page, makePng(5, 5));
  await expect(images.getByText("Waiting for Save")).toHaveCount(2);
  await page.getByRole("button", { name: "Save trade" }).click();
  await expect(page).toHaveURL(/\/trades\?/);
  await page.goto(tradesFor(acct.id));
  await expect(page.getByRole("row", { name: /NEW1/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /NEW0/ })).toHaveCount(0);
});

test("a new trade is saved even when an image then fails to store, and the owner is told how many were not added", async ({ page }) => {
  const acct = await makeAccount(uniq("ImgFail"));
  await page.route("**/api/trades/*/images**", (route) => (route.request().method() === "POST" ? route.abort() : route.continue()));
  await page.goto("/trades/new");
  await fillTrade(page, { account: acct.name, instrument: "FAIL1", direction: "Long", size: "1", entryPrice: "10", entryDate: "2025-10-01", entryTime: "09:00", exitPrice: "11", exitDate: "2025-10-01", exitTime: "09:30", dollarsPerPoint: "5" });
  await pasteImage(page, png);
  await page.getByRole("button", { name: "Save trade" }).click();
  await expect(page).toHaveURL(/\/trades\/[0-9a-f-]+\/edit\?notadded=1/);
  await expect(page.locator("#images").getByRole("alert")).toContainText("! 1 image was not added. Add it again here.");
  await page.unroute("**/api/trades/*/images**");
  // the trade is there, without the image
  await page.goto(tradesFor(acct.id));
  await expect(page.getByRole("row", { name: /FAIL1/ })).toBeVisible();
});
