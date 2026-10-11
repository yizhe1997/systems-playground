# MCP tools, feature 003

What an agent holding a token can call at `POST /mcp`. Every tool is read-only and returns the JSON the owner's own read
route returns for the same arguments (research section 6), so a figure here is the figure on screen. A list tool adds
`total` (from `X-Total-Count`) and is bounded to 200 items per call, with `offset` to continue. An error is returned as a
tool error (`isError: true`) with the route's own `{code, message, fields}`.

Dates are `YYYY-MM-DD` (trading days); months `YYYY-MM`. Money is a string holding an exact decimal.

| Tool | Reads | Arguments | Notes |
|---|---|---|---|
| `list_accounts` | accounts with `kind`, currency, `tradingDayStart`, `archived` | `includeArchived` (default false) | |
| `list_trades` | trades newest entry first | `accountId`, `includeBacktests` (default false), `from`, `to`, `deleted` (default false), `limit` (1 to 200, default 50), `offset` | With no `accountId` only live accounts unless `includeBacktests`; with an `accountId` that account whatever its kind. Each trade carries its plan answer and label |
| `get_day` | one account's day: its trades, stats with plan figures, the review and its state, yesterday's focus | `accountId`, `date` | A backtest day with no review has no state |
| `get_week` | one account's week read from its days: figures with the plan figure and the missing day counted, the focus, the reviewed mark | `accountId`, `date` | |
| `get_month` | one account's month of weeks and days with their states and figures | `accountId`, `month` | |
| `list_mistakes` | the mistake list with stop lines | `includeRetired` (default false) | |
| `mistake_counter` | counts by mistake for the week or month containing `date`, with stop line status | `period` (`week` or `month`), `date`, `accountId` | With no `accountId`: all live accounts |
| `get_focus` | the week or month focus containing `date` | `period`, `date` | |
| `get_settings` | the journal time zone only | none | No other setting is readable |

**Not available to an agent** (no tool exists, and the API answers a request for them with the same refusal as for
anything else): the audit log, identities, tokens and the agent switch, the export, and every secret.

**Audit**: each `tools/call` writes one `agent_read` entry (token name in `actor_label`, the tool and the account's name in
the subject) before the answer is returned. A refused request writes one `agent_refused` entry. Nothing of the answer is
ever written.
