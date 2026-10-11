# Research: Backtest Accounts and Agent Read Access

**Feature**: `003-backtest-accounts-and-agent-access` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)

Decisions taken while planning, each with its reason and what else was weighed. Everything is built on features 000 to 002 as they are; section 1 lists what is reused from them. Items marked **For the owner** are the ones this plan is least sure the owner would choose the same way.

## 1. What is reused, and what is new

| Existing piece (feature) | Used for |
|---|---|
| `day_state`, `week_state`, `mistake_counts` SQL functions (001) | The only places that decide "Missing" and the all-accounts counter. Backtest handling is added there, so every screen and every agent read follows (section 2) |
| The three trading-day triggers of migration `00005` (000) | Changed to read the entry time (section 4) |
| Read handlers: `listAccounts`, `listTrades`, `getDailyReview`, `getWeekly`, `listReviews`, `mistakeCounter`, `listMistakes`, `getFocus` (000, 001) | The agent's tools call these very handlers, so an agent's figures are the screen's figures (section 6) |
| `recordAudit`, `inTx`, the step-up middleware, the service-token gate (002) | Token and switch changes are audited in the change's transaction and need the same recent Google confirmation |
| The `audit_entry` table with `actor_kind` including `agent` (002, FR-026) | Agent entries; one new column, `actor_label` (section 8) |
| The web tier's allow-listed pass-through (002) | Gains the `agent` first segment, and the step-up pre-check covers it |

New: one column on `account`, one on `journal_settings`, one on `audit_entry`, the `agent_token` table, a token gate, an MCP endpoint, and the owner's routes for the switch and the tokens.

## 2. Account kind is a column; "Missing" and "all accounts" are decided in SQL

**Decision**: `account.kind text NOT NULL DEFAULT 'live' CHECK (kind IN ('live','backtest'))`. Every existing row becomes `live` by the default. The meaning of the kind lives where the rules already live:

- `day_state(acct, d)`: for a backtest account, a day with trades and no review returns `NULL` (no state), never `missing` and never `today`. A saved review still gives `draft` or `reviewed`.
- `week_state(acct, ws)`: for a backtest account the `missing` branch returns `not_reviewed`.
- `mistake_counts(from, to, acct)`: with `acct IS NULL` it covers live accounts only (join to `account` where `kind = 'live'`); with an account given it covers that account whatever its kind.

**Why**: every count of missing reviews on every screen (Reviews month list, jump-to-date marks, the calendar) comes from these two functions, so changing them is the whole of FR-003. FR-005 (live figures never change because a backtest exists) holds by construction: a per-account figure reads only that account, and the one cross-account figure, the counter, now ignores backtests.

**Alternatives**: filtering in the Go handlers (more places, and an agent tool or a new screen could forget one); a per-trade flag (the spec chose the account).

## 3. Lists that span accounts

**Decision**:
- `GET /trades`: a new `includeBacktests` query parameter (default false). With no `accountId`, only live accounts' trades are returned unless it is true; with an `accountId` the account's trades are returned whatever its kind. The count in `X-Total-Count` follows. `ORDER BY` becomes `entry_at DESC` (FR-026).
- `GET /mistakes/counter` with no `accountId`: all live accounts (section 2). The web tier's chooser says "All live accounts".
- The Reviews, daily and weekly screens always name one account, so they need no change except which account is chosen by default: `resolveAccount` picks the first active **live** account by name, then any active account.
- `GET /accounts` returns `kind`; the account choosers list live accounts first, then a "Backtests" group, each backtest marked "(Backtest)".

**Export**: each account carries `kind`; audit entries carry `actorLabel`.

## 4. The trading day follows the entry

**Decision**: a new migration replaces `trade_set_trading_day`, `account_recompute_days` and `settings_recompute_days` with the same bodies reading `entry_at`, recreates the trigger `trade_trading_day` on `UPDATE OF entry_at, account_id`, and recomputes every trade once with one `UPDATE` (the existing settings trigger already does a table-wide update, so the cost is known). No price, time, cost or result is touched; `updated_at` moves, as it already does when the zone changes.

**Why the SQL function is not renamed**: `trading_day(exit_at, zone, start)` is a pure function of an instant; its first parameter is merely named `exit_at`. Postgres will not change a parameter name with `CREATE OR REPLACE`, and nothing reads the name. A comment says it takes "the instant" (entry), and the function's own test vectors are rewritten.

**What else reads exit for the day**: the audit subject (`tradeSubject`) switches to entry time; the preview text in `ResultPreview.tsx` ("exit read in ...") and its fallback reason ("needs an exit time") become entry wording; `docs/domain.md`'s Trading day section is rewritten with entry-based examples; the test vectors of the trading-day rule and anything that built a trade with a differing exit day are updated. The `trade_exit_not_before_entry` check is untouched.

