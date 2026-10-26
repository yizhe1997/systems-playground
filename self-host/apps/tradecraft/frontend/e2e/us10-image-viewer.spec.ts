import { expect, test } from "@playwright/test";
import { makePng, uploadImage } from "./helpers";
import { dayUrl, sampleDay } from "./helpers_reviews";

// Feature 004, user stories 2 and 3 (screens C2, C3, C4): look at a picture large, describe it, remove it.

test("the review drawer shows the trade's pictures and opens them large, stepping with Next and the arrow keys", async ({ page }) => {
  const s = await sampleDay("ImgView");
  expect((await uploadImage(s.w, makePng(4, 3), "entry.png")).status).toBe(201);
  expect((await uploadImage(s.w, makePng(5, 3), "exit.png")).status).toBe(201);

  await page.goto(dayUrl(s.id));
  // a trade with no pictures has no Images section
  await page.getByRole("button", { name: /^Judge NQ Long at 10:14/ }).click();
  await expect(page.getByRole("dialog").getByText("Images", { exact: true })).toHaveCount(0);
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /^Judge NQ Long at 09:41/ }).click();
  const drawer = page.getByRole("dialog").first();
  await expect(drawer.getByRole("img")).toHaveCount(2);
  await drawer.getByRole("button", { name: "View entry.png" }).click();

  const viewer = page.getByRole("dialog", { name: "entry.png" });
  await expect(viewer.getByText("Image 1 of 2")).toBeVisible();
  await viewer.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("dialog", { name: "exit.png" })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await expect(page.getByRole("dialog", { name: "entry.png" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Download" })).toHaveAttribute("href", /download=1/);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "entry.png" })).toBeHidden();
});

test("a note edited in the viewer is saved and shown in the drawer; Remove asks first, Cancel changes nothing, Remove deletes", async ({ page }) => {
  const s = await sampleDay("ImgNote");
  expect((await uploadImage(s.w, makePng(4, 3), "only.png")).status).toBe(201);

  await page.goto(dayUrl(s.id));
  await page.getByRole("button", { name: /^Judge NQ Long at 09:41/ }).click();
  await page.getByRole("button", { name: "View only.png" }).click();
  const viewer = page.getByRole("dialog", { name: "only.png" });
  await expect(viewer.getByText(/Image \d of/)).toHaveCount(0); // a single picture has no position
  await expect(viewer.getByRole("button", { name: "Next" })).toHaveCount(0);
  await viewer.getByLabel("Note (optional)").fill("Entry at the retest");
  await viewer.getByLabel("Note (optional)").blur();
  await expect(page.getByRole("dialog").first().getByText("Entry at the retest")).toBeVisible();

  await viewer.getByRole("button", { name: "Remove" }).click();
  const ask = page.getByRole("dialog", { name: "Remove this image?" });
  await expect(ask.getByText(/"only.png" will be deleted from the journal. It cannot be brought back./)).toBeVisible();
  await ask.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog", { name: "only.png" })).toBeVisible();

  await page.getByRole("dialog", { name: "only.png" }).getByRole("button", { name: "Remove" }).click();
  await page.getByRole("dialog", { name: "Remove this image?" }).getByRole("button", { name: "Remove image" }).click();
  await expect(page.getByRole("button", { name: "View only.png" })).toHaveCount(0);
});

test("on the edit screen a picture opens large and can be described there", async ({ page }) => {
  const s = await sampleDay("ImgEdit");
  expect((await uploadImage(s.l1, makePng(4, 3), "one.png")).status).toBe(201);
  await page.goto(`/trades/${s.l1}/edit`);
  await page.locator("#images").getByRole("button", { name: "View one.png" }).click();
  const viewer = page.getByRole("dialog", { name: "one.png" });
  await viewer.getByLabel("Note (optional)").fill("From the viewer");
  await viewer.getByLabel("Note (optional)").blur();
  await viewer.getByRole("button", { name: "Close" }).click();
  await expect(page.locator("#images").getByLabel("Note (optional)")).toHaveValue("From the viewer");
});
