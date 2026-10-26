import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { dropFiles, makeAccount, makePng, makeTrade, pasteImage, tradesFor, uniq, uploadImage } from "./helpers";
import { dayUrl, sampleDay } from "./helpers_reviews";

// Accessibility pass (feature 004): WCAG 2 A and AA, contrast included, on the image screens in both colour sets.

async function clean(page: Page, name: string) {
  await expect(page).toHaveTitle(/.+/);
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.help} — ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join("; ")}`);
  expect(summary, `${name}: accessibility violations`).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    test("C1 the Images section: empty, filled, a refusal, waiting images on a new trade", async ({ page }) => {
      const acct = await makeAccount(uniq("A11yImg"));
      const t = await makeTrade(acct.id, { instrument: "AXI1" });
      await page.goto(`/trades/${t.id}/edit`);
      await expect(page.locator("#images")).toBeVisible();
      await clean(page, "C1 empty");
      await uploadImage(t.id, makePng(4, 3), "one.png");
      await page.reload();
      await expect(page.locator("#images").getByRole("img")).toHaveCount(1);
      await clean(page, "C1 filled");
      await page.locator("#images").locator('input[type="file"]').setInputFiles({ name: "x.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.7") });
      await expect(page.locator("#images").getByRole("alert")).toBeVisible();
      await clean(page, "C1 refusal");
      await page.goto("/trades/new");
      await page.getByLabel(/^Instrument/).fill("AXN1"); // the page is live once a field takes input
      await pasteImage(page, makePng(3, 3));
      await dropFiles(page, "#images", [{ name: "b.png", type: "image/png", body: makePng(4, 4) }]);
      await expect(page.getByText("Waiting for Save")).toHaveCount(2);
      await clean(page, "C1 waiting on a new trade");
    });

    test("C2 and C3 the viewer and the remove question, and C4 the review drawer", async ({ page }) => {
      const s = await sampleDay("A11yView");
      await uploadImage(s.w, makePng(4, 3), "entry.png");
      await uploadImage(s.w, makePng(5, 3), "exit.png");
      await page.goto(dayUrl(s.id));
      await page.getByRole("button", { name: /^Judge NQ Long at 09:41/ }).click();
      await expect(page.getByRole("button", { name: "View entry.png" })).toBeVisible();
      await clean(page, "C4 drawer with images");
      await page.getByRole("button", { name: "View entry.png" }).click();
      await expect(page.getByRole("dialog", { name: "entry.png" })).toBeVisible();
      await clean(page, "C2 viewer");
      await page.getByRole("dialog", { name: "entry.png" }).getByRole("button", { name: "Remove" }).click();
      await expect(page.getByRole("dialog", { name: "Remove this image?" })).toBeVisible();
      await clean(page, "C3 remove question");
    });

    test("C5 the Trades list with the Images column and the account links", async ({ page }) => {
      const acct = await makeAccount(uniq("A11yList"));
      const t = await makeTrade(acct.id, { instrument: "AXL1" });
      await uploadImage(t.id, makePng(3, 3), "a.png");
      await page.goto(tradesFor(acct.id));
      await expect(page.getByRole("link", { name: /^1 image on / })).toBeVisible();
      await clean(page, "C5 list");
    });
  });
}
