import { expect, test } from "@playwright/test";
import { api, hasNoAccounts, makeAccount, uniq } from "./helpers";
import { answer, dayUrl, reviewsUrl, sampleDay } from "./helpers_reviews";

// Runs before the first-run spec of feature 000 (file order), so it only looks at the empty journal and creates nothing.
test("Reviews with no account says Create an account first.", async ({ page }) => {
  test.skip(!(await hasNoAccounts()), "needs an empty journal; scripts/test.sh gives each run a fresh one");
  await page.goto("/reviews");
  await expect(page.getByText("Create an account first.")).toBeVisible();
  await expect(page.getByText("Every review belongs to an account.")).toBeVisible();
  await page.goto("/reviews/day");
  await expect(page.getByText("Create an account first.")).toBeVisible();
});

test("the evening: find the day, read the figures, answer, grade and mark it reviewed in under five minutes (SC-001)", async ({ page }) => {
  const s = await sampleDay("Evening");
  const started = Date.now();
  await page.goto(reviewsUrl(s.id));
  // the week of 29 Sep to 5 Oct is under October, with the day Missing
  await expect(page.getByText("Week of 29 Sep to 5 Oct")).toBeVisible();
  await page.getByText("Week of 29 Sep to 5 Oct").click(); // collapsed (not the current week): open it
  await expect(page.getByText("Missing").first()).toBeVisible();
  await page.getByRole("link", { name: /Review Wednesday 1 October 2025/ }).click();

  await expect(page.getByRole("heading", { name: "Daily review" })).toBeVisible();
  await expect(page.getByText("Wednesday 1 October 2025 · " + s.name)).toBeVisible();
  // the figures of the sample day, with their process figure beside them
  await expect(page.getByText("+$45.00", { exact: true })).toBeVisible();
  await expect(page.getByText("Plan followed on 0 of 3 trades")).toBeVisible();
  await expect(page.getByText("3 not judged yet")).toBeVisible();
  await expect(page.getByText("1 winning trade of 3 · 33%")).toBeVisible();
  await expect(page.getByText("of 2 losing trades")).toBeVisible();
  await expect(page.getByText("How these are counted: followed = answered Yes")).toBeVisible();
  await expect(page.getByText("3 trades are not judged yet.")).toBeVisible();
  await expect(page.getByText("Yesterday: nothing to show")).toBeVisible();
  await expect(page.getByText("No focus for this week yet.")).toBeVisible();
  await expect(page.getByText("Day total +$45.00 across 3 trades, 0 followed the plan.")).toBeVisible();

  await answer(page, { didWell: "Waited for the close.", couldImprove: "Entered early.", nextFocus: "Wait for the candle close before entering." });
  await page.getByRole("group", { name: "Mental grade" }).getByLabel("4 of 5").check();
  await page.getByRole("group", { name: "Technical grade" }).getByLabel("5 of 5").check();
  await expect(page.getByText("4 of 5", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mark as reviewed" }).click();
  await expect(page.getByText(/· Reviewed /)).toBeVisible();
  await expect(page.locator(".chip-solid", { hasText: "Reviewed" })).toBeVisible();
  expect(Date.now() - started, "from opening Reviews to a reviewed day").toBeLessThan(5 * 60_000);

  // it stays editable and says when it was edited
  await page.getByLabel("What did I do well today?").fill("Waited for the close. Took the stop.");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText(/· Edited /)).toBeVisible();
  await expect(page.locator(".chip-solid", { hasText: "Reviewed" })).toBeVisible();
});

test("the morning: tomorrow's review opens with yesterday's answer at the top", async ({ page }) => {
  const s = await sampleDay("Morning");
  await page.goto(dayUrl(s.id));
  await answer(page, { nextFocus: "No adds to losers." });
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: /Thu 2 Oct/ }).click();
  await expect(page.getByText("Yesterday: Wed 1 Oct")).toBeVisible();
  await expect(page.getByText("No adds to losers.").first()).toBeVisible();
  // days later it is still the nearest earlier one, labelled with its own date
  await page.goto(dayUrl(s.id, "2025-10-06"));
  await expect(page.getByText("Yesterday: Wed 1 Oct")).toBeVisible();
});

test("an empty day opens with its empty state and the questions still work", async ({ page }) => {
  const acct = await makeAccount(uniq("EmptyDay"));
  await page.goto(dayUrl(acct.id, "2025-10-15"));
  await expect(page.getByText(`No trades on Wed 15 Oct for ${acct.name}.`)).toBeVisible();
  await expect(page.getByText("You can still write what you will focus on next session. Trades logged later appear here.")).toBeVisible();
  await expect(page.getByText("Net result").first()).toBeVisible();
  await expect(page.getByText("no trades").first()).toBeVisible(); // a dash with its reason
  await answer(page, { nextFocus: "A+ setups only." });
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible();
});

