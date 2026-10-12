import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { OWNER_EMAIL, cookieFor } from "./auth";
import { api, makeAccount, makeTrade, uniq } from "./helpers";

// Not a check: it captures the built screens of feature 002 for the visual review (a folder outside the repository).
// Run on a fresh stack (the empty Audit log is the first state):
//   CAPTURE_SCREENS=light npx playwright test e2e/zz-screens-auth.spec.ts   (and =dark)
const scheme = process.env.CAPTURE_SCREENS;
const out = process.env.CAPTURE_DIR ?? path.join(tmpdir(), "tradecraft-built", "002-sign-in-and-audit-log");

test.skip(!scheme, "set CAPTURE_SCREENS=light or dark to capture the built screens");
test.use({ colorScheme: scheme === "dark" ? "dark" : "light" });

async function shot(page: Page, name: string) {
  mkdirSync(out, { recursive: true });
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(out, `${name}-${scheme}.png`), fullPage: false });
}

test("capture", async ({ browser, page }) => {
  test.setTimeout(180_000);
  const unsigned = { cookies: [], origins: [] };

  // A1 sign in (no session)
  const anon = await browser.newContext({ storageState: unsigned, colorScheme: scheme === "dark" ? "dark" : "light", viewport: { width: 1440, height: 900 } });
  const ap = await anon.newPage();
  await ap.goto("/sign-in");
  await expect(ap.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await shot(ap, "a1-sign-in-default");
  await ap.goto("/sign-in?reason=refused");
  await expect(ap.getByText("You can't sign in with that account.")).toBeVisible();
  await shot(ap, "a1-sign-in-refused");
  await ap.goto("/sign-in?reason=ended");
  await expect(ap.getByText("Your session ended. Sign in again.")).toBeVisible();
  await shot(ap, "a1-sign-in-session-ended");
  await anon.close();

  // A4 the log before anything is recorded (only on a fresh journal)
  await page.goto("/audit");
  if (await page.getByText("Nothing recorded yet.").isVisible()) await shot(page, "a4-audit-nothing-recorded-yet");

  // data for the rest: a few identities, and each kind of entry
  const stamp = Date.now().toString(36);
  for (const e of [`second-${stamp}@example.com`, `old-address-${stamp}@example.com`]) await api("POST", "/identities", { email: e });
  const list = await api<{ identities: { id: string; email: string }[] }>("GET", "/identities");
  const old = list.data.identities.find((i) => i.email.startsWith("old-address"))!;
  await api("POST", `/identities/${old.id}/disable`);
  const acct = await makeAccount(uniq("Funded 50K"));
  const trade = await makeTrade(acct.id);
  await api("DELETE", `/trades/${trade.id}`);
  await api("POST", `/trades/${trade.id}/restore`);
  await api("PUT", "/settings", { timeZone: "America/New_York" });
  await api("PUT", "/settings", { timeZone: "America/Chicago" });
  await api("POST", `/accounts/${acct.id}/archive`);
  await api("POST", `/accounts/${acct.id}/restore`);
  await api("GET", "/export");

  // A2 Access
  await page.goto("/settings");
  const card = page.getByRole("region", { name: "Access", exact: true });
  await expect(card).toBeVisible();
  await shot(page, "a2-access-filled");
  await card.getByLabel("Add an email").fill("not-an-address");
  await card.getByRole("button", { name: "Add email" }).click();
  await expect(card.getByText("! Enter a valid email address, for example name@example.com.")).toBeVisible();
  await shot(page, "a2-access-add-error");
  await card.getByLabel("Add an email").fill(`second-${stamp}@example.com`);
  await card.getByRole("button", { name: "Add email" }).click();
  await expect(card.getByText("! That address is already on the list. Enable it instead.")).toBeVisible();
  await shot(page, "a2-access-already-listed");

  // A3 Confirm it's you (an older sign-in)
  const old11 = await browser.newContext({ storageState: unsigned, colorScheme: scheme === "dark" ? "dark" : "light", viewport: { width: 1440, height: 900 } });
  const now = Date.now();
  await old11.addCookies([await cookieFor(OWNER_EMAIL, { sessionAt: now - 60_000, stepUpAt: now - 11 * 60_000 })]);
  const op = await old11.newPage();
  await op.goto("/settings");
  await op.getByLabel("Add an email").fill("name@example.com");
  await op.getByRole("button", { name: "Add email" }).click();
  await expect(op.getByRole("dialog", { name: "Confirm it's you" })).toBeVisible();
  await shot(op, "a3-confirm-its-you-dialog");
  await op.goto("/settings?stepup=failed");
  await expect(op.getByText("! That account is not the one signed in. Nothing was changed.")).toBeVisible();
  await shot(op, "a3-confirm-its-you-failed");
  await old11.close();

  // A4 the log
  await page.goto("/audit");
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await shot(page, "a4-audit-filled");
  await page.getByLabel("What").selectOption({ label: "Trade deleted" });
  await expect(page).toHaveURL(/kind=trade_deleted/);
  await shot(page, "a4-audit-filtered");
  await page.getByLabel("Identity").selectOption({ label: "Not signed in" });
  await expect(page.getByText("No entries for these filters.")).toBeVisible();
  await shot(page, "a4-audit-no-match");

  // A5 the sidebar on an ordinary screen
  await page.goto("/reviews");
  await expect(page.locator(".sidebar").getByText(OWNER_EMAIL)).toBeVisible();
  await shot(page, "a5-sidebar-signed-in");
});
