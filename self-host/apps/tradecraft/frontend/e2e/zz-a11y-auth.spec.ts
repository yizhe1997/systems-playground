import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { OWNER_EMAIL, cookieFor } from "./auth";
import { api, makeAccount, uniq } from "./helpers";

// Accessibility pass for feature 002 (FR-024): WCAG 2 A and AA rules, text contrast of at least 4.5:1, on the sign-in
// screen, the Access card and its dialog, the Audit log and the sidebar block, in the light and in the night colour set.

async function clean(page: Page, name: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.help} — ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join("; ")}`);
  expect(summary, `${name}: accessibility violations`).toEqual([]);
}

const UNSIGNED = { cookies: [], origins: [] };

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    test("A1 sign in: default, refused and session ended", async ({ browser }) => {
      const context = await browser.newContext({ storageState: UNSIGNED, colorScheme: scheme });
      const page = await context.newPage();
      for (const [url, text] of [
        ["/sign-in", "Continue with Google"],
        ["/sign-in?reason=refused", "You can't sign in with that account."],
        ["/sign-in?reason=ended", "Your session ended. Sign in again."],
      ] as const) {
        await page.goto(url);
        await expect(page.getByText(text)).toBeVisible();
        await clean(page, `A1 ${url}`);
      }
      await context.close();
    });

    test("A2 Access and A5 the sidebar block", async ({ page }) => {
      await page.goto("/settings");
      await expect(page.getByRole("region", { name: "Access" })).toBeVisible();
      await expect(page.locator(".sidebar").getByText(OWNER_EMAIL)).toBeVisible();
      await clean(page, "A2 filled");
      // the error states
      const card = page.getByRole("region", { name: "Access" });
      await card.getByLabel("Add an email").fill("not-an-address");
      await card.getByRole("button", { name: "Add email" }).click();
      await expect(card.getByText("! Enter a valid email address, for example name@example.com.")).toBeVisible();
      await clean(page, "A2 add error");
    });

    test("A3 Confirm it's you, and its failed state", async ({ browser }) => {
      const context = await browser.newContext({ storageState: UNSIGNED, colorScheme: scheme });
      const now = Date.now();
      await context.addCookies([await cookieFor(OWNER_EMAIL, { sessionAt: now - 60_000, stepUpAt: now - 11 * 60_000 })]);
      const page = await context.newPage();
      await page.goto("/settings");
      await page.getByLabel("Add an email").fill("a11y@example.com");
      await page.getByRole("button", { name: "Add email" }).click();
      const dialog = page.getByRole("dialog", { name: "Confirm it's you" });
      await expect(dialog).toBeVisible();
      await clean(page, "A3 dialog");
      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
      await page.goto("/settings?stepup=failed");
      await expect(page.getByText("! That account is not the one signed in. Nothing was changed.")).toBeVisible();
      await clean(page, "A3 failed");
      await context.close();
    });

    test("A4 Audit log: filled, filtered and no match", async ({ page }) => {
      await page.goto("/audit");
      // on a fresh journal the log is empty: that state is checked too, then something is recorded
      if (await page.getByText("Nothing recorded yet.").isVisible()) {
        await expect(page.getByText("Sign-ins, identity changes, exports and other sensitive actions appear here, newest first.")).toBeVisible();
        await clean(page, "A4 nothing recorded yet");
      }
      const acct = await makeAccount(uniq("A11y audit"));
      await api("POST", `/accounts/${acct.id}/archive`);
      await page.goto("/audit");
      await expect(page.locator("tbody tr").first()).toBeVisible();
      await clean(page, "A4 filled");
      await page.getByLabel("What").selectOption({ index: 1 });
      await expect(page).toHaveURL(/kind=/);
      await clean(page, "A4 filtered");
      await page.getByLabel("Identity").selectOption({ label: "Not signed in" });
      await expect(page.getByText("No entries for these filters.")).toBeVisible();
      await clean(page, "A4 no match");
    });
  });
}

test("keyboard only: the filters, the Access actions and Sign out are reachable and labelled", async ({ page }) => {
  await page.goto("/audit");
  for (const name of ["Identity", "What"]) await expect(page.getByLabel(name)).toBeVisible();
  await page.getByLabel("Identity").focus();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("What")).toBeFocused();
  await page.goto("/settings");
  const buttons = page.getByRole("region", { name: "Access" }).getByRole("button");
  for (const b of await buttons.all()) {
    expect(((await b.innerText()) + ((await b.getAttribute("aria-label")) ?? "")).trim().length, "every button has a name").toBeGreaterThan(0);
  }
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
});