test("a day that has not happened yet cannot be marked reviewed", async ({ page }) => {
  const acct = await makeAccount(uniq("Future"));
  await page.goto(dayUrl(acct.id, "2099-01-01"));
  await expect(page.getByText("! This day has not happened yet. Mark as reviewed is unavailable.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark as reviewed" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save draft" })).toBeEnabled();
});

test("leaving a daily review with typed answers asks first", async ({ page }) => {
  const s = await sampleDay("Leave");
  await page.goto(dayUrl(s.id));
  await answer(page, { didWell: "typed but not saved" });
  await page.getByRole("link", { name: "Trades" }).click();
  const prompt = page.getByRole("dialog", { name: "Leave without saving?" });
  await expect(prompt).toContainText("Your changes will be lost.");
  await prompt.getByRole("button", { name: "Keep editing" }).click();
  await expect(page).toHaveURL(/\/reviews\/day/);
  await expect(page.getByLabel("What did I do well today?")).toHaveValue("typed but not saved");
});

test("trades changed after review are noted, and a save from an old copy is refused", async ({ page }) => {
  const s = await sampleDay("Changed");
  await page.goto(dayUrl(s.id));
  await page.getByRole("button", { name: "Mark as reviewed" }).click();
  await expect(page.locator(".chip-solid", { hasText: "Reviewed" })).toBeVisible();
  // a trade is changed through the 000 API after the review
  const t = (await api("GET", `/trades/${s.w}`)).data;
  const edit = await api("PUT", `/trades/${s.w}`, {
    accountId: s.id, instrument: "NQ", direction: "long", size: "1", cost: "0", dollarsPerPoint: "20",
    entryAt: "2025-10-01T09:41", exitAt: "2025-10-01T09:58", entryPrice: "21450.00", exitPrice: "21466.00", expectedUpdatedAt: t.updatedAt,
  });
  expect(edit.status).toBe(200);
  await page.goto(dayUrl(s.id));
  await expect(page.getByText(/1 trade changed after you marked this review as reviewed on/)).toBeVisible();
  await expect(page.getByText("Check your answers still fit. They stay editable.")).toBeVisible();

  // another window saves first; this copy is now out of date
  await page.getByLabel("What did I do well today?").fill("from this window");
  const day = (await api("GET", `/reviews/day?accountId=${s.id}&date=2025-10-01`)).data;
  expect((await api("PUT", "/reviews/day", { accountId: s.id, date: "2025-10-01", didWell: "from elsewhere", expectedUpdatedAt: day.updatedAt })).status).toBe(200);
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("! This review was changed elsewhere. Reload to see the latest version.")).toBeVisible();
  await page.getByRole("button", { name: "Reload" }).click();
  await expect(page.getByLabel("What did I do well today?")).toHaveValue("from elsewhere");
});

test("the account switcher opens the first active account by name, keeps the account, and lists archived ones", async ({ page }) => {
  const a = await sampleDay("SwitchA");
  const b = await makeAccount(uniq("SwitchB"));
  const gone = await makeAccount(uniq("SwitchGone"));
  await api("POST", `/accounts/${gone.id}/archive`);

  await page.goto("/reviews");
  const select = page.getByLabel("Account", { exact: true });
  const options = await select.locator("option").allTextContents();
  const firstActive = options.find((o) => !o.endsWith("(archived)"));
  await expect(select.locator("option:checked")).toHaveText(firstActive!);
  expect(options).toContain(`${gone.name} (archived)`);

  await select.selectOption({ value: a.id });
  await expect(page).toHaveURL(new RegExp(`account=${a.id}`));
  await page.goto(reviewsUrl(a.id));
  await page.getByText("Week of 29 Sep to 5 Oct").click();
  await page.getByRole("link", { name: /Review Wednesday 1 October 2025/ }).click();
  await expect(page).toHaveURL(new RegExp(`account=${a.id}`)); // kept on the way to a day
  await expect(page.getByLabel("Account", { exact: true })).toHaveValue(a.id);

  // an archived account's past reviews stay readable and editable
  await page.goto(dayUrl(gone.id));
  await expect(page.getByLabel("Account", { exact: true })).toHaveValue(gone.id);
  await answer(page, { didWell: "still editable" });
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible();
  void b;
});
