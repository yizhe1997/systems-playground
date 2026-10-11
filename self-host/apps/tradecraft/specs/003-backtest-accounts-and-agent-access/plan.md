# Implementation Plan: Backtest Accounts and Agent Read Access

**Feature**: `003-backtest-accounts-and-agent-access` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-backtest-accounts-and-agent-access/spec.md` (screens signed off 2026-10-11, spec hash `7778da30…a45`)

## Summary

Three things on top of features 000 to 002. (1) An account has a kind, Live or Backtest; the rules that decide "Missing" and
the all-accounts counter are SQL functions, so changing them there makes every screen and every read follow. (2) The trading
day of a trade is read from its entry instead of its exit: three triggers and one recompute. (3) The owner can switch agent
access on, make named, revocable, read-only tokens, and an agent reads the journal through an MCP endpoint on the API whose
tools are thin wrappers over the existing read handlers, so an agent's figures are the screen's figures. Every agent call is
one audit row, written before the answer is returned.

Nothing is taken from Tradecraft v1 (it had no agent access). Feature 002's gate, step-up, audit and transaction helper are
reused as they are (research section 1).

## Technical Context

**Language/Version**: Go 1.26 and TypeScript (Next.js 16, React 19), as pinned

**Primary Dependencies**: Go: **`github.com/modelcontextprotocol/go-sdk` v1.8.0** (the official MCP SDK) and **`github.com/gofiber/adaptor/v2`** (mounts its `net/http` handler in Fiber); nothing else new. Web: no new dependency. Plan fallback if the adaptor cannot carry the protocol: the same SDK handler on a second loopback listener (research section 5), found in task T001.

**Storage**: PostgreSQL 18; three migrations `00014` to `00016` ([data-model.md](data-model.md)): `account.kind`, the changed state and counter functions, the entry-based trading-day triggers with one recompute, `journal_settings.agent_access`, `agent_token`, `audit_entry.actor_label`

**Testing**: Go tests against real Postgres, including a real MCP client (the SDK's own) against a listening test server; Playwright on the composed stack for B1 to B8 and the accessibility pass; the whole existing suite once at the end (SC-009), targeted specs while building. The real agent connection is the owner's manual check.

**Target Platform**: Linux containers under Docker Compose; desktop browser; loopback only

**Project Type**: web application (Go API plus Next.js web tier), the same two services

**Performance Goals**: each agent read under 1 s with 5,000 trades (the handlers already meet it); the added per-request token lookup is one indexed read; the recompute of trading days is one table update (about as long as changing the time zone)

**Constraints**: read-only for agents; nothing exposed beyond loopback; no model call from the app; no token value in any log, export, screenshot or audit row; a change and its audit entry are one transaction

**Scale/Scope**: one owner, a handful of tokens, thousands of trades; 8 wireframe pages (17 frames), 2 new cards or dialogs and 4 changed screens

## Constitution Check

*Gate: passed before research; re-checked after design (below).*

| Principle | Status | How the plan meets it |
|---|---|---|
| I Process over outcome | Met | An agent's answers are the handlers' answers: each money figure comes with its plan figure. The new screens (B3, B4) show the plan answer beside each result |
| II Owner in charge, agents read and draft | **Met; the first agent feature** | Read-only tokens, scoped to the one read scope, named and revocable, behind a switch that is off by default; every call is an audit row; the app makes no model call; nothing an agent does creates a record |
| III Honest numbers | Met | No new figure. A backtest day with no review is "no state", never a zero or a made-up status; a figure that cannot be computed is the handler's dash and reason |
| IV Security gates | **Met; a new gate, reviewed** | A new authentication surface (`/mcp` with agent tokens). Token values are random, shown once, stored as a SHA-256 digest; `Origin` refused; generic refusal; loopback only. The two local review passes of principle IV are tasks, on this code and on the existing gate it sits beside |
| V Design before code | Met | Screens signed off 2026-10-11; visual direction approved; the existing frames L1, L2 and the account choosers are updated in Penpot in the same change; visual review after |
| VI One small slice | Met, with a note | Four small stories. US4 (entry day) is not about agents; it is in because it was decided while specifying and costs three triggers. Nothing else is added (no drafts, no expiry, no per-account tokens) |
| VII Own your data | Met | Export gains account kind and `actorLabel`; no outbound call; agent access is opt-in with a working kill switch (the switch, and revoke) |
| VIII Decisions logged, domain sourced | Met in the plan, finished at implement | Decisions are in `research.md` and go to `docs/decisions.md`; `docs/domain.md` gets the entry-based trading day and a short "Backtest accounts" section, flagged unconfirmed until the owner confirms them |

**Re-check after design**: no new violations. Three judgement calls are written down: only `tools/call` is an audit row
(handshake is not), a refused read when its audit row cannot be written, and the long-lived, expiry-free token (research 5, 8, 7).

## Project Structure

### Documentation (this feature)

```text
specs/003-backtest-accounts-and-agent-access/
├── spec.md
├── screens.md           # signed off 2026-10-11
├── plan.md              # this file
├── research.md          # decisions, what is reused, accepted risks, items for the owner
├── data-model.md        # the three migrations, token states, audit kinds
├── quickstart.md        # setup, scenarios, connecting a real agent
├── contracts/
│   ├── openapi.yaml     # account kind, trades parameters, /agent routes, /mcp
│   └── mcp-tools.md     # the tools, their arguments, what is not available
├── checklists/requirements.md
└── tasks.md             # next step (/speckit-tasks)
```

### Source Code

```text
backend/
├── go.mod, go.sum                       # + go-sdk, + gofiber/adaptor
├── migrations/
│   ├── 00014_account_kind.sql           # kind; day_state, week_state, mistake_counts
│   ├── 00015_trading_day_from_entry.sql # three functions, the trigger, one recompute
│   └── 00016_agent_access.sql           # agent_access, agent_token, audit_entry.actor_label
├── queries/
│   ├── accounts.sql                     # kind in list, get, insert, update; kind for the audit read
│   ├── trades.sql                       # ListTrades, CountTrades: include_backtests; ORDER BY entry_at
│   ├── agent.sql                        # new: switch, tokens (create, list, by hash, touch, revoke)
│   ├── audit.sql                        # actor_label in insert, list, export
│   └── settings.sql                     # agent_access get and set
├── internal/api/
│   ├── server.go                        # keeps the app; /mcp before the owner gate; new routes
│   ├── accounts.go                      # kind in input, JSON, validation; audit on change
│   ├── trades.go                        # includeBacktests
│   ├── audit.go                         # new kinds, actor_label, tradeSubject takes the entry time
│   ├── export.go                        # kind, actorLabel
│   ├── agent.go                         # owner routes: GET and PUT /agent, tokens create and revoke
│   ├── agent_gate.go                    # AgentToken middleware: Origin, switch, hash, revoked, creator
│   └── mcp.go                           # the SDK server, tools over the existing handlers, the adaptor mount
└── tests/
    ├── account_kind_test.go             # states, counter, trades list, SC-001, SC-002
    ├── trading_day_entry_test.go        # vectors for FR-024, recompute SC-011 (replaces the exit vectors)
    ├── agent_tokens_test.go             # lifecycle, switch, creator disabled, generic refusal
    ├── mcp_test.go                      # the SDK client against a listening server: every tool, SC-006, SC-008
    ├── agent_audit_test.go              # one row per call, no content, refused rows, write failure
    └── (existing tests: updated where the day, the order or the preview text changed)

