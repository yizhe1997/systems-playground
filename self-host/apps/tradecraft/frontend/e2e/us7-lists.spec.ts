import { expect, test } from "@playwright/test";
import { makeAccount, makeTrade, tradesFor, uniq } from "./helpers";

// The list polish: the row menu (kebab), columns the owner can move, and the sidebar that stays put.

test("the row menu opens by keyboard, lists Edit and Delete, and Escape closes it", async ({ page }) => {
  const acct = await makeAccount(uniq("Kebab"));
  await makeTrade(acct.id, { instrument: "KB1" });
  await page.goto(tradesFor(acct.id));

  const trigger = page.getByRole("button", { name: /Actions for KB1/ });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("menuitem", { name: "Edit", exact: true })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "Delete", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menuitem", { name: "Edit", exact: true })).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("columns are dragged into the order you like, a cell follows its heading, and the order is remembered", async ({ page }) => {
  const acct = await makeAccount(uniq("Cols"));
  await makeTrade(acct.id, { instrument: "CL1" });
  await page.goto(tradesFor(acct.id));
  const heads = async () => (await page.locator("thead th").allInnerTexts()).map((t) => t.trim());

  expect((await heads()).slice(0, 3)).toEqual(["Entry time", "Exit time", "Trading day"]);
  await page.getByRole("columnheader", { name: "Instrument" }).dragTo(page.getByRole("columnheader", { name: "Entry time" }));
  expect((await heads())[0]).toBe("Instrument");
  await expect(page.locator("tbody tr").first().locator("td").first()).toHaveText("CL1");

  // the same order after a reload, with nothing jumping: the server drew it
  await page.reload();
  expect((await heads())[0]).toBe("Instrument");

  // the keyboard: Alt and the arrows on a focused heading
  const instrument = page.locator("button.col-head", { hasText: "Instrument" });
  await instrument.focus();
  await page.keyboard.press("Alt+ArrowRight");
  expect((await heads())[1]).toBe("Instrument");
  await expect(instrument).toBeFocused();

  await page.getByRole("button", { name: "Reset column order" }).click();
  expect((await heads())[0]).toBe("Entry time");
  await expect(page.getByRole("button", { name: "Reset column order" })).toHaveCount(0);
});

test("the sidebar is the height of the window: the account menu stays in view however long the page is", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 700 });
  const acct = await makeAccount(uniq("Tall"));
  for (let i = 0; i < 10; i++) await makeTrade(acct.id, { instrument: `TL${i}` });
  await page.goto(tradesFor(acct.id));
  expect(await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight), "the page scrolls").toBe(true);

  const signOut = page.getByRole("button", { name: /^Signed in as/ });
  await expect(signOut).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(signOut).toBeInViewport();
});

test("the sidebar groups its pages, and Settings opens into General, Access and Integrations", async ({ page }) => {
  await page.goto("/trades");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("list", { name: "Journal" }).getByRole("link")).toHaveText(["Home", "Reviews", "Trades", "Mistakes", "Analytics"]);
  await expect(nav.getByRole("list", { name: "Manage" }).getByRole("link").first()).toHaveText("Accounts");
  await expect(nav.getByRole("link", { name: "Access", exact: true })).toHaveCount(0); // closed until you are in Settings

  await nav.getByRole("link", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(nav.getByRole("link", { name: "General" })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Access", exact: true }).click();
  await expect(page).toHaveURL(/\/settings\/access$/);
  await expect(page.getByRole("region", { name: "Access", exact: true })).toBeVisible();
  await nav.getByRole("link", { name: "Integrations" }).click();
  await expect(page).toHaveURL(/\/settings\/integrations$/);
  await expect(page.getByRole("region", { name: "Agent access" })).toBeVisible();
});

test("on a wide screen (the app is scaled) the row menu opens right under its button, inside the window", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  const acct = await makeAccount(uniq("Wide"));
  await makeTrade(acct.id, { instrument: "WD1" });
  await page.goto(tradesFor(acct.id));
  const trigger = page.getByRole("button", { name: /Actions for WD1/ });
  const t = (await trigger.boundingBox())!;
  await trigger.click();
  const item = (await page.getByRole("menuitem", { name: "Edit", exact: true }).boundingBox())!;
  expect(item.x, "inside the window, left").toBeGreaterThanOrEqual(0);
  expect(item.x + item.width, "inside the window, right").toBeLessThanOrEqual(1920);
  expect(item.y, "below the button").toBeGreaterThan(t.y + t.height - 4);
  expect(item.y, "next to the button, not a screen away").toBeLessThan(t.y + t.height + 60);
});

test("Accounts is paged like the other lists", async ({ page }) => {
  for (let i = 0; i < 11; i++) await makeAccount(uniq(`Pg${i}`));
  await page.goto("/accounts");
  await expect(page.getByText(/^Showing 1 to 10 of \d+$/)).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(10);
  await page.getByRole("link", { name: "Older" }).click();
  await expect(page.getByText(/^Showing 11 to /)).toBeVisible();
});
