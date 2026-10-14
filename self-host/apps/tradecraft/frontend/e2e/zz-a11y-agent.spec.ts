import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { api, makeAccount, makeTrade, uniq, rowAction } from "./helpers";

// Accessibility pass for feature 003 (FR-023): WCAG 2 A and AA rules, which include text contrast of at least 4.5:1,
// on screens B1 to B8 in the light and in the night colour set, and the new controls from the keyboard alone.

// A token's value is on screen in one of these tests; keep it out of the Playwright output.
test.use({ trace: "off", screenshot: "off", video: "off" });

async function clean(page: Page, name: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.help} — ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join("; ")}`);
  expect(summary, `${name}: accessibility violations`).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    test("B1 account form (new Live, new Backtest, changing the kind) and B2 the list", async ({ page }) => {
      const bt = await makeAccount(uniq("A11y BT"), "USD", undefined, "backtest");
      await page.goto("/accounts");
      await expect(page.getByRole("columnheader", { name: "Kind" })).toBeVisible();
      await clean(page, "B2 list");

      await page.getByRole("button", { name: "New account" }).first().click();
      const dialog = page.getByRole("dialog", { name: "New account" });
      await expect(dialog).toContainText("Counts in your reviews, trades and mistake counter.");
      await clean(page, "B1 new Live");
      await dialog.getByText("Backtest", { exact: true }).click();
      await expect(dialog).toContainText("Kept apart from live trading");
      await clean(page, "B1 new Backtest");
      await page.keyboard.press("Escape");

      await rowAction(page, bt.name, "Edit");
      const edit = page.getByRole("dialog", { name: "Edit account" });
      await edit.getByText("Live", { exact: true }).click();
      await expect(edit).toContainText("Changing the kind moves this account's days and trades");
      await clean(page, "B1 changing the kind");
    });

    test("B3 Reviews of a backtest, B4 Trades list with Show backtests, B5 the counter's chooser", async ({ page }) => {
      const bt = await makeAccount(uniq("A11y BT3"), "USD", undefined, "backtest");
      const live = await makeAccount(uniq("A11y Live3"));
      await makeTrade(bt.id, { instrument: "A11YB" });
      await makeTrade(live.id, { instrument: "A11YL" });

      await page.goto(`/reviews?account=${bt.id}&month=2025-10&open=2025-10-01`);
      await expect(page.getByText(/Backtest account: its days are never marked Missing/)).toBeVisible();
      await clean(page, "B3");

      await page.goto("/trades?from=&to=");
      await expect(page.getByText(/Backtests are hidden/)).toBeVisible();
      await clean(page, "B4 off");
      await page.locator("label.switch", { hasText: "Show backtests" }).click();
      await expect(page).toHaveURL(/backtests=1/);
      await expect(page.getByText(/backtests included/)).toBeVisible();
      await clean(page, "B4 on");

      await page.goto("/mistakes");
      await expect(page.getByLabel("Account").locator("option").first()).toHaveText("All live accounts");
      await clean(page, "B5");
    });

    test("B6 Agent access (off, on with tokens), B7 New token (name it, an error, shown once) and B8 the Audit log", async ({ page }) => {
      await api("PUT", "/agent", { enabled: false });
      await page.goto("/settings/integrations");
      const card = page.getByRole("region", { name: "Agent access" });
      await expect(card.getByText(/Turn agent access on to create tokens\./)).toBeVisible();
      await clean(page, "B6 off");

      await card.locator("label.switch").click();
      await expect(card.getByRole("button", { name: "New token" })).toBeVisible();
      await clean(page, "B6 on");

      await card.getByRole("button", { name: "New token" }).click();
      const dialog = page.getByRole("dialog", { name: "New token" });
      await clean(page, "B7 name it");
      await dialog.getByRole("button", { name: "Create token" }).click();
      await expect(dialog.getByText("! Name is required.")).toBeVisible();
      await clean(page, "B7 error");
      await dialog.getByLabel("Name").fill(uniq("A11y token"));
      await dialog.getByRole("button", { name: "Create token" }).click();
      await expect(page.getByRole("dialog", { name: "Token created" })).toBeVisible();
      await clean(page, "B7 shown once");
      await page.getByRole("button", { name: "Done" }).click();
      await expect(page.getByRole("region", { name: "Agent access" }).getByRole("table")).toBeVisible();
      await clean(page, "B6 tokens");

      await page.goto("/audit?kind=agent_token_created");
      await expect(page.locator("tbody tr").first()).toContainText("Agent token created");
      await clean(page, "B8");
    });
  });
}

test("keyboard only: the kind choice, the switch and the new token dialog", async ({ page }) => {
  await api("PUT", "/agent", { enabled: true });
  await page.goto("/accounts");
  await page.getByRole("button", { name: "New account" }).first().click();
  const dialog = page.getByRole("dialog", { name: "New account" });
  await dialog.getByLabel("Name").focus();
  await page.keyboard.press("Tab"); // currency
  await page.keyboard.press("Tab"); // trading-day start
  await page.keyboard.press("Tab"); // kind: Live is checked
  await expect(dialog.getByRole("radio", { name: "Live" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("radio", { name: "Backtest" })).toBeChecked();
  await page.keyboard.press("Escape");

  await page.goto("/settings/integrations");
  const card = page.getByRole("region", { name: "Agent access" });
  await card.getByRole("button", { name: "New token" }).focus();
  await page.keyboard.press("Enter");
  const token = page.getByRole("dialog", { name: "New token" });
  await expect(token.getByLabel("Name")).toBeFocused(); // focus starts in the field
  await page.keyboard.type(uniq("Keyboard"));
  await page.keyboard.press("Enter"); // submits
  const shown = page.getByRole("dialog", { name: "Token created" });
  await expect(shown).toBeVisible();
  await page.keyboard.press("Escape"); // does not close it: the value cannot be shown again
  await expect(shown).toBeVisible();
  await shown.getByRole("button", { name: "Done" }).focus();
  await page.keyboard.press("Enter");
  await expect(shown).toBeHidden();
});