frontend/src/
├── lib/
│   ├── types.ts                         # Account.kind, AgentAccess, AuditEntry.actorLabel
│   ├── data.ts                          # getAgentAccess
│   └── reviewsContext.ts                # resolveAccount: first active live account
├── app/
│   ├── api/[...path]/route.ts           # + "agent" in the allow-list and in the step-up pre-check
│   ├── settings/page.tsx                # + Agent access card
│   ├── trades/page.tsx                  # includeBacktests, Entry time column
│   └── mistakes/page.tsx                # "All live accounts" and the Backtests group
└── components/
    ├── AccountDialog.tsx                # Kind choice and the change notice (B1)
    ├── AccountsTable.tsx                # Kind column (B2)
    ├── AccountSwitcher.tsx              # live first, then Backtests, "(Backtest)"
    ├── TradeFilters.tsx                 # Show backtests (B4)
    ├── TradesTable.tsx                  # Entry time, Exit time, Trading day
    ├── ResultPreview.tsx                # "entry read in ..."
    ├── AuditTable.tsx                   # Who: "<token> [agent]"
    ├── AgentAccessCard.tsx              # B6
    └── NewTokenDialog.tsx               # B7
frontend/e2e/
├── us1-backtest-accounts.spec.ts        # B1 to B5 flows
├── us2-agent-tokens.spec.ts             # B6, B7
├── us3-agent-audit.spec.ts              # B8 with real agent rows
├── us4-entry-day.spec.ts                # the preview wording, the day
├── zz-a11y-agent.spec.ts                # axe on B1 to B8, both modes
├── zz-screens-agent.spec.ts             # capture for the visual review
└── (existing specs updated for the entry day and the Entry time column)
scripts/check-loopback.sh                # + the test token's value in tracked files and logs
docs/
├── domain.md, decisions.md, security-review.md   # entry day; Backtest accounts; the agent gate (G-11 to G-15)
└── README.md                            # "Agent access" section
```

**Structure Decision**: the two services stay. The agent door is one file of Go (`mcp.go`) and one middleware beside the
existing gate; no new service, container or port (unless the fallback of research 5 is needed).

## Build order

1. **Spike (T001)**: the SDK in a Fiber route through the adaptor, one tool that runs an existing handler through
   `AcquireCtx`, and the SDK's own client calling it in a Go test. Decides the adaptor or the second listener.
2. **Account kind and entry day, backend (US1, US4)**: migrations `00014` and `00015`, queries, handlers, the audit kind, tests;
   update the existing tests that built days from the exit. Targeted Go tests while building.
3. **US1 and US4 screens**: account form, list, choosers, Trades filters and columns, the mistake chooser, the preview
   wording, the Penpot frames L1, L2 and the choosers.
4. **Agent, backend (US2, US3)**: migration `00016`, token and switch routes, the gate, the MCP tools, the audit rows, tests.
5. **Agent screens**: Agent access card, new token dialog, the Audit log's Who.
6. **Close**: accessibility spec, the secret check, security review record and the two local review passes, docs, the
   whole suite once, the visual review, and the owner's manual check with a real agent.

## Complexity Tracking

No constitution violation to justify. Choices that are more than the minimum:

| Choice | Why | Simpler alternative rejected because |
|---|---|---|
| The official MCP SDK and the Fiber adaptor | A protocol that moves, behind a security gate | About 200 lines of JSON-RPC by hand would also work; it would be ours to keep in step with the protocol |
| Tools run the existing handlers through a fabricated Fiber context | One definition of every figure (SC-006) | A second query layer for agents would drift from the screens |
| `audit_entry.actor_label` (a copied name) | The log must read right whatever happens to a token later | A join to the token table would also work (tokens are never deleted) but ties the log's reading to another table |
| A SHA-256 digest lookup instead of comparing secrets in code | Nothing secret is compared in application code, and the value is never stored | Storing values or comparing in Go has no advantage |

## Items for the owner at this gate

1. **The official SDK or a hand-written MCP endpoint** (research 5). The plan uses the SDK.
2. **Only `tools/call` and refusals are audit rows**; the handshake and `tools/list` are not (research 5).
3. **No token expiry** in this feature (research 7); a token lasts until revoked.
4. **The manual check with a real agent** is yours (quickstart 4), like the Google check.
5. **Domain doc**: `docs/domain.md` gains the entry-based trading day and a "Backtest accounts" section, both flagged
   unconfirmed until you confirm them.
