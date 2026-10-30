import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { makeAccount, makeTrade, uniq } from "./helpers";
import { OCTOBER, analyticsUrl, homeUrl, referenceMonth } from "./helpers_analytics";

// Not a check: it captures the built screens of feature 005 (H1 to H4) for the visual review, in a folder outside the
// repository. Run it on a fresh stack (the empty states need an account with no trades first):
//   CAPTURE_SCREENS=light npx playwright test e2e/zz-screens-home.spec.ts   (and =dark)
const scheme = process.env.CAPTURE_SCREENS;
const out = process.env.CAPTURE_DIR ?? path.join(tmpdir(), "tradecraft-built", "005-home-and-analytics");

test.skip(!scheme, "set CAPTURE_SCREENS=light or dark to capture the built screens");
test.use({ colorScheme: scheme === "dark" ? "dark" : "light", trace: "off", screenshot: "off", video: "off" });

async function shot(page: Page, name: string, full = true) {
  mkdirSync(out, { recursive: true });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, `${name}-${scheme}.png`), fullPage: full });
}

test("capture", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 900 });

  // H1 nothing yet: an account with no trades
  const empty = await makeAccount(uniq("Empty"));
  await page.goto(`/?period=all&account=${empty.id}`);
  await expect(page.getByText("No trades yet.")).toBeVisible();
  await shot(page, "h1-home-nothing-yet", false);

  const ref = await referenceMonth("Funded 50K");
  await page.goto(homeUrl(ref.id));
  await expect(page.getByRole("region", { name: "Needs you" })).toBeVisible();
  await shot(page, "h1-home-filled");
  await page.goto(`/?period=custom&from=2019-01-01&to=2019-12-31&account=${ref.id}`);
  await shot(page, "h1-home-no-trades-in-period", false);

  const bare = await makeAccount(uniq("Unjudged"));
  for (const d of ["01", "02", "05"]) await makeTrade(bare.id, { entryAt: `2026-10-${d}T09:41`, exitAt: `2026-10-${d}T09:58` });
  await page.goto(homeUrl(bare.id));
  await shot(page, "h1-home-only-unjudged", false);

  // two currencies: the whole of October for both currencies is the all-accounts scope
  const eur = await makeAccount(uniq("Beta EUR"), "EUR");
  for (const [d, x] of [["14", 1100], ["16", 1040], ["19", 980]] as const) await makeTrade(eur.id, { entryAt: `2026-10-${d}T09:41`, exitAt: `2026-10-${d}T09:58`, entryPrice: "1000", exitPrice: String(x), dollarsPerPoint: "1", size: "1", cost: "0", stopPrice: "900" });
  await page.goto(`/?${OCTOBER}`);
  await expect(page.getByRole("heading", { name: "EUR accounts" })).toBeVisible();
  await shot(page, "h1-home-two-currencies");

  // H4 the controls
  await page.goto(`/?${OCTOBER}&account=${ref.id}`);
  await page.getByLabel("Period", { exact: true }).focus();
  await shot(page, "h4-period-control", false);
  await page.goto(`/?period=custom&from=2026-10-31&to=2026-10-01&account=${ref.id}`);
  await shot(page, "h4-invalid-range", false);

  // H2 Analytics
  await page.goto(analyticsUrl(ref.id));
  await expect(page.getByRole("row", { name: /^Net result/ })).toBeVisible();
  await shot(page, "h2-analytics-filled");
  await page.getByRole("row", { name: /^Profit factor/ }).getByText("Definition").click();
  await shot(page, "h2-analytics-definition", false);
  await page.goto(`/analytics?period=custom&from=2026-10-01&to=2026-10-01&account=${ref.id}`);
  await shot(page, "h2-analytics-few-trades", false);
  await page.goto(analyticsUrl(ref.id, "", "&band=40"));
  await shot(page, "h2-analytics-band-on", false);

  // H3 Rule replay
  await page.goto(analyticsUrl(ref.id, "/replay"));
  await expect(page.getByText("Rule replay").first()).toBeVisible();
  await shot(page, "h3-replay-filled");
  await page.goto(`/analytics/replay?${OCTOBER}&account=${bare.id}`);
  await shot(page, "h3-replay-nothing-judged", false);
});
