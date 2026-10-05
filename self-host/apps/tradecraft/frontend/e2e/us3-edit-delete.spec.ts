import { expect, test } from "@playwright/test";
import { api, fillTrade, makeAccount, makeTrade, preview, tradeA, tradesFor, uniq } from "./helpers";

test("edit a price and see the result change", async ({ page }) => {
  const acct = await makeAccount(uniq("Edit"));
  await makeTrade(acct.id, { instrument: "ED1" });
  await page.goto(tradesFor(acct.id));
  await page.getByRole("link", { name: /Edit ED1/ }).click();
  await expect(page.getByRole("heading", { name: "Edit trade" })).toBeVisible();
  await expect(page.getByText(/ED1 Long x2 · Wed 1 Oct 2025 · /)).toBeVisible();
  await expect(page.getByText(/Last saved /)).toBeVisible();

  await fillTrade(page, { exitPrice: "21460.00" });
  await expect(preview(page)).toContainText("+$395.40");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/trades\?from=2025-10-01&to=2025-10-31/);
  await page.goto(tradesFor(acct.id));
  await expect(page.getByRole("row", { name: /ED1/ })).toContainText("+$395.40");
});

test("delete shows Undo for ten seconds; Show deleted keeps it restorable", async ({ page }) => {
  const acct = await makeAccount(uniq("Del"));
  await makeTrade(acct.id, { instrument: "DL1" });
  await page.goto(tradesFor(acct.id));
  await page.getByRole("button", { name: /Delete DL1/ }).click();
  await expect(page.getByText("Trade deleted.")).toBeVisible();
  await expect(page.getByRole("row", { name: /DL1/ })).toBeHidden();

  // Undo
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("row", { name: /DL1/ })).toBeVisible();

  // delete again, then restore from the deleted view
  await page.getByRole("button", { name: /Delete DL1/ }).click();
  await expect(page.getByText("Trade deleted.")).toBeVisible();
  await page.getByText("Show deleted").click();
  await expect(page.getByText("Showing deleted trades. They are hidden everywhere else until restored.")).toBeVisible();
  const row = page.getByRole("row", { name: /DL1/ });
  await expect(row).toContainText("Deleted");
  await row.getByRole("button", { name: /Restore/ }).click();
  await expect(page.getByRole("row", { name: /DL1/ })).toBeHidden();
  await page.goto(tradesFor(acct.id));
  await expect(page.getByRole("row", { name: /DL1/ })).toBeVisible();
});

test("the toast goes away by itself after ten seconds", async ({ page }) => {
  test.setTimeout(30_000);
  const acct = await makeAccount(uniq("Toast"));
  await makeTrade(acct.id, { instrument: "TO1" });
  await page.goto(tradesFor(acct.id));
  await page.getByRole("button", { name: /Delete TO1/ }).click();
  await expect(page.getByText("Trade deleted.")).toBeVisible();
  await expect(page.getByText("Trade deleted.")).toBeHidden({ timeout: 13_000 });
});

test("Delete trade on the edit screen", async ({ page }) => {
  const acct = await makeAccount(uniq("EDel"));
  const t = await makeTrade(acct.id, { instrument: "EX1" });
  await page.goto(`/trades/${t.id}/edit`);
  await page.getByRole("button", { name: "Delete trade" }).click();
  await expect(page).toHaveURL(/\/trades/);
  await expect(page.getByText("Trade deleted.")).toBeVisible();
  const check = await api("GET", `/trades/${t.id}`);
  expect(check.data.deleted).toBe(true);
});

test("a save from an out-of-date copy is refused with a Reload", async ({ page }) => {
  const acct = await makeAccount(uniq("Conf"));
  const t = await makeTrade(acct.id, { instrument: "CF1" });
  await page.goto(`/trades/${t.id}/edit`);
  // someone else changes it meanwhile
  const other = await api("PUT", `/trades/${t.id}`, { ...tradeA(acct.id, { instrument: "CF2" }), expectedUpdatedAt: t.updatedAt });
  expect(other.status).toBe(200);
  await fillTrade(page, { instrument: "CF3" });
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("! This trade was changed elsewhere. Reload to see the latest version.")).toBeVisible();
  await page.getByRole("button", { name: "Reload" }).click();
  await expect(page.getByLabel("Instrument")).toHaveValue("CF2");
});
