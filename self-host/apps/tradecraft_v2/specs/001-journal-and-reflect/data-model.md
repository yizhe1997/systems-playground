# Data model: Journal and Reflect (001)

Tables, rules, derived figures and state rules, added to the `000` schema (`journal_settings`, `account`, `trade`, the view
`trade_detail`, and the functions `trade_gross`, `trade_net`, `trade_risk`, `trade_r`, `trading_day`). Types are Postgres types; ids are
random UUIDs; times are `timestamptz`; days are `date`. Migrations continue the numbering of `000` (`00007` onward).

## New tables

### mistake

| Field | Type | Rule |
|---|---|---|
| id | uuid | primary key |
| name | text | 1 to 60 characters after trimming, runs of spaces collapsed to one; unique ignoring case and surrounding spaces, **including retired ones** (same index and CHECK pattern as `account.name`) |
| stop_line | integer | optional; at least 1 (CHECK) |
| stop_period | text | `week` or `month`; present exactly when `stop_line` is present (CHECK) |
| retired_at | timestamptz | null while in use; set by Retire, cleared by adding the same name again |
| created_at, updated_at | timestamptz | `updated_at` is set on every update (the `000` trigger) and is the version token |

Seeded by the migration: Chased entry, Moved stop, Oversized, Ignored checklist, Traded outside plan.

### trade_judgement (one row per trade, created on first save)

| Field | Type | Rule |
|---|---|---|
| trade_id | uuid | primary key, references `trade` |
| plan_followed | text | `yes`, `partly` or `no`; null until answered |
| label | text | `valid_loss` or `mistake`; null until chosen |
| created_at, updated_at | timestamptz | `updated_at` is the version token |

CHECK: `label IS DISTINCT FROM 'valid_loss' OR plan_followed = 'yes'`.
Trigger on `trade` (after a change to `net_result`): where the new net result is not below zero, set `label = null` on a `valid_loss`
judgement. (A loss that becomes a win or breakeven cannot be a valid loss.)

### trade_mistake

| Field | Type | Rule |
|---|---|---|
| trade_id | uuid | references `trade`; part of the primary key |
| mistake_id | uuid | references `mistake`; part of the primary key |

A trade carries a mistake at most once. Tagging a retired mistake is refused by the API; existing tags on a mistake that is later
retired stay.

### day_mistake

| Field | Type | Rule |
|---|---|---|
| account_id | uuid | references `account`; part of the primary key |
| trading_day | date | part of the primary key |
| mistake_id | uuid | references `mistake`; part of the primary key |

One record per account, day and mistake: "once for the day".

### daily_review

| Field | Type | Rule |
|---|---|---|
| account_id | uuid | references `account`; part of the primary key |
| trading_day | date | part of the primary key |
| did_well, could_improve, next_focus | text | each up to 2,000 characters, empty allowed (an empty answer is stored as empty text) |
| mental_grade, technical_grade | smallint | 1 to 5 (CHECK), or null for "not graded" |
| reviewed_at | timestamptz | null until "Mark as reviewed"; never cleared |
| edited_at | timestamptz | set to now when the row is saved while `reviewed_at` is set |
| created_at, updated_at | timestamptz | `updated_at` is the version token |

A row exists once anything has been saved. The state is derived (below), not stored.

### focus

| Field | Type | Rule |
|---|---|---|
| period | text | `week` or `month`; part of the primary key |
| period_start | date | the Monday (week) or the first of the month (month), enforced by a CHECK; part of the primary key |
| body | text | 1 to 280 characters (CHECK on `char_length`); the API counts Unicode code points the same way |
| created_at, updated_at | timestamptz | `updated_at` is the version token |

Global, not per account. Clearing a focus deletes the row.

### weekly_review_mark

| Field | Type | Rule |
|---|---|---|
| account_id | uuid | references `account`; part of the primary key |
| week_start | date | a Monday (CHECK); part of the primary key |
| reviewed_at | timestamptz | when it was marked; never changed afterwards |

Nothing else about a week is stored.

## SQL functions and views (the only definitions of the figures)

