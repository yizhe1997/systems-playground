# Data Model: Backtest Accounts and Agent Read Access

**Feature**: `003-backtest-accounts-and-agent-access` | **Date**: 2026-10-11 | **Spec**: [spec.md](spec.md) | **Research**: [research.md](research.md)

Three migrations, continuing the numbering (`00014` onward). Nothing existing is dropped; every existing row keeps its meaning (every account becomes Live).

## Migration `00014_account_kind.sql`

| Change | Rules |
|---|---|
| `account.kind text NOT NULL DEFAULT 'live'` | `CHECK (kind IN ('live','backtest'))`. Existing rows take the default |
| `day_state(acct, d)` replaced | For an account whose kind is `backtest`, a day with live trades and no saved review returns `NULL` (neither `missing` nor `today`). A saved review still returns `draft` or `reviewed`. Live accounts unchanged |
| `week_state(acct, ws)` replaced | For a backtest account the `missing` branch returns `not_reviewed`. A mark still returns `reviewed` |
| `mistake_counts(from_day, to_day, acct)` replaced | With `acct IS NULL`: counts only trades and day records of accounts whose kind is `live`. With an account: that account whatever its kind |

Down: restores the three functions as in migrations `00010`, drops the column.

## Migration `00015_trading_day_from_entry.sql`

| Change | Rules |
|---|---|
| `trade_set_trading_day()` replaced | Reads `NEW.entry_at` instead of `NEW.exit_at`; same zone and account start |
| trigger `trade_trading_day` recreated | `BEFORE INSERT OR UPDATE OF entry_at, account_id` (was `exit_at, account_id`) |
| `account_recompute_days()` and `settings_recompute_days()` replaced | Read `t.entry_at` |
| One recompute | `UPDATE trade t SET trading_day = trading_day(t.entry_at, zone, a.trading_day_start) FROM account a WHERE a.id = t.account_id`. Changes no price, time, cost or result |
| `COMMENT ON FUNCTION trading_day(...)` | "Takes the instant to place (the entry time)" |

Down: the three functions and the trigger as in `00005`, and the same recompute from the exit.

## Migration `00016_agent_access.sql`

### `journal_settings.agent_access`

| Column | Type | Rules |
|---|---|---|
| `agent_access` | `boolean` | `NOT NULL DEFAULT false`. The one switch for the whole journal |

### `agent_token`

| Column | Type | Rules |
|---|---|---|
| `id` | `uuid` | primary key, `gen_random_uuid()` |
| `name` | `text` | not null, "1 to 60 characters after trimming, each run of spaces collapsed to one" (a CHECK like a mistake's name); unique ignoring case and spaces (`lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))`), revoked tokens included |
| `token_hash` | `text` | not null, unique. The lower-case hex SHA-256 of the whole value; the value is never stored |
| `created_by` | `uuid` | not null, `REFERENCES identity(id) ON DELETE RESTRICT` (identities are never deleted anyway) |
| `created_at` | `timestamptz` | not null, default `now()` |
| `last_used_at` | `timestamptz` | null until first used; set on every accepted request |
| `revoked_at` | `timestamptz` | null while active; set once by revoke. A trigger refuses to clear it and refuses `DELETE` and `TRUNCATE` ("agent tokens are never deleted") |

### `audit_entry.actor_label`

| Column | Type | Rules |
|---|---|---|
| `actor_label` | `text` | `NOT NULL DEFAULT ''`, `CHECK (char_length(actor_label) <= 80)`. For an agent entry: the token's name at the moment. Empty otherwise |

The existing trigger that refuses `UPDATE`, `DELETE` and `TRUNCATE` on `audit_entry` is unchanged; existing rows get the empty default.

### New audit kinds (registry in `internal/api/audit.go`, no migration needed for `kind`)

| `kind` | Words | Written by | `subject` | `changed_fields` | Actor |
|---|---|---|---|---|---|
| `account_kind_changed` | Account kind changed | `PUT /accounts/:id` when the kind differs | the account's name | `kind` | owner |
| `agent_access_enabled` | Agent access turned on | `PUT /agent` | `Agent access` | `status` | owner |
| `agent_access_disabled` | Agent access turned off | `PUT /agent` | `Agent access` | `status` | owner |
| `agent_token_created` | Agent token created | `POST /agent/tokens` | the token's name | `name` | owner |
| `agent_token_revoked` | Agent token revoked | `POST /agent/tokens/:id/revoke` | the token's name | `status` | owner |
| `agent_read` | Agent read | a `tools/call` | `<tool>` or `<tool>, <account name>` | none | agent, label = token name, identity = the token's creator |
| `agent_refused` | Agent refused | any refused request to `/mcp` | `Unknown token`, `Revoked token`, `Access off` or `Identity disabled` | none | agent (known token) or system (unknown token) |

Entries for the first five are written in the change's own transaction (a change without its entry is not made). `agent_read` is written before the answer is returned, and the read is refused if the entry cannot be written. `agent_refused` is best effort (the caller is refused either way).

## Token states

```
 (created, shown once) --first accepted request--> used (last_used_at set)
 active  --revoke (owner, step-up)--> revoked       (never active again; make a new token)
 active/used: refused while the switch is off or while its creator identity is disabled; works again when they are not
```

## What an agent can read, and the figures it carries

Exactly the JSON of the owner's read routes named in research section 6, so each money figure arrives with the plan figure of the same scope, a dash with its reason where a figure cannot be computed, and sample sizes. The tool results add `total` for lists (from `X-Total-Count`).

## Where each new thing is shown

| Data | Screen |
|---|---|
| Account kind | B1 (form), B2 (Accounts list), the account choosers of B3, B4, B5 |
| The switch and the tokens | B6, B7 (Settings, Agent access) |
| Agent entries and the new owner entries | B8 (Audit log), Who = `<token name> [agent]` |
| `kind` of accounts, `actorLabel` of entries | the export |
