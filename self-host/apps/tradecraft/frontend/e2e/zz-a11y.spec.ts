import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { fillTrade, makeAccount, makeTrade, tradesFor, uniq } from "./helpers";

// Accessibility pass (FR-024): WCAG 2 A and AA rules, which include text contrast of at least 4.5:1,
// on the five screens in the light and in the night colour set.

async function clean(page: Page, name: string) {
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const summary = r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.help} — ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join("; ")}`);
  expect(summary, `${name}: accessibility violations`).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    test("L1 trades list, its empty and deleted states", async ({ page }) => {
      const acct = await makeAccount(uniq("A11y"));
      await makeTrade(acct.id, { instrument: "AX1" });
      await makeTrade(acct.id, { instrument: "AX2", dollarsPerPoint: null, stopPrice: null, cost: "0", typedResult: "-80.00" });
      await page.goto(tradesFor(acct.id));
      await expect(page.getByRole("row", { name: /AX1/ })).toBeVisible();
      await clean(page, "L1 filled");
      await page.goto(`/trades?account=${acct.id}&from=2030-01-01&to=2030-01-02`);
      await expect(page.getByText("No trades for these filters.")).toBeVisible();
      await clean(page, "L1 no match");
    });

    test("L2 log a trade: empty, filled, with errors, and the typed result", async ({ page }) => {
      const acct = await makeAccount(uniq("A11yForm"));
      await page.goto("/trades/new");
      await clean(page, "L2 new");
      await fillTrade(page, {
        account: acct.name, instrument: "", direction: "Long", size: "0",
        entryPrice: "1", entryDate: "2025-10-01", entryTime: "10:00", exitPrice: "2", exitDate: "2025-10-01", exitTime: "09:00",
        dollarsPerPoint: "20", cost: "1", stopPrice: "0.5", thesis: "because",
      });
      await expect(page.getByRole("region", { name: "Result preview" })).toContainText("Risk");
      await clean(page, "L2 filled");
      await page.getByRole("button", { name: "Save trade" }).click();
      await expect(page.getByText(/things? to fix/)).toBeVisible();
      await clean(page, "L2 errors");
      await page.getByLabel(/Dollars per point/).fill("");
      await expect(page.getByLabel(/Result after costs/)).toBeVisible();
      await clean(page, "L2 typed result");
    });

    test("L3 accounts and L4 dialog", async ({ page }) => {
      await makeAccount(uniq("A11yAcct"));
      await page.goto("/accounts");
      await clean(page, "L3");
      await page.getByRole("button", { name: "New account" }).first().click();
      await expect(page.getByRole("dialog", { name: "New account" })).toBeVisible();
      await clean(page, "L4 new");
      await page.getByRole("dialog").getByLabel(/Trading-day start/).fill("00:00");
      await page.getByRole("button", { name: "Save account" }).click();
      await expect(page.getByText(/Start time cannot be 00:00/)).toBeVisible();
      await clean(page, "L4 error");
    });

    test("L5 settings", async ({ page }) => {
      await page.goto("/settings");
      await expect(page.getByText("Current time in this zone:")).toContainText(/\d{2}:\d{2}/);
      await clean(page, "L5");
    });
  });
}

test("the form controls work from the keyboard", async ({ page }) => {
  const acct = await makeAccount(uniq("Keys"));
  await page.goto("/trades/new");
  await page.getByLabel("Account", { exact: true }).focus();
  await page.keyboard.press("ArrowDown"); // choose the first option that is not the placeholder
  const chosen = await page.getByLabel("Account", { exact: true }).evaluate((s: HTMLSelectElement) => s.value);
  expect(chosen).not.toBe("");
  await page.getByLabel("Instrument").focus();
  await page.keyboard.type("NQ");
  await page.keyboard.press("Tab"); // Long radio
  await page.keyboard.press("ArrowRight"); // Short
  await page.keyboard.press("ArrowLeft"); // Long
  await expect(page.getByLabel("Long")).toBeChecked();
  void acct;
});