| Name | Returns | Meaning |
|---|---|---|
| `week_start(date)` | date | the Monday of that date's week |
| `account_today(account_id)` | date | `trading_day(now(), journal time zone, the account's day start)` |
| `judged_trade` (view) | one row per **live** trade | `trade_detail` joined to its judgement: `plan_followed`, `label`, `is_win` (net above 0), `is_loss` (net below 0), `mistake_tags` (count of tags) |
| `day_stats(account_id, from_day, to_day)` | one row per trading day with live trades | `trades`, `net_result` (exact sum), `followed`, `partly`, `not_followed`, `not_judged`, `mistake_tags`, `valid_losses`, `losses`, `wins` |
| `period_stats(account_id, from_day, to_day)` | one row | the same figures summed over the days of a week; a day or a week uses the same function, so they cannot disagree |
| `mistake_counts(period_from, period_to, account_id or null)` | rows per mistake and account | `on_trades` (tags on live trades in the range) and `on_days` (day records in the range); each record once |
| `day_state(account_id, day)` | `missing`, `draft`, `reviewed`, `today`, or null | the daily-review state (rules below) |
| `week_state(account_id, week_start)` | `reviewed`, `missing`, `not_reviewed` | the weekly state (rules below) |

### Derived figures (definitions the screens print)

- **Plan followed X of Y**: X = live trades answered `yes`; Y = all live trades of the day or week. The detail adds `not followed` (answer
  `no`), `partly` (answer `partly`, never counted in X), and `not judged yet` (no answer) when above zero.
- **Mistakes n**: the number of mistake tags on live trades in the range plus the day-level records in the range, each once; the
  breakdown lists each mistake with its count.
- **Valid losses n (of m losing trades)**: trades labelled `valid_loss`; m = live trades with a net result below zero.
- **Win rate k of n**: k = live trades with a net result above zero; n = live trades. The percentage is `round(100 * k / n)`, half up,
  calculated in SQL; absent (a dash with the reason "no trades") when n = 0.
- **Net result**: the exact sum of `net_result` of the live trades, in the account's currency; absent when there are no trades.
- Every figure above is also absent with a stated reason when it cannot be worked out; nothing is zero by default.

### State rules

- **Daily**: with `today = account_today(account)`:
  - `reviewed` when a row exists and `reviewed_at` is set;
  - `draft` when a row exists and `reviewed_at` is null;
  - `missing` when no row exists, `day < today`, and the day has at least one live trade;
  - `today` when no row exists, `day = today`, and the day has at least one live trade (listed as today, not as Missing);
  - otherwise no state (a day with no trades and no row).
- **Weekly**: `reviewed` when a mark exists; `missing` when no mark exists, the week's Sunday is before `today`, and at least one of its
  days has a live trade; otherwise `not_reviewed`. The current week is never `missing`.
- **Trades changed after review**: for a reviewed day, the number of that account's trades with `trading_day` = the day and
  `updated_at > reviewed_at`, deleted ones included.

## Rules in the API (in this order)

- Judgement: the trade exists; `planFollowed` in yes, partly, no; `label` valid_loss only when the plan answer is yes **and** the trade
  is a loss, otherwise 422 with "Not available: you answered that the plan was not followed." (or "Not available: this trade is not a
  loss."); mistake ids exist and are not retired; saving a plan answer other than yes clears a valid-loss label.
- Daily review: the account exists; the date is a real date; a day that has not happened yet (after today for that account) can be
  opened but not marked reviewed ("This day has not happened yet."); grades 1 to 5 or null; answers up to 2,000 characters.
- Focus: up to 280 characters, counted as Unicode code points; over the limit is refused with "Too long: N characters over. Shorten it
  to save." where N is exact; an empty text is a clear, not a save.
- Mistake: a name of 1 to 60 characters, unique ignoring case; stop line a whole number of 1 or more with a period, or both absent,
  otherwise "Stop line must be 1 or more."

## Relationships

An account has many trades, many daily reviews (one per day), many day-level mistake records and many weekly marks. A trade has at most
one judgement and any number of mistake tags. A mistake is tagged on trades and recorded on days. Focus rows belong to the owner and
are shown on every account's reviews. `trade` and `account` themselves are unchanged by this feature.

## Export

Everything above is exportable: the `000` export document gains `mistakes`, `dailyReviews`, `focuses`, `weeklyMarks`, `dayMistakes`, and
a `judgement` object on each trade (plan answer, label, mistake names), in the same one JSON file.
