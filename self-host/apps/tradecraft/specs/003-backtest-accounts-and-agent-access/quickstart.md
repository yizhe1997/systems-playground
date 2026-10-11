# Quickstart: Backtest Accounts and Agent Read Access

**Feature**: `003-backtest-accounts-and-agent-access` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)

How to prove the feature works. Commands assume the app folder (`self-host/apps/tradecraft`). Nothing here exposes the app:
every port stays on `127.0.0.1`.

## 1. Setup

Nothing new in `.env`. The migrations run when the API starts (`docker compose up --build -d --wait`). Existing accounts
become Live. Every existing trade's trading day is recomputed from its entry once, at that start.

## 2. Automated checks

```bash
POSTGRES_PASSWORD=<anything> ./scripts/test.sh
```

Runs the Go tests against a real Postgres (account kind, the trading day from the entry, tokens, the gate, the MCP tools
through the SDK's own client, the audit entries), then Playwright on the composed stack (B1 to B8 and the accessibility
pass), then the loopback and secret checks. The secret check also looks for the test token's value in every container log.

## 3. Scenarios, mapped to the spec

| Story | Do | Expect |
|---|---|---|
| US1 | Create an account, choose Backtest; type trades on past days; open Reviews with it chosen | Its days show Reviewed, Draft or "—", never Missing; the live account's days are unchanged |
| US1 | Open the Trades list with no account; turn on Show backtests; choose the backtest account | Live only; then the backtest rows with a Backtest tag; then its own trades |
| US1 | Mistake counter with the default chooser, then the backtest account | "All live accounts" excludes it; chosen alone it counts |
| US1 | Edit the backtest account to Live (and back) | Days and trades move in or out of live figures; nothing typed changes; one "Account kind changed" row |
| US2 | Settings, Agent access: turn it on (confirm with Google if asked), New token "Test", Create | The value is shown once with the warning; the list shows Test, Active, never used |
| US2 | Revoke it; turn the switch off and on | Revoked is final and stays listed; off refuses every token, on makes unrevoked ones work again |
| US3 | Call each tool with the token (section 4) | Same figures as the screen; no audit log, identities, tokens or export; one "Agent read" row per tool call |
| US3 | Call with a wrong, a revoked token, and with the switch off | One generic refusal each, one "Agent refused" row each |
| US4 | Log a trade entered 16:50 and exited 17:10 on an account whose day starts at 17:00 | Its trading day is the entry's date; the preview says "entry read in ..." |

## 4. Connect a real agent (manual, by the owner; not automated)

Make a token in Settings, Agent access, and keep its value out of chat and out of files you commit. Then, for Claude Code:

```bash
claude mcp add --transport http tradecraft http://127.0.0.1:8081/mcp --header "Authorization: Bearer <token>"
```

For a client that only speaks stdio (Claude Desktop), use a bridge such as `mcp-remote` with the same URL and header; check
that client's documentation for the exact configuration. Ask: "List my accounts" and "How did my last 20 backtest trades
compare with my plan?", then open the Audit log and filter What: Agent read to see the calls. Record the date and result in
`verification.md`.

## 5. Recovery and switches

- To stop every agent at once: Settings, Agent access, off.
- To stop one: Revoke it.
- If the owner forgets a token's value: revoke it and make a new one; values cannot be shown again.
