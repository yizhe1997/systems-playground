import { expect, test } from "@playwright/test";
import { mintSession, sessionCookieName } from "../scripts/session-mint.mjs";
import { cookieFor } from "./auth";
import { api, makeAccount, uniq } from "./helpers";

const UNSIGNED = { cookies: [], origins: [] };

test("a minted session is signed in as the chosen identity, and what it does is recorded under that identity", async ({ browser }) => {
  const email = `minted-${Date.now().toString(36)}@example.com`;
  expect((await api("POST", "/identities", { email })).status).toBe(201);
  const context = await browser.newContext({ storageState: UNSIGNED });
  await context.addCookies([await cookieFor(email)]);
  const page = await context.newPage();
  await page.goto("/reviews");
  await expect(page.locator(".sidebar").getByText(email)).toBeVisible();

  // an action made as that identity lands in the log under it
  const acct = await makeAccount(uniq("Minted"));
  expect((await api("POST", `/accounts/${acct.id}/archive`, undefined, email)).status).toBe(200);
  await page.goto("/audit");
  const row = page.locator("tbody tr").filter({ hasText: "Account archived" }).filter({ hasText: acct.name }).first();
  await expect(row).toContainText(email);
  await context.close();
});

test.describe("nothing creates a session without Google", () => {
  test.use({ storageState: UNSIGNED });

  test("a cookie made with a key the app does not know is no session", async ({ browser }) => {
    const context = await browser.newContext({ storageState: UNSIGNED });
    const forged = await mintSession({ email: process.env.OWNER_BOOTSTRAP_EMAIL ?? "owner@example.com", secret: "an-unknown-key-0123456789abcdefghij-zz" });
    const base = new URL(process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100");
    await context.addCookies([{ name: sessionCookieName(base.origin), value: forged, domain: base.hostname, path: "/", httpOnly: true, sameSite: "Lax" }]);
    const page = await context.newPage();
    await page.goto("/reviews");
    await expect(page).toHaveURL(/\/sign-in/);
    await context.close();
  });

  test("no address of the web tier makes one, and the private routes are not reachable from the browser", async ({ request }) => {
    for (const path of ["/api/internal/sign-in", "/api/internal/step-up", "/api/internal/sign-out", "/api/login", "/api/dev", "/api/session"]) {
      for (const method of ["post", "get"] as const) {
        const r = await request[method](path, { headers: { "sec-fetch-site": "same-origin", "content-type": "application/json" }, data: method === "post" ? {} : undefined });
        expect([401, 404], `${method} ${path}`).toContain(r.status());
        expect(r.headers()["set-cookie"] ?? "", `${method} ${path}`).not.toMatch(/session-token/);
      }
    }
    // NextAuth's own session address answers an empty session to someone who is not signed in
    const s = await request.get("/api/auth/session");
    expect(s.status()).toBe(200);
    expect(await s.json()).toEqual({});
  });

  test("a signed-in browser cannot reach the private routes through the pass-through either", async ({ browser }) => {
    const context = await browser.newContext({ storageState: UNSIGNED });
    await context.addCookies([await cookieFor(process.env.OWNER_BOOTSTRAP_EMAIL ?? "owner@example.com")]);
    for (const path of ["/api/internal/step-up", "/api/internal/sign-in"]) {
      const r = await context.request.post(path, {
        headers: { "sec-fetch-site": "same-origin", "content-type": "application/json" },
        data: { email: "owner@example.com", providerSub: "guess" },
      });
      expect(r.status(), path).toBe(404);
    }
    await context.close();
  });
});
