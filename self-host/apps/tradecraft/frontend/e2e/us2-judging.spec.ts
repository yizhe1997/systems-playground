import { expect, test } from "@playwright/test";
import { api, tradesFor } from "./helpers";
import { dayUrl, sampleDay } from "./helpers_reviews";

const NOT_FOLLOWED = "Not available: you answered that the plan was not followed.";

test("judge a loss: valid loss needs Yes, the numbers and the Trades list follow", async ({ page }) => {
  const s = await sampleDay("Judge");
  await page.goto(dayUrl(s.id));
  await expect(page.getByText("Plan followed", { exact: true })).toBeVisible();

  // W: plan Yes
  await page.getByRole("button", { name: /^Judge NQ Long at 09:41/ }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByRole("heading", { name: /NQ Long x1 · .* 09:41 to 09:58 · / })).toBeVisible();
  await drawer.getByLabel("Yes").check();
  await drawer.getByRole("button", { name: "Save", exact: true }).click();
  await expect(drawer).toBeHidden();

  // L1: plan No; valid loss is dashed and gives its reason; choosing Yes makes it available
  await page.getByRole("button", { name: /^Judge NQ Long at 10:14/ }).click();
  await expect(drawer.getByText("What was this decision?")).toBeVisible();
  await drawer.getByLabel("No", { exact: true }).check();
  await expect(drawer.getByText(NOT_FOLLOWED)).toBeVisible();
  await expect(drawer.getByLabel(/Valid loss/)).toBeDisabled();
  await drawer.getByLabel("Yes").check();
  await expect(drawer.getByLabel(/Valid loss/)).toBeEnabled();
  await drawer.getByLabel(/Valid loss/).check();
  // changing the answer away from Yes clears the choice
  await drawer.getByLabel("Partly").check();
  await expect(drawer.getByLabel(/Valid loss/)).not.toBeChecked();
  await drawer.getByLabel("No", { exact: true }).check();
  await drawer.getByLabel(/^Mistake/).check();
  await drawer.getByRole("button", { name: "Save", exact: true }).click();
  await expect(drawer).toBeHidden();

  // the day shows the judgement beside the result, and the plan line counts only Yes
  const rows = page.locator("table.trade-grid tbody tr");
  await expect(rows.nth(1)).toContainText("Mistake");
  await expect(page.locator(".stat", { hasText: "Plan followed" }).first()).toContainText("1 of 3");
  await expect(page.getByText("1 not followed · 0 partly · 1 not judged yet")).toBeVisible();

  // the Trades list carries the plan answer
  await page.goto(tradesFor(s.id));
  await expect(page.getByRole("columnheader", { name: "Plan" })).toBeVisible();
  await expect(page.getByRole("row", { name: /\+\$300\.00.*Followed/ })).toBeVisible();
  await expect(page.getByText("Not judged yet")).toBeVisible();
  await expect(page.getByText("The plan answer comes from the daily review.")).toBeVisible();
});

test("a win can be flagged as a mistake; Cancel with changes asks first", async ({ page }) => {
  const s = await sampleDay("JudgeWin");
  await page.goto(dayUrl(s.id));
  await page.getByRole("button", { name: /^Judge NQ Long at 09:41/ }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByLabel(/This win was a mistake/)).toBeVisible();
  await expect(drawer.getByText("Valid loss")).toHaveCount(0);
  await drawer.getByLabel("No", { exact: true }).check();
  await drawer.getByRole("button", { name: "Close" }).click();
  await expect(drawer.getByText("Leave without saving?")).toBeVisible();
  await drawer.getByRole("button", { name: "Keep editing" }).click();
  await drawer.getByLabel(/This win was a mistake/).check();
  await drawer.getByRole("button", { name: "Save", exact: true }).click();
  await expect(drawer).toBeHidden();
  await expect(page.locator("table.trade-grid tbody tr").first()).toContainText("Mistake");
});

test("a judgement changed elsewhere is not overwritten", async ({ page }) => {
  const s = await sampleDay("JudgeStale");
  await api("PUT", `/trades/${s.w}/judgement`, { planFollowed: "yes" });
  await page.goto(dayUrl(s.id));
  await page.getByRole("button", { name: /^Judge NQ Long at 09:41/ }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer.getByLabel("Yes")).toBeChecked();
  // someone else changes it while the drawer is open
  const j = await api("GET", `/trades/${s.w}/judgement`);
  await api("PUT", `/trades/${s.w}/judgement`, { planFollowed: "partly", expectedUpdatedAt: j.data.updatedAt });
  await drawer.getByLabel("No", { exact: true }).check();
  await drawer.getByRole("button", { name: "Save", exact: true }).click();
  await expect(drawer.getByText("This judgement was changed elsewhere. Reload to see the latest version.")).toBeVisible();
});
