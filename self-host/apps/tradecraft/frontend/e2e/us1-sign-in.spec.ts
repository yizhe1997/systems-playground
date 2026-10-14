import { expect, test, type Browser } from "@playwright/test";
import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { OWNER_EMAIL, cookieFor } from "./auth";
import { API, api, fillTrade, makeAccount, uniq } from "./helpers";

const UNSIGNED = { cookies: [], origins: [] };
const REFUSAL = "You can't sign in with that account.";

/** Every page of the app, found by looking at the folders: a page added without the gate fails here (SC-001). */
function pageRoutes(): string[] {
  const root = join(__dirname, "..", "src", "app");
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name === "page.tsx") out.push("/" + relative(root, dir).split(sep).join("/"));
    }
  };
  walk(root);
  return out
    .map((r) => (r === "/." || r === "/" ? "/" : r.replace("[id]", "00000000-0000-0000-0000-000000000000")))
    .filter((r) => r !== "/sign-in");
}

async function newIdentity(prefix: string): Promise<string> {
  const email = `${prefix}-${Date.now().toString(36)}@example.com`;
  const r = await api("POST", "/identities", { email });
  expect(r.status, JSON.stringify(r.data)).toBe(201);
  return email;
}

async function contextAs(browser: Browser, email: string) {
  const context = await browser.newContext({ storageState: UNSIGNED });
  // A minted session is stamped with this computer's clock and sign-out with the database's. The Docker VM's clock can be
  // a second or more behind, which would let a copy made "now" outlive a sign-out "now": backdate by far more than that.
  await context.addCookies([await cookieFor(email, { sessionAt: Date.now() - 30_000 })]);
  return context;
}

test.describe("no session", () => {
  test.use({ storageState: UNSIGNED });

  test("the app cannot be framed by another page, and says nothing about its framework", async ({ request }) => {
    const res = await request.get("/sign-in");
    expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-powered-by"]).toBeUndefined();
  });

  test("every page sends you to the sign-in screen, which has no sidebar", async ({ page }) => {
    const routes = pageRoutes();
    expect(routes.length, "the page list looks wrong").toBeGreaterThan(8);
    for (const route of routes) {
      await page.goto(route);
      await expect(page, route).toHaveURL(/\/sign-in/);
      if (route !== "/") expect(new URL(page.url()).searchParams.get("next"), route).toBe(route);
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
    }
  });

  test("the sign-in screen: one button, its words, and the refusal and ended notices", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByText("Tradecraft is private to its owner.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await expect(page.getByText("You will be asked to choose a Google account.")).toBeVisible();
    await expect(page.getByText("Only email addresses the owner has allowed can sign in.")).toBeVisible();
    await expect(page.getByText(REFUSAL)).toHaveCount(0);

    await page.goto("/sign-in?reason=ended");
    await expect(page.getByText("Your session ended. Sign in again.")).toBeVisible();
    for (const url of ["/sign-in?reason=refused", "/sign-in?error=AccessDenied", "/sign-in?error=OAuthCallback"]) {
      await page.goto(url);
      await expect(page.getByText(REFUSAL)).toBeVisible();
    }
  });

  test("the API addresses answer 'not signed in', through the web tier and directly", async ({ request }) => {
    for (const path of ["/api/accounts", "/api/trades", "/api/export", "/api/identities", "/api/audit"]) {
      const r = await request.get(path);
      expect(r.status(), path).toBe(401);
      expect(await r.json()).toMatchObject({ code: "unauthorized", message: "Not signed in." });
    }
    const direct = await fetch(API + "/accounts");
    expect(direct.status).toBe(401);
    expect((await fetch(API + "/health")).status).toBe(200);
  });
});

test("signed in: the sidebar names the identity and has Sign out", async ({ page }) => {
  await page.goto("/reviews");
  const nav = page.locator(".sidebar");
  await expect(nav.getByText(OWNER_EMAIL)).toBeVisible();
  await nav.getByRole("button", { name: /^Signed in as/ }).click();
  await expect(page.getByRole("menuitem", { name: "Sign out" })).toBeVisible();
  await expect(page.getByRole("menu").getByRole("menuitem")).toHaveCount(1); // Sign out only; Settings is in the sidebar
  // someone who is signed in has no use for the sign-in screen
  await page.goto("/sign-in");
  await expect(page).toHaveURL(/\/reviews/);
});