**Prop daily-loss later**: that feature groups by exit for its own rule if it needs to; recorded in the spec's assumptions.

## 5. Agent access is an endpoint on the API, with its own gate

**Decision**: the API gains `POST /mcp` (the Model Context Protocol over HTTP, stateless, JSON-RPC), registered **before** the owner gate and guarded by a new middleware `AgentToken`. The owner's `/internal/*` and service-token routes are unchanged. An agent connects to `http://127.0.0.1:8081/mcp` (the API's loopback port, already published and already refusing everything without a token) with `Authorization: Bearer <token>`.

**Why on the API, not the web tier or a separate process**: the handlers it wraps live there, the database is there, and the web tier would only add a hop. It is not reachable by a browser page: a request carrying an `Origin` header (every cross-site browser request does) is refused with 403, and a page cannot send a token it does not have.

**Library**: the official Go SDK `github.com/modelcontextprotocol/go-sdk` (v1.8.0, 2026-09, Go 1.25), with `StreamableHTTPOptions{Stateless: true}`, mounted in Fiber through its own `middleware/adaptor`. **For the owner**: the alternative is about 200 lines of JSON-RPC by hand (initialize, tools/list, tools/call). I prefer the SDK for a protocol that moves and sits behind a security gate; the cost is one dependency tree. **Fallback if the adaptor does not stream correctly** (found in the first task, which is a spike): serve the SDK's handler on its own `net/http` listener inside the same process on a second loopback port. Nothing else in the plan changes.

**Protocol housekeeping is not an "agent call"**: `initialize`, `tools/list` and notifications are answered for a valid token without an audit row; a `tools/call` is one audit row. A refused request of any kind is one `agent_refused` row. This is my reading of FR-017 ("every call"); it keeps a client's reconnects from flooding the log.

**Spike result (T001, 2026-10-12)**: the official SDK v1.8.0 works behind Fiber through Fiber's own `middleware/adaptor` (part of fiber v2, so no `gofiber/adaptor` module is added), with `Stateless: true` and `JSONResponse: true` (plain JSON answers, no event stream). A tool runs the owner's handler through a request context initialised with `Init`, and pgx works through it. The SDK's own client listed the tool and called it against a listening server and got the route's JSON (`backend/tests/mcp_spike_test.go`). Neither fallback (second listener, `app.Test`) is needed.

## 6. Tools are the existing handlers

**Decision**: each tool builds a `fasthttp.RequestCtx` for the equivalent GET request (initialised with `ctx.Init(&req, nil, nil)`: a bare `RequestCtx` has no server, and `Done()`, which pgx calls through `c.Context()`, would panic; fasthttp v1.51.0), acquires a Fiber context from the app (and releases it after the call), runs the existing handler and returns its JSON body (or its error body, with `isError: true`). No tool re-implements a query or a figure. The 200-item bound is applied by capping `limit` (the list handlers already take `limit` and `offset` and answer `X-Total-Count`, which the tool puts into the result as `total`).

| Tool | Handler it runs | Arguments |
|---|---|---|
| `list_accounts` | `listAccounts` | `includeArchived` |
| `list_trades` | `listTrades` | `accountId`, `includeBacktests`, `from`, `to`, `deleted`, `limit` (max 200), `offset` |
| `get_day` | `getDailyReview` | `accountId`, `date` |
| `get_week` | `getWeekly` | `accountId`, `date` |
| `get_month` | `listReviews` | `accountId`, `month` |
| `list_mistakes` | `listMistakes` | `includeRetired` |
| `mistake_counter` | `mistakeCounter` | `period` (week or month), `date`, `accountId` |
| `get_focus` | `getFocus` | `period`, `date` |
| `get_settings` | a small read | none: the journal time zone only |

Not exposed, by omission: the export, identities, tokens, the audit log, trades' individual notes beyond what the trade JSON already carries to the owner (a trade's thesis is the owner's own text and is part of a trade; it is returned, as the screen shows it).

**Why this satisfies FR-015 and SC-006**: the answers are the handlers' answers, which already carry the plan figure beside each money figure, a dash and its reason for a figure that cannot be computed, and the sample sizes.

**Reads that need a route parameter** (`:id`) are not offered; listing with filters covers the use.

## 7. Tokens

