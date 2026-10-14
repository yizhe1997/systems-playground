import { expect, test } from "@playwright/test";
import { makeAccount, makeTrade, tradesFor, uniq } from "./helpers";

// Exposure gate of docs/security-review.md: a full Content-Security-Policy set by the web tier, with a nonce for the
// scripts, and nothing of the app broken by it.

test("every page carries a strict script policy with a fresh nonce", async ({ page }) => {
  const nonces: string[] = [];
  for (const url of ["/trades", "/reviews", "/accounts"]) {
    const res = await page.goto(url);
    const csp = res!.headers()["content-security-policy"] ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    const script = csp.split(";").map((d) => d.trim()).find((d) => d.startsWith("script-src"))!;
    expect(script, "scripts run only with the nonce").toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
    expect(script).not.toContain("'unsafe-inline'");
    expect(script).not.toContain("'unsafe-eval'");
    nonces.push(script.match(/'nonce-([^']+)'/)![1]);
    // the scripts Next put in the page carry that nonce
    const unmarked = await page.evaluate(() => Array.from(document.scripts).filter((s) => !s.nonce && !s.src).length);
    expect(unmarked, `${url}: inline scripts without the nonce`).toBe(0);
  }
  expect(new Set(nonces).size, "a new nonce for every request").toBe(nonces.length);
});

test("the policy blocks nothing the app needs: no violation on the main screens and actions", async ({ page }) => {
  const violations: string[] = [];
  await page.addInitScript(() => {
    (window as unknown as { __csp: string[] }).__csp = [];
    document.addEventListener("securitypolicyviolation", (e) => {
      (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  page.on("console", (m) => {
    if (/Content Security Policy|violates the following/i.test(m.text())) violations.push(m.text());
  });
  const acct = await makeAccount(uniq("Csp"));
  await makeTrade(acct.id, { instrument: "CSP1" });
  for (const url of ["/reviews", tradesFor(acct.id), "/accounts", "/audit", "/settings", "/settings/access", "/settings/integrations", "/trades/new"]) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    violations.push(...(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)));
  }
  // a menu, a popover and a dialog: the pieces that position themselves with inline styles and scripts
  await page.goto(tradesFor(acct.id));
  await page.getByRole("button", { name: /Actions for CSP1/ }).click();
  await expect(page.getByRole("menuitem", { name: "Edit", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator("#f-range").click();
  await expect(page.locator(".range-popup")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/accounts");
  await page.getByRole("button", { name: "New account" }).first().click();
  await expect(page.getByRole("dialog", { name: "New account" })).toBeVisible();
  violations.push(...(await page.evaluate(() => (window as unknown as { __csp: string[] }).__csp)));
  expect(violations).toEqual([]);
});

test("the policy is really enforced: an inline event handler (what an injected tag would carry) does not run", async ({ page }) => {
  await page.goto("/reviews");
  const ran = await page.evaluate(async () => {
    const w = window as unknown as { __x: number };
    w.__x = 0;
    const d = document.createElement("div");
    d.innerHTML = '<img src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" onload="window.__x = 1">';
    document.body.append(d);
    await new Promise((r) => setTimeout(r, 200));
    return w.__x;
  });
  expect(ran).toBe(0);
});
