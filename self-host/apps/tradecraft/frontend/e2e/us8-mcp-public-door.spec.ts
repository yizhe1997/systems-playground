import { expect, test } from "@playwright/test";
import { api, uniq } from "./helpers";

// Deployment: the agent door is reached on the public hostname through the web tier (/mcp), because the API publishes no
// port of its own there. Only that path is passed on; the API's agent gate does the checking.

// the token's value is in this spec's memory; keep it out of the Playwright output
test.use({ trace: "off", screenshot: "off", video: "off" });

const WEB = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100";

async function mcpViaWeb(headers: Record<string, string>, method = "tools/list") {
  const res = await fetch(WEB + "/mcp", {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method }),
  });
  return { status: res.status, text: await res.text() };
}

test("/mcp on the web tier reaches the agent gate: no token is refused, a token works, a browser request is refused", async () => {
  expect((await api("PUT", "/agent", { enabled: true })).status).toBe(200);
  const made = await api<{ value: string; id: string }>("POST", "/agent/tokens", { name: uniq("Public door") });
  expect(made.status).toBe(201);
  const auth = { authorization: `Bearer ${made.data.value}` };

  // the agent gate answers, not the sign-in redirect of the owner's pages
  const none = await mcpViaWeb({});
  expect(none.status).toBe(401);

  const ok = await mcpViaWeb(auth);
  expect(ok.status).toBe(200);
  expect(ok.text).toContain("list_accounts");

  // a web page's request carries an Origin: refused even with a good token
  const browser = await mcpViaWeb({ ...auth, origin: "https://evil.example" });
  expect(browser.status).toBe(403);

  await api("POST", `/agent/tokens/${made.data.id}/revoke`);
});

test("nothing else of the API is passed on by the web tier", async () => {
  for (const path of ["/internal/sign-in", "/accounts", "/health"]) {
    const res = await fetch(WEB + path, { method: "POST", redirect: "manual", headers: { "content-type": "application/json" }, body: "{}" });
    // the owner's session gate sends a visitor with no cookie to the sign-in screen; it is never the API's answer
    expect([302, 303, 307, 308], path).toContain(res.status);
    expect(res.headers.get("location") ?? "", path).toContain("/sign-in");
  }
});
