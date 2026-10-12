import { writeFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { AGENT_TOKEN_FILE, API, api, makeAccount, makeTrade, uniq } from "./helpers";

// Feature 003, user story 3 (screen B8): what an agent read is in the Audit log, by token, never as a figure.

// The token's value is in this spec's memory; keep it out of the Playwright output.
test.use({ trace: "off", screenshot: "off", video: "off" });

// One JSON-RPC request to the agent door, as an agent's client would send it (no browser, so no Origin header).
async function mcp(token: string, method: string, params?: unknown): Promise<{ status: number; text: string }> {
  const res = await fetch(API + "/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${token}` },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, ...(params === undefined ? {} : { params }) }),
  });
  return { status: res.status, text: await res.text() };
}
const tool = (name: string, args: Record<string, unknown> = {}) => ({ name, arguments: args });

test("reads and refusals are rows with the token's name, the filter finds them, and no figure is in any", async ({ page }) => {
  expect((await api("PUT", "/agent", { enabled: true })).status).toBe(200);
  const name = uniq("Claude Code, B8");
  const made = await api<{ value: string }>("POST", "/agent/tokens", { name });
  expect(made.status).toBe(201);
  const value = made.data.value;
  writeFileSync(AGENT_TOKEN_FILE, value); // for scripts/check-loopback.sh, outside the repository

  const acct = await makeAccount(uniq("Funded B8"));
  await makeTrade(acct.id, { instrument: "AGB8" });

  // connecting and listing the tools write nothing; the three reads write one entry each
  expect((await mcp(value, "initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "e2e", version: "0" } })).status).toBe(200);
  expect((await mcp(value, "tools/list")).status).toBe(200);
  expect((await mcp(value, "tools/call", tool("list_accounts"))).status).toBe(200);
  expect((await mcp(value, "tools/call", tool("list_trades", { accountId: acct.id }))).status).toBe(200);
  expect((await mcp(value, "tools/call", tool("get_day", { accountId: acct.id, date: "2025-10-01" }))).status).toBe(200);
  // a token nobody made is refused with one plain answer, and is a row too
  const wrong = await mcp("tca_" + "z".repeat(43), "tools/call", tool("list_accounts"));
  expect(wrong.status).toBe(401);

  await page.goto("/audit");
  const mine = page.locator("tbody tr", { hasText: `${name} [agent]` });
  await expect(mine).toHaveCount(3);
  const text = await mine.allInnerTexts();
  expect(text.join("\n")).toContain("Agent read");
  expect(text.join("\n")).toContain("Accounts");
  expect(text.join("\n")).toContain(`Trades, ${acct.name}`);
  expect(text.join("\n")).toContain(`Day, ${acct.name}`);
  expect(text.join("\n")).not.toContain("$"); // never a figure

  const refused = page.locator("tbody tr", { hasText: "Agent refused" }).first();
  await expect(refused).toContainText("Not signed in");
  await expect(refused).toContainText("Unknown token");

  // the What filter finds the reads and only them
  await page.getByLabel("What").selectOption({ label: "Agent read" });
  await expect(page).toHaveURL(/kind=agent_read/);
  const rows = page.locator("tbody tr");
  await expect(rows.first()).toContainText("[agent]");
  for (const t of await rows.allInnerTexts()) expect(t).toContain("Agent read");

  // revoke it: the next call is refused, and the entry names the token that was refused
  const list = await api<{ tokens: { id: string; name: string }[] }>("GET", "/agent");
  const id = list.data.tokens.find((t) => t.name === name)!.id;
  expect((await api("POST", `/agent/tokens/${id}/revoke`)).status).toBe(200);
  expect((await mcp(value, "tools/call", tool("list_accounts"))).status).toBe(401);
  await page.goto("/audit?kind=agent_refused");
  const revoked = page.locator("tbody tr", { hasText: "Revoked token" }).first();
  await expect(revoked).toContainText(`${name} [agent]`);
});
