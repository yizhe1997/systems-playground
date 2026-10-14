import { writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { OWNER_EMAIL, cookieFor } from "./auth";
import { AGENT_TOKEN_FILE, API, api, uniq } from "./helpers";

// Feature 003, user story 2 (screens B6 and B7): the switch and the tokens.

// The value of a token is on screen in these tests; keep it out of the Playwright output (trace, screenshot, video).
test.use({ trace: "off", screenshot: "off", video: "off" });

const UNSIGNED = { cookies: [], origins: [] };
const setSwitch = async (on: boolean) => expect((await api("PUT", "/agent", { enabled: on })).status).toBe(200);

test("turn it on, make a token, see its value once, revoke it, turn it off", async ({ page }) => {
  await setSwitch(false);
  await page.goto("/settings/integrations");
  const card = page.getByRole("region", { name: "Agent access" });
  await expect(card.getByText("Lets an agent you choose read your journal. Everything it reads is written to the Audit log.")).toBeVisible();
  await expect(card.getByText(/Turn agent access on to create tokens\./)).toBeVisible();
  await expect(card.getByRole("button", { name: "New token" })).toHaveCount(0);

  await card.locator("label.switch").click();
  await expect(card.locator("label.switch")).toContainText("On");
  await expect(card.getByRole("button", { name: "New token" })).toBeVisible();

  const name = uniq("Claude Desktop, backtests");
  await card.getByRole("button", { name: "New token" }).click();
  const dialog = page.getByRole("dialog", { name: "New token" });
  await expect(dialog).toContainText("This token can read your journal.");
  // empty, then fine
  await dialog.getByRole("button", { name: "Create token" }).click();
  await expect(dialog.getByText("! Name is required.")).toBeVisible();
  await dialog.getByLabel("Name").fill(name);
  await dialog.getByRole("button", { name: "Create token" }).click();

  // the value, once
  const shown = page.getByRole("dialog", { name: "Token created" });
  await expect(shown).toContainText("Copy this token now and paste it into your agent's settings. It cannot be shown again.");
  const value = await shown.getByLabel(name).inputValue();
  expect(value).toMatch(/^tca_[A-Za-z0-9_-]{43}$/);
  writeFileSync(AGENT_TOKEN_FILE, value); // for scripts/check-loopback.sh, outside the repository
  // ready to paste: the address and the value are already in the Claude Code command and the Claude Desktop settings
  expect(await shown.locator("#token-command").inputValue()).toBe(
    `claude mcp add --transport http tradecraft ${API}/mcp --header "Authorization: Bearer ${value}"`,
  );
  const desktop = JSON.parse(await shown.locator("#token-desktop").inputValue());
  expect(desktop.mcpServers.tradecraft.args).toEqual(["-y", "mcp-remote", `${API}/mcp`, "--allow-http", "--header", "Authorization:${AUTH_HEADER}"]);
  expect(desktop.mcpServers.tradecraft.env.AUTH_HEADER).toBe(`Bearer ${value}`);
  await shown.getByRole("button", { name: "Done" }).click();
  await expect(shown).toBeHidden();

  const row = card.getByRole("row", { name: new RegExp(name) });
  await expect(row).toContainText("Never used");
  await expect(row).toContainText("Active");

  // after a reload the list is there and the value is nowhere on the page
  await page.reload();
  const again = page.getByRole("region", { name: "Agent access" });
  await expect(again.getByRole("row", { name: new RegExp(name) })).toBeVisible();
  expect(await page.content()).not.toContain(value);

  // the same name again, in other letters
  await again.getByRole("button", { name: "New token" }).click();
  const second = page.getByRole("dialog", { name: "New token" });
  await second.getByLabel("Name").fill(name.toLowerCase());
  await second.getByRole("button", { name: "Create token" }).click();
  await expect(second.getByText("! That name is already used. Choose another.")).toBeVisible();
  await second.getByRole("button", { name: "Cancel" }).click();

  // revoke: final, and it stays in the list
  await again.getByRole("row", { name: new RegExp(name) }).getByRole("button", { name: /Revoke/ }).click();
  const revoked = again.getByRole("row", { name: new RegExp(name) });
  await expect(revoked).toContainText("Revoked");
  await expect(revoked.getByRole("button", { name: /Revoke/ })).toHaveCount(0);

  // off refuses every token and revokes none: the revoked one stays revoked, the list is still there
  await again.locator("label.switch").click();
  await expect(again.locator("label.switch")).toContainText("Off");
});

test.describe("an older sign-in", () => {
  test.use({ storageState: UNSIGNED });

  test("changing agent access asks 'Confirm it's you' first and changes nothing", async ({ browser }) => {
    await setSwitch(false);
    const context = await browser.newContext({ storageState: UNSIGNED });
    const now = Date.now();
    await context.addCookies([await cookieFor(OWNER_EMAIL, { sessionAt: now - 60_000, stepUpAt: now - 11 * 60_000 })]);
    const page = await context.newPage();
    await page.route("https://accounts.google.com/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>stub</title>" }));

    await page.goto("/settings/integrations");
    const card = page.getByRole("region", { name: "Agent access" });
    await card.locator("label.switch").click();
    const confirm = page.getByRole("dialog", { name: "Confirm it's you" });
    await expect(confirm).toContainText("You signed in more than 10 minutes ago. Confirm with Google before you change agent access.");
    await expect(confirm).toContainText("Nothing has been changed yet.");
    expect(((await api("GET", "/agent")).data as { enabled: boolean }).enabled).toBe(false);

    await confirm.getByRole("button", { name: "Cancel" }).click();
    await expect(confirm).toBeHidden();
    expect(((await api("GET", "/agent")).data as { enabled: boolean }).enabled).toBe(false);
    await context.close();
  });
});
