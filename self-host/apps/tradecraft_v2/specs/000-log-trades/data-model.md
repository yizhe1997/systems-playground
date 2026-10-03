# Data model: Log Trades (000)

Concepts, fields, constraints and rules. Written from the signed-off spec; nothing is copied from Tradecraft v1.
Types are Postgres types. All ids are random UUIDs. All timestamps are `timestamptz` (exact instants).

## journal_settings (one row)

| Field | Type | Rule |
|---|---|---|
| id | smallint | always 1 (a CHECK keeps it to one row) |
| time_zone | text | a valid IANA zone name; default `America/Chicago` |
| updated_at | timestamptz | set on change |

Changing `time_zone` recomputes `trading_day` for every trade (see the rule below). It never changes a trade's instant.

## account

| Field | Type | Rule |
|---|---|---|
| id | uuid | primary key |
| name | text | 1 to 80 characters after trimming, each run of spaces inside collapsed to one; unique ignoring case and surrounding spaces, **including archived accounts** (a unique index on the lower-cased, trimmed name) |
| currency | text | one of the allowed three-letter codes (a CHECK); a label only, never converted |
| trading_day_start | time | optional; time of day without a zone, read in the journal time zone; `00:01` to `23:59` (a CHECK refuses `00:00`, which would put every trade on the next day) |
| archived_at | timestamptz | null while active; set by Archive, cleared by Restore. Accounts are never deleted |
| created_at, updated_at | timestamptz | `updated_at` is set on every update and is the version token for concurrent edits |

Changing `trading_day_start` recomputes `trading_day` for that account's trades.

## trade

Inputs the owner types:

| Field | Type | Rule |
|---|---|---|
| id | uuid | primary key |
| account_id | uuid | references an account; a new trade, or a trade moved to another account, needs an account that is not archived; existing trades of an archived account stay and remain editable |
| instrument | text | 1 to 40 characters, free text, not unique |
| direction | text | `long` or `short` (a CHECK) |
| size | numeric(24,8) | above zero |
| entry_price, exit_price | numeric(24,8) | above zero |
| entry_at, exit_at | timestamptz | `exit_at` not earlier than `entry_at`; neither in the future when saved |
| dollars_per_point | numeric(24,8) | optional; above zero when present |
| cost | numeric(24,8) | zero or more, default 0 |
| stop_price | numeric(24,8) | optional; above zero when present |
| typed_result | numeric(24,8) | required when `dollars_per_point` is null (a CHECK); the net result after costs; null when `dollars_per_point` is present (a CHECK; the API discards it on save) |
| thesis | text | optional, up to 5,000 characters |
| deleted_at | timestamptz | null while live; set by soft delete, cleared by restore |
| created_at, updated_at | timestamptz | `updated_at` is set on every update and is the version token: an edit carrying an older `expectedUpdatedAt` is refused (409) |

Derived, stored, never typed (generated columns that call the SQL functions below):

| Field | Meaning |
|---|---|
| gross_result | `(exit − entry) × size × dollars_per_point` for a long, `(entry − exit) × size × dollars_per_point` for a short; null when `dollars_per_point` is null |
| net_result | `gross_result − cost` when `dollars_per_point` is present; otherwise `typed_result` |
| risk | `abs(entry − stop) × size × dollars_per_point`; null when the stop or `dollars_per_point` is null, **and null when it works out to zero** |
| r_multiple | `net_result ÷ risk`, to 6 decimal places; null when `risk` is null |
| trading_day | `date`, set by a trigger from the rule below; indexed |

Indexes: `(account_id, trading_day)`, `(trading_day)`, and `(deleted_at)` for the deleted view.

### Why the dash is known

The preview and the list show a dash with a reason, never a blank or a zero. The reason comes from which input is
null (no stop, no dollars per point) or from risk working out to zero ("stop equals entry"). The wording is fixed by
the wireframes (`screens.md`).

## SQL functions (the only definitions of the rules)

| Function | Inputs | Returns |
|---|---|---|
| `trade_gross` | direction, size, entry, exit, dollars_per_point | numeric or null |
| `trade_net` | gross, cost, typed_result, dollars_per_point | numeric |
| `trade_risk` | size, entry, stop, dollars_per_point | numeric or null (null when zero) |
| `trade_r` | net, risk | numeric (6 decimals) or null |
| `trading_day` | exit_at, time_zone, day_start | date |

`trading_day`: take the exit instant in the journal time zone; with no `day_start`, return that calendar date; with a
`day_start` S, add (24 hours − S) to the local time and return the date. Examples with S = 17:00: an exit at
17:00 or later returns the next date; an exit at 16:59 returns the same date.

The four figure functions are IMMUTABLE. `trading_day` is STABLE (the zone database can change); it is used only in
triggers, never in a generated column.

## Triggers

1. Before a trade is inserted, or its `exit_at` or `account_id` changes: set `trading_day` from the account's
   `trading_day_start` and the settings' `time_zone`.
2. After an account's `trading_day_start` changes: recompute `trading_day` for that account's trades.
3. After `journal_settings.time_zone` changes: recompute `trading_day` for all trades.

## State transitions

- **Account**: active → archived (Archive) → active (Restore). No other states.
- **Trade**: live → deleted (soft delete) → live (restore). A deleted trade is excluded from the list and every
  figure until restored; it is included in the export, marked deleted.

## Relationships

An account has many trades. A trade belongs to exactly one account. `journal_settings` is global. The `trade` table is
what feature 001 builds on: it will add reviews keyed by `(account_id, trading_day)` and judgement fields on trades.

## Validation summary (server side, in this order)

Required fields present; numbers parse as exact decimals typed with a point, with at most 8 decimal places; size, prices,
dollars per point and stop above zero; cost zero or more; exit not earlier than entry; neither time later than the
current time plus one minute; typed result present when dollars per
point is blank; account exists and is not archived; a local time that does not exist in the zone is refused. The
database repeats the numeric and ordering rules as CHECK constraints.
