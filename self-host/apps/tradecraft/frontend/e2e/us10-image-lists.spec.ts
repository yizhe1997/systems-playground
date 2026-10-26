import { expect, test } from "@playwright/test";
import { makeAccount, makePng, makeTrade, tradesFor, uniq, uploadImage } from "./helpers";

// Feature 004, user story 2 (screen C5) and the safety of serving (story 4).

test("the Trades list shows each trade's image count as a link to its Images section; the account name is a link that keeps the filters", async ({ page }) => {
  const acct = await makeAccount(uniq("ImgList"));
  const other = await makeAccount(uniq("ImgOther"));
  const withTwo = await makeTrade(acct.id, { instrument: "TWO2" });
  await makeTrade(acct.id, { instrument: "NONE0" });
  await makeTrade(other.id, { instrument: "OTHR1" });
  expect((await uploadImage(withTwo.id, makePng(3, 3), "a.png")).status).toBe(201);
  expect((await uploadImage(withTwo.id, makePng(4, 3), "b.png")).status).toBe(201);

  await page.goto(tradesFor(acct.id));
  const row = page.getByRole("row", { name: /TWO2/ });
  await expect(row.getByRole("link", { name: /^2 images on / })).toHaveText("2");
  await expect(page.getByRole("row", { name: /NONE0/ }).getByRole("link", { name: /images? on / })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Images" })).toHaveAttribute("title", "How many screenshots this trade has.");

  // the count opens the trade's edit screen at its Images section
  await row.getByRole("link", { name: /^2 images on / }).click();
  await expect(page).toHaveURL(new RegExp(`/trades/${withTwo.id}/edit#images$`));
  await expect(page.locator("#images").getByRole("img")).toHaveCount(2);

  // the account name shows that account's trades, the other filters kept
  await page.goto(tradesFor(acct.id));
  await page.getByRole("row", { name: /NONE0/ }).getByRole("link", { name: acct.name }).click();
  await expect(page).toHaveURL(new RegExp(`account=${acct.id}`));
  await expect(page).toHaveURL(/from=&to=/);
  await expect(page.getByRole("row", { name: /NONE0/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /OTHR1/ })).toHaveCount(0);
});

test("an image's address refuses a caller with no session, and answers the owner with headers that only let a browser display it", async ({ page, playwright, baseURL }) => {
  const acct = await makeAccount(uniq("ImgSafe"));
  const t = await makeTrade(acct.id, { instrument: "SAFE1" });
  const up = await uploadImage(t.id, makePng(3, 3), "safe name.png");
  expect(up.status).toBe(201);
  const address = `/api/images/${up.data.id}`;

  const anon = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  const refused = await anon.get(address, { maxRedirects: 0 });
  expect([401, 403, 302, 307]).toContain(refused.status());
  expect(refused.headers()["content-type"] ?? "").not.toContain("image/");
  await anon.dispose();

  const res = await page.request.get(address);
  expect(res.status()).toBe(200);
  const h = res.headers();
  expect(h["content-type"]).toBe("image/png");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["content-security-policy"]).toContain("sandbox");
  expect(h["content-disposition"]).toBe("inline");
  const dl = await page.request.get(`${address}?download=1`);
  expect(dl.headers()["content-disposition"]).toContain("attachment");
  expect(dl.headers()["content-disposition"]).toContain("safe name.png");

  // opened on its own, the address shows the picture and nothing else
  await page.goto(address);
  await expect(page.locator("img")).toHaveCount(1);
  expect(await page.evaluate(() => document.contentType)).toBe("image/png");
});
