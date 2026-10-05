import { expect, test } from "@playwright/test";
import { api, uniq } from "./helpers";
import { dayUrl, sampleDay } from "./helpers_reviews";

const counterUrl = (date: string, period = "week") => `/mistakes?period=${period}&date=${date}`;

test("tag in the drawer, record one for the day, read the counter, reach a stop line", async ({ page }) => {
  const s = await sampleDay("Habit");
  const rush = uniq("Rush");
  const m = await api("POST", "/mistakes", { name: rush });
  expect(m.status).toBe(201);

  await page.goto(dayUrl(s.id));
  for (const t of [/^Judge NQ Long at 10:31/, /^Judge NQ Long at 10:52/]) {
    await page.getByRole("button", { name: t }).click();
    const drawer = page.getByRole("dialog");
    await drawer.getByLabel("No", { exact: true }).check();
    await expect(drawer.getByText("Which mistakes?")).toHaveCount(0);
    await drawer.getByLabel(/^Mistake/).check();
    await expect(drawer.getByText("Nothing tagged yet.")).toBeVisible();
    await drawer.getByLabel(rush).check();
    await drawer.getByRole("button", { name: "Save", exact: true }).click();
    await expect(drawer).toBeHidden();
  }
  // the day shows the tags and the numbers strip lists them
  await expect(page.getByText(`${rush} x2`)).toBeVisible();

  // one record for the whole day, saved at once
  await page.getByLabel("Mistake for the whole day").selectOption({ label: rush });
  await page.getByRole("button", { name: "+ Add a mistake" }).click();
  await expect(page.getByRole("button", { name: `Remove ${rush}` })).toBeVisible();
  await expect(page.getByText(`${rush} x3`)).toBeVisible();

  // the counter: 2 on trades, 1 on the day, with the split by account
  await page.goto(counterUrl("2025-10-01"));
  const row = page.getByRole("row", { name: new RegExp(rush) });
  await expect(row).toContainText("2 on trades · 1 on the day");
  await expect(row).toContainText(`${s.name} 3`);
  await expect(row).toContainText("none set");
  await expect(row).toContainText("Count only");
  await expect(page.getByText("Each record counts once")).toBeVisible();

  // the stop line editor: 0 is refused, 3 is reached
  await page.getByRole("row", { name: new RegExp(rush) }).getByRole("button", { name: `Stop line ${rush}` }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(`When the count reaches this number, ${rush} shows STOP TRADING. It is advice. It does not block you.`)).toBeVisible();
  await dialog.getByLabel("Stop line", { exact: true }).fill("0");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("! Stop line must be 1 or more.")).toBeVisible();
  await dialog.getByLabel("Stop line", { exact: true }).fill("3");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("row", { name: new RegExp(rush) })).toContainText("STOP TRADING: 3 of 3 this week");
  // last week shows what happened last week: nothing, so the empty state; the line is still set in the list
  await page.goto(counterUrl("2025-09-24"));
  await expect(page.getByText("No mistakes tagged in this week.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to the daily review" })).toBeVisible();
});

test("rename and retire from the list, with the Undo notice", async ({ page }) => {
  const name = uniq("Hesitated");
  await api("POST", "/mistakes", { name });
  await page.goto("/mistakes");
  const item = () => page.locator(".manage-list li", { hasText: name });

  await item().getByRole("button", { name: `Rename ${name}` }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("chased ENTRY");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog.getByText("! A mistake named chased ENTRY already exists. Names are not case sensitive.")).toBeVisible();
  const renamed = name + " late";
  await dialog.getByLabel("Name").fill(renamed);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator(".manage-list li", { hasText: renamed })).toBeVisible();

  await page.locator(".manage-list li", { hasText: renamed }).getByRole("button", { name: `Retire ${renamed}` }).click();
  await expect(dialog.getByText(`Retire ${renamed}?`)).toBeVisible();
  await expect(dialog.getByText("It stops appearing in new tags. Past trades keep it, so history and counts stay correct.")).toBeVisible();
  await dialog.getByRole("button", { name: "Retire", exact: true }).click();
  await expect(page.getByText("Mistake retired.")).toBeVisible();
  await expect(page.locator(".manage-list li", { hasText: renamed })).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator(".manage-list li", { hasText: renamed })).toBeVisible();

  // adding a retired name brings it back
  await api("POST", `/mistakes/${(await api("GET", "/mistakes")).data.find((x: any) => x.name === renamed).id}/retire`);
  await page.reload();
  await page.getByLabel("Add a mistake").fill(renamed.toUpperCase());
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await expect(page.locator(".manage-list li", { hasText: renamed })).toBeVisible();
});

test("nothing tagged yet", async ({ page }) => {
  await page.goto(counterUrl("2019-03-06", "month"));
  await expect(page.getByText("No mistakes tagged in this month.")).toBeVisible();
  await expect(page.getByText("Tag them while you judge a trade in your daily review.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Manage the list" })).toBeVisible();
});