test("signing out ends the session at once, also for a copy of the cookie", async ({ browser }) => {
  const email = await newIdentity("signout");
  const a = await contextAs(browser, email);
  const b = await contextAs(browser, email); // a copy of the same session
  const pageA = await a.newPage();
  const pageB = await b.newPage();
  await pageA.goto("/reviews");
  await pageB.goto("/reviews");
  await expect(pageB.getByRole("navigation", { name: "Main" })).toBeVisible();

  await pageA.getByRole("button", { name: /^Signed in as/ }).click();
  await pageA.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(pageA).toHaveURL(/\/sign-in/);
  await pageA.goto("/trades");
  await expect(pageA).toHaveURL(/\/sign-in/);

  // the copy still has a cookie that looks fine, and is refused at its next request
  await pageB.goto("/trades");
  await expect(pageB).toHaveURL(/\/sign-in\?.*reason=ended/);
  await expect(pageB.getByText("Your session ended. Sign in again.")).toBeVisible();
  const r = await pageB.request.get("/api/accounts");
  expect(r.status()).toBe(401);
  await a.close();
  await b.close();
});

test("an identity that is disabled loses its next request", async ({ browser }) => {
  const email = await newIdentity("disabled");
  const context = await contextAs(browser, email);
  const page = await context.newPage();
  await page.goto("/reviews");
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();

  const list = await api<{ identities: { id: string; email: string }[] }>("GET", "/identities");
  const id = list.data.identities.find((i) => i.email === email)!.id;
  const off = await api("POST", `/identities/${id}/disable`);
  expect(off.status).toBe(200);

  await page.goto("/trades");
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByText("Your session ended. Sign in again.")).toBeVisible();
  await context.close();
});

test("a change from another site, or not as structured data, is refused", async ({ request }) => {
  const cross = await request.post("/api/mistakes", {
    headers: { "sec-fetch-site": "cross-site", origin: "https://evil.example", "content-type": "application/json" },
    data: { name: "Should never exist" },
  });
  expect(cross.status()).toBe(403);
  const noOrigin = await request.post("/api/mistakes", { headers: { "content-type": "application/json" }, data: { name: "Nor this" } });
  expect(noOrigin.status(), "a change with no origin information").toBe(403);
  const text = await request.post("/api/mistakes", {
    headers: { "sec-fetch-site": "same-origin", "content-type": "text/plain" },
    data: "name=Not structured",
  });
  expect(text.status()).toBe(415);
  const list = await api<{ name: string }[]>("GET", "/mistakes?includeRetired=true");
  expect(list.data.some((m) => /Should never exist|Nor this|Not structured/.test(m.name))).toBe(false);
  // the export is not triggered by another site either
  const exp = await request.get("/api/export", { headers: { "sec-fetch-site": "cross-site" } });
  expect(exp.status()).toBe(403);
});

test("a session that ends while a trade form holds text keeps the text and the leave prompt", async ({ browser }) => {
  const email = await newIdentity("keeps-text");
  const acct = await makeAccount(uniq("Unsaved"));
  const context = await contextAs(browser, email);
  const page = await context.newPage();
  const dialogs: string[] = [];
  page.on("dialog", (d) => {
    dialogs.push(d.type());
    void d.dismiss(); // stay on the page, as "Cancel" on the browser's own prompt does
  });
  await page.goto("/trades/new");
  await fillTrade(page, {
    account: acct.name, instrument: "ZZ", direction: "Long", size: "1",
    entryPrice: "100", entryDate: "2025-10-01", entryTime: "09:41", exitPrice: "101", exitDate: "2025-10-01", exitTime: "09:58",
  });
  const list = await api<{ identities: { id: string; email: string }[] }>("GET", "/identities");
  await api("POST", `/identities/${list.data.identities.find((i) => i.email === email)!.id}/disable`);

  await page.getByRole("button", { name: "Save trade" }).click();
  await expect.poll(() => dialogs.length, "the browser's leave prompt is shown").toBeGreaterThan(0);
  await expect(page).toHaveURL(/\/trades\/new/);
  await expect(page.getByLabel("Instrument")).toHaveValue("ZZ");
  await context.close();
});
