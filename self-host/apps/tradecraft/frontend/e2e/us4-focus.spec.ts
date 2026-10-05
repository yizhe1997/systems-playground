import { expect, test } from "@playwright/test";
import { makeAccount, uniq } from "./helpers";
import { dayUrl, reviewsUrl } from "./helpers_reviews";

// The focus is the owner's and shared by every account, so this spec keeps to a week no other spec uses.
const DAY = "2024-03-06"; // Wed; the week of 4 Mar to 10 Mar 2024, the month of March 2024
const WEEK_TEXT = "A+ setups only. Maximum three trades a day.";

test("write, replace, clear and undo a week and a month focus from the daily review", async ({ page }) => {
  const a = await makeAccount(uniq("Focus A"));
  const b = await makeAccount(uniq("Focus B"));
  await page.goto(dayUrl(a.id, DAY));
  await expect(page.getByText("No focus for this week yet.")).toBeVisible();
  await expect(page.getByText("No focus for this month yet.")).toBeVisible();

  await page.getByRole("button", { name: "Write the focus for the week" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Write a focus" })).toBeVisible();
  await expect(dialog.getByRole("tab", { name: "Week" })).toHaveAttribute("aria-selected", "true");
  const box = dialog.getByLabel("Focus for the week of 4 Mar to 10 Mar");
  await box.fill(WEEK_TEXT);
  await expect(dialog.getByText("43 of 280 characters")).toBeVisible();
  await expect(dialog.getByText("Shown at the top of every daily review this week, on all your accounts.")).toBeVisible();

  // too long: the message, and Save focus is unavailable
  await box.fill("x".repeat(307));
  await expect(dialog.getByText("307 of 280 characters")).toBeVisible();
  await expect(dialog.getByText("! Too long: 27 characters over. Shorten it to save.")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Save focus" })).toBeDisabled();
  await box.fill(WEEK_TEXT);
  await dialog.getByRole("button", { name: "Save focus" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(WEEK_TEXT)).toBeVisible();

  // the Month tab has its own label and text
  await page.getByRole("button", { name: "Write the focus for the month" }).click();
  await dialog.getByRole("tab", { name: "Month" }).click();
  await dialog.getByLabel("Focus for March 2024").fill("Grade every trade.");
  await dialog.getByRole("button", { name: "Save focus" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Grade every trade.")).toBeVisible();

  // every account's review shows both
  await page.goto(dayUrl(b.id, "2024-03-08"));
  await expect(page.getByText(WEEK_TEXT)).toBeVisible();
  await expect(page.getByText("Grade every trade.")).toBeVisible();
  // the next week shows the month and no week focus
  await page.goto(dayUrl(b.id, "2024-03-12"));
  await expect(page.getByText("No focus for this week yet.")).toBeVisible();
  await expect(page.getByText("Grade every trade.")).toBeVisible();

  // leaving with changes asks first
  await page.goto(dayUrl(a.id, DAY));
  await page.getByRole("button", { name: "Edit the focus for the week" }).click();
  await dialog.getByLabel("Focus for the week of 4 Mar to 10 Mar").fill("Changed my mind");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog.getByText("Leave without saving?")).toBeVisible();
  await dialog.getByRole("button", { name: "Keep editing" }).click();
  await expect(dialog.getByLabel("Focus for the week of 4 Mar to 10 Mar")).toHaveValue("Changed my mind");

  // clear, then Undo within the notice
  await dialog.getByRole("button", { name: "Clear this focus" }).click();
  await expect(page.getByText("Focus cleared.")).toBeVisible();
  await expect(page.getByText("No focus for this week yet.")).toBeVisible();
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText(WEEK_TEXT)).toBeVisible();
});

test("the month card of Reviews writes and edits the month focus", async ({ page }) => {
  const a = await makeAccount(uniq("Focus C"));
  await page.goto(reviewsUrl(a.id, "2024-05"));
  await expect(page.getByText("No focus for this month yet.")).toBeVisible();
  await page.getByRole("button", { name: "Write the focus for the month" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("tab")).toHaveCount(0);
  await dialog.getByLabel("Focus for May 2024").fill("Fewer trades, better trades.");
  await dialog.getByRole("button", { name: "Save focus" }).click();
  await expect(page.getByText("Fewer trades, better trades.")).toBeVisible();
  await page.getByRole("button", { name: "Edit the focus for the month" }).click();
  await expect(dialog.getByLabel("Focus for May 2024")).toHaveValue("Fewer trades, better trades.");
});
