import { expect, test } from "@playwright/test";
import { OWNER_EMAIL } from "./auth";
import { api, makeAccount, makeTrade, uniq } from "./helpers";

// The entries are made by the real change routes (as the owner, with a signed token); the screen is what is under test.
test("every recorded action is a row in the Audit log, newest first, with no figure in it", async ({ page }) => {
  const acct = await makeAccount(uniq("Audit"));
  const trade = await makeTrade(acct.id);
  expect((await api("DELETE", `/trades/${trade.id}`)).status).toBe(200);
  expect((await api("POST", `/trades/${trade.id}/restore`)).status).toBe(200);
  expect((await api("POST", `/accounts/${acct.id}/archive`)).status).toBe(200);
  expect((await api("POST", `/accounts/${acct.id}/restore`)).status).toBe(200);
  const m = await api<{ id: string }>("POST", "/mistakes", { name: uniq("Audit mistake") });
  expect(m.status).toBe(201);
  expect((await api("POST", `/mistakes/${m.data.id}/retire`)).status).toBe(200);
  expect((await api("POST", `/mistakes/${m.data.id}/restore`)).status).toBe(200);
  const before = await api<unknown>("GET", "/export");
  expect(before.status).toBe(200);

  await page.goto("/audit");
  await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
  await expect(page.getByText("Who did what, newest first. Entries are never edited or removed.")).toBeVisible();
  const rows = page.locator("tbody tr");
  // newest first: the export is the latest of what this test did
  await expect(rows.first()).toContainText("Export downloaded");
  await expect(rows.first()).toContainText(OWNER_EMAIL);
  const text = await page.locator("tbody").innerText();
  for (const kind of ["Trade deleted", "Trade restored", "Account archived", "Account restored", "Mistake retired", "Mistake restored"]) {
    expect(text, kind).toContain(kind);
  }
  const deleted = rows.filter({ hasText: "Trade deleted" }).first();
  await expect(deleted).toContainText("NQ long trade of Wed 1 Oct 09:41");
  await expect(deleted).toContainText("status");
  // no money figure, price or note in the log
  expect(text).not.toMatch(/\$\s?\d|21450|95\.40|\+\d+\.\d\d/);
  // nothing here edits or removes an entry
  await expect(page.locator("tbody button, tbody a")).toHaveCount(0);
});

test("filter by what, by who and by period; clear the filters; paging", async ({ page }) => {
  await page.goto("/audit");
  await page.getByLabel("What").selectOption({ label: "Trade deleted" });
  await expect(page).toHaveURL(/kind=trade_deleted/);
  const rows = page.locator("tbody tr");
  await expect(rows.first()).toContainText("Trade deleted");
  for (const r of await rows.all()) await expect(r).toContainText("Trade deleted");
  await expect(page.getByText(/^Showing 1 to \d+ of \d+$/)).toBeVisible();

  // nobody was refused in this run, so "Not signed in" matches nothing
  await page.getByLabel("Identity").selectOption({ label: "Not signed in" });
  await expect(page.getByText("No entries for these filters.")).toBeVisible();
  await expect(page.getByText("Try another identity, kind or a wider period.")).toBeVisible();
  await page.getByRole("link", { name: "Clear filters" }).first().click();
  await expect(page).toHaveURL(/\/audit$/);
  await expect(page.locator("tbody tr").first()).toBeVisible();

  // a period with nothing in it
  await page.getByLabel("Date range").click();
  await page.getByRole("button", { name: "This month" }).click();
  await expect(page).toHaveURL(/from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}/);
});

test("more than a page of entries is paged, with Newer and Older", async ({ page }) => {
  const acct = await makeAccount(uniq("Paging"));
  // archive and restore: two entries per round, so 30 rounds push the log past the page size of 50
  for (let i = 0; i < 30; i++) {
    await api("POST", `/accounts/${acct.id}/archive`);
    await api("POST", `/accounts/${acct.id}/restore`);
  }
  await page.goto("/audit");
  await expect(page.getByText(/^Showing 1 to 50 of \d+$/)).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(50);
  await page.getByRole("link", { name: "Older" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText(/^Showing 51 to /)).toBeVisible();
  await expect(page.getByRole("link", { name: "Newer" })).toBeVisible();
});
