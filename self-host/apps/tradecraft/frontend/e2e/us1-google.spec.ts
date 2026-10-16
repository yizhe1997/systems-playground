import { expect, test } from "@playwright/test";
import { mintSession } from "../scripts/session-mint.mjs";
import { safeNext, sessionFromToken } from "../src/lib/session";

const UNSIGNED = { cookies: [], origins: [] };

test.describe("the way to Google", () => {
  test.use({ storageState: UNSIGNED });

  test("Continue with Google goes to Google with state, a PKCE challenge and the redirect address", async ({ page }) => {
    // nothing leaves the machine: the navigation to Google is answered here
    await page.route("https://accounts.google.com/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>stub</title>" }));
    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Continue with Google" }).click();
    await page.waitForURL(/accounts\.google\.com/);
    const u = new URL(page.url());
    const origin = new URL(process.env.NEXTAUTH_URL ?? process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100").origin;
    expect(u.searchParams.get("client_id")).toBe(process.env.GOOGLE_CLIENT_ID);
    expect(u.searchParams.get("redirect_uri")).toBe(`${origin}/api/auth/callback/google`);
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("scope")).toMatch(/openid/);
    expect(u.searchParams.get("scope")).toMatch(/email/);
    expect(u.searchParams.get("state")).toBeTruthy();
    expect(u.searchParams.get("code_challenge")).toBeTruthy();
    expect(u.searchParams.get("code_challenge_method")).toBe("S256");
  });

  test("a callback that did not come from a sign-in is the refusal, never a session", async ({ page }) => {
    const r = await page.goto("/api/auth/callback/google?code=forged&state=forged");
    expect(r).toBeTruthy();
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(page.getByText("You can't sign in with that account.")).toBeVisible();
    expect((await page.context().cookies()).some((c) => c.name.includes("session-token"))).toBe(false);
  });
});

// the session reader: the fixed eight hours, and the development key only when it is configured
test.describe("the session reader", () => {
  const prod = "production-key-0123456789abcdefghij-0123";
  const dev = "development-key-0123456789abcdefghij-01";
  const saved = { ...process.env };
  test.beforeEach(() => {
    process.env.NEXTAUTH_SECRET = prod;
    process.env.DEV_SESSION_SECRET = dev;
    process.env.TRADECRAFT_ENV = "test";
  });
  test.afterAll(() => {
    Object.assign(process.env, saved);
  });

  test("a cookie made with either configured key is a session, with its email and times", async () => {
    const now = Date.now();
    const a = await sessionFromToken(await mintSession({ email: " Owner@Example.COM ", secret: prod, sessionAt: now - 1000 }));
    expect(a).toMatchObject({ email: "owner@example.com", sessionAt: now - 1000 });
    const b = await sessionFromToken(await mintSession({ email: "dev@example.com", secret: dev }));
    expect(b?.email).toBe("dev@example.com");
  });

  test("the development key is not accepted in production, or when it is not configured", async () => {
    const token = await mintSession({ email: "dev@example.com", secret: dev });
    process.env.TRADECRAFT_ENV = "production";
    expect(await sessionFromToken(token)).toBeNull();
    process.env.TRADECRAFT_ENV = "";
    expect(await sessionFromToken(token), "unset means production").toBeNull();
    process.env.TRADECRAFT_ENV = "local";
    process.env.DEV_SESSION_SECRET = "";
    expect(await sessionFromToken(token)).toBeNull();
  });

  test("another key, a damaged cookie and no cookie are no session", async () => {
    const other = await mintSession({ email: "a@example.com", secret: "some-other-key-0123456789abcdefghij-xx" });
    expect(await sessionFromToken(other)).toBeNull();
    const good = await mintSession({ email: "a@example.com", secret: prod });
    expect(await sessionFromToken(good.slice(0, -6) + "xxxxxx")).toBeNull();
    expect(await sessionFromToken("not-a-cookie")).toBeNull();
    expect(await sessionFromToken(undefined)).toBeNull();
  });

  test("the page to return to is a path of this site and nothing else", async () => {
    expect(safeNext("/trades?from=2025-10-01")).toBe("/trades?from=2025-10-01");
    const bad = ["//evil.example", "https://evil.example", "/\\evil.example", "/\t/evil.example", "/\n/evil.example", "evil", "", null, undefined, "/sign-in", "/api/auth/signout"];
    for (const b of bad) expect(safeNext(b as string | null | undefined), JSON.stringify(b)).toBe("/reviews");
  });

  test("a session is eight hours from sessionAt and no longer", async () => {
    const now = Date.now();
    const eight = 8 * 60 * 60 * 1000;
    const just = await mintSession({ email: "a@example.com", secret: prod, sessionAt: now - eight + 60_000 });
    expect(await sessionFromToken(just, now)).not.toBeNull();
    const old = await mintSession({ email: "a@example.com", secret: prod, sessionAt: now - eight - 1000 });
    expect(await sessionFromToken(old, now)).toBeNull();
  });
});
