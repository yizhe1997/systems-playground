import { expect, test } from "@playwright/test";
import { OWNER_EMAIL, cookieFor } from "./auth";
import { api } from "./helpers";

const UNSIGNED = { cookies: [], origins: [] };
const stamp = () => Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);

type Listed = { identities: { id: string; email: string; active: boolean }[]; counts: { all: number; active: number; disabled: number } };
const identities = async () => (await api<Listed>("GET", "/identities")).data;

test("the Access list: add an address, the same one again, a bad one, disable and enable", async ({ page }) => {
  await page.goto("/settings");
  const card = page.getByRole("region", { name: "Access" });
  await expect(card.getByText("Who can sign in. Every address here is you.")).toBeVisible();
  const owner = card.getByRole("row", { name: new RegExp(OWNER_EMAIL) });
  await expect(owner).toContainText("Active");

  const email = `access-${stamp()}@example.com`;
  await card.getByLabel("Add an email").fill(`  ${email.toUpperCase()} `);
  await card.getByRole("button", { name: "Add email" }).click();
  const row = card.getByRole("row", { name: new RegExp(email) });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Active");
  await expect(row).toContainText("—"); // never signed in

  // the same address in other letters is the same address
  await card.getByLabel("Add an email").fill(email);
  await card.getByRole("button", { name: "Add email" }).click();
  await expect(card.getByText("! That address is already on the list. Enable it instead.")).toBeVisible();
  // not an address
  await card.getByLabel("Add an email").fill("not-an-address");
  await card.getByRole("button", { name: "Add email" }).click();
  await expect(card.getByText("! Enter a valid email address, for example name@example.com.")).toBeVisible();

  // disable, then enable the same row
  await row.getByRole("button", { name: /Disable/ }).click();
  await expect(row).toContainText("Disabled");
  await row.getByRole("button", { name: /Enable/ }).click();
  await expect(row).toContainText("Active");

  // the filter chips count
  const list = await identities();
  await expect(card.getByRole("button", { name: `All ${list.counts.all}` })).toBeVisible();
  await expect(card.getByRole("button", { name: `Active ${list.counts.active}` })).toBeVisible();
});

test("the last active address cannot be disabled", async ({ page }) => {
  // leave only the owner active, through the API, then try the owner in the screen
  for (const i of (await identities()).identities) {
    if (i.email !== OWNER_EMAIL && i.active) expect((await api("POST", `/identities/${i.id}/disable`)).status).toBe(200);
  }
  await page.goto("/settings");
  const card = page.getByRole("region", { name: "Access" });
  await card.getByRole("row", { name: new RegExp(OWNER_EMAIL) }).getByRole("button", { name: /Disable/ }).click();
  await expect(card.getByText("! This is the last active address. Enable another one before disabling it.")).toBeVisible();
  expect((await identities()).counts.active).toBe(1);
});

test.describe("an older sign-in", () => {
  test.use({ storageState: UNSIGNED });

  test("Add email asks 'Confirm it's you' first, changes nothing, and Continue goes to Google's account chooser", async ({ browser }) => {
    const context = await browser.newContext({ storageState: UNSIGNED });
    const now = Date.now();
    await context.addCookies([await cookieFor(OWNER_EMAIL, { sessionAt: now - 60_000, stepUpAt: now - 11 * 60_000 })]);
    const page = await context.newPage();
    await page.route("https://accounts.google.com/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>stub</title>" }));
    const before = (await identities()).counts.all;

    await page.goto("/settings");
    await page.getByLabel("Add an email").fill(`stale-${stamp()}@example.com`);
    await page.getByRole("button", { name: "Add email" }).click();
    const dialog = page.getByRole("dialog", { name: "Confirm it's you" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("You signed in more than 10 minutes ago. Confirm with Google before you change who can sign in.")).toBeVisible();
    await expect(dialog.getByText("Nothing has been changed yet.")).toBeVisible();
    expect((await identities()).counts.all, "nothing was added").toBe(before);

    // Cancel closes it; Add again and Continue
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(dialog).toBeHidden();
    await page.getByRole("button", { name: "Add email" }).click();
    await dialog.getByRole("button", { name: "Continue with Google" }).click();
    await page.waitForURL(/accounts\.google\.com/);
    const u = new URL(page.url());
    expect(u.searchParams.get("prompt")).toBe("select_account");
    expect(u.searchParams.get("redirect_uri")).toMatch(/\/api\/auth\/callback\/google-confirm$/);
    await context.close();
  });

  test("a confirmation by another Google account lands on Settings with the failed notice", async ({ browser }) => {
    const context = await browser.newContext({ storageState: UNSIGNED });
    await context.addCookies([await cookieFor(OWNER_EMAIL)]);
    const page = await context.newPage();
    await page.goto("/settings?stepup=failed");
    const dialog = page.getByRole("dialog", { name: "Confirm it's you" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("! That account is not the one signed in. Nothing was changed.")).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await context.close();
  });
});