**Decision**:
- Value: `tca_` followed by 32 random bytes in base64url (43 characters), made with `crypto/rand`. Shown once in the answer to `POST /agent/tokens` and never stored.
- Stored: the SHA-256 of the whole value as hex, in `agent_token.token_hash` (unique). A token is found by hashing the presented value and looking the hash up; no secret is compared in application code.
- Fields: `id`, `name` (1 to 60 characters, unique ignoring case and spaces, same normalisation as a mistake's name), `token_hash`, `created_by` (identity), `created_at`, `last_used_at`, `revoked_at`. Never deleted.
- No expiry in this feature. A token lives until revoked; the switch and revoke are the controls the spec asked for. An optional expiry is a later, small addition.
- Checked on every request, in this order: the switch is on; the hash exists; it is not revoked; its creator identity is active. Any failure is the same `401` body and one `agent_refused` row. `last_used_at` is updated on a valid request.

**Accepted risk**: a long-lived bearer secret sits in the agent's own configuration file in the clear, as every MCP token does. The mitigations are the read-only scope, the switch, revoke, loopback only, and that the owner sees every read in the Audit log.

## 8. Audit

**Decision**:
- New kinds, in the same registry as 002: `account_kind_changed` ("Account kind changed", field `kind`), `agent_access_enabled` ("Agent access turned on", field `status`), `agent_access_disabled` ("Agent access turned off", field `status`), `agent_token_created` ("Agent token created", field `name`), `agent_token_revoked` ("Agent token revoked", field `status`), `agent_read` ("Agent read"), `agent_refused` ("Agent refused").
- One new column: `audit_entry.actor_label text NOT NULL DEFAULT ''`. For an agent entry it holds the token's name at that moment. A copy rather than a join, for the same reason a subject is text: the entry must read right whatever happens later. The API's entry JSON gains `actorLabel`; the screen shows `<label> [agent]` in Who. The trigger that refuses `UPDATE` and `DELETE` is untouched; `ALTER TABLE ... ADD COLUMN` is not an update of a row.
- An agent read: `actor_kind = 'agent'`, `identity_id` = the token's creator, `actor_label` = the token name, `kind = 'agent_read'`, `subject` = "`<tool>`, `<account name>`" (the account's name, or the tool name alone), `changed_fields` empty. Never an argument value other than the account's name, never an answer.
- An agent refused: `actor_kind = 'agent'` with the creator and label when the token is known but refused (revoked, switch off, creator disabled); `actor_kind = 'system'`, no identity, empty label when the token is unknown. `subject` is `Unknown token`, `Revoked token`, `Access off`, `Identity disabled`, or `Browser request` (the request carried an `Origin` header; checked first, before the token is looked at; actor `system`, answered `403`). The caller still gets the one generic body.
- **If the read's entry cannot be written, the read is refused** (consistent with the export in 002).

## 9. The switch and the owner's routes

**Decision**: `journal_settings.agent_access boolean NOT NULL DEFAULT false`. Owner routes under the existing gate: `GET /agent` (switch and token list), `PUT /agent` (`{enabled}`, step-up, audited in the same transaction), `POST /agent/tokens` (`{name}`, step-up, returns the value once), `POST /agent/tokens/:id/revoke` (step-up). The web tier's allow-list gains `agent`, and its step-up pre-check covers non-GET requests to it.

## 10. Tests

| Part | How |
|---|---|
| Account kind: states, week states, the counter, the trades list with and without `includeBacktests`, ordering by entry, live figures identical with 500 backtest trades present (SC-002) | Go tests against real Postgres |
| Trading day from the entry: a trade within a day, across midnight, across the account's start, across a clock change; recompute leaves every price, time, cost and result unchanged (SC-010, SC-011) | Go tests; the existing vectors are rewritten for entry |
| Token lifecycle, switch, creator disabled, generic refusal, one row per call, no content in rows, refusal still recorded (SC-003 to SC-005) | Go tests |
| The MCP endpoint end to end: a real client (the SDK's own) connects, lists tools, calls each, and each figure equals the owner's route's (SC-006); the audit list, identities, tokens and export are not available (SC-008); a request with an `Origin` is refused | Go tests with the SDK client against a listening test server |
| The screens: B1 to B8 flows and the accessibility pass, light and night | Playwright on the composed stack |
| Existing suites | Run in full once at the end (SC-009), targeted while building |
| **A real agent connecting with a real token** (Claude Code or Claude Desktop) | **Not automated.** The owner's manual check, recorded in `verification.md` like feature 002's Google check |

## 11. Accepted risks

| Risk | Why accepted | Ends |
|---|---|---|
| No rate limit on `/mcp` | Loopback only, a valid token needed for any work, a refused call is one cheap row | Before any exposure (the exposure checklist) |
| Long-lived tokens in plain config files | Section 7 | If expiry is added |
| One audit row per call can be noisy | The kind filter works; the owner chose one row per call (2026-10-11) | A collapsed view is a screen change if wanted |
| An agent can read the trades' own free text (a trade's thesis) | It is the owner's journal and the agent is the owner's chosen reader; the audit log shows that it read | Not planned to change |

## 12. Open items for the owner

1. **SDK or hand-written MCP** (section 5): the plan uses the official SDK.
2. **Handshake calls are not audit rows** (section 5): only `tools/call` and refusals are.
3. **No token expiry** in this feature (section 7).
4. The manual check with a real agent client (quickstart section 4) is yours, as the Google check was.
