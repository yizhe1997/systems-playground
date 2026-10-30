# Data model: Home and Analytics

**No new table, column, index or migration.** The feature reads what exists (`trade`, `trade_judgement`, `trade_mistake`, `mistake`, `day_mistake`, `account`, `daily_review`, `weekly_review_mark`, `focus`, `journal_settings`) and adds one read query and one Go package. Nothing is stored, so nothing is added to the export (constitution VII) and nothing to the audit log.

## The row of the scope (the one query, `AnalyticsRows`)

One row per live trade in the scope; this is the only thing the figures are made from.

| Field | Type | From |
|---|---|---|
| `trade_id` | uuid | `trade.id` |
| `account_id`, `account_name`, `currency`, `account_archived` | uuid, text, text, bool | `account` |
| `account_kind` | `live` or `backtest` | `account.kind` |
| `trading_day` | date | `trade.trading_day` |
| `entry_at` | timestamptz | `trade.entry_at` (order within a day) |
| `entry_hour` | smallint 0 to 23 | `extract(hour from entry_at at time zone <journal zone>)` |
| `weekday` | smallint 1 (Monday) to 7 | `extract(isodow from trading_day)` |
| `instrument`, `direction` | text, `long` or `short` | `trade` |
| `net_result` | numeric (exact decimal, crosses Go as text) | `trade.net_result` |
| `r_multiple` | numeric, null when no risk | `trade.r_multiple` |
| `plan_followed` | `yes`, `partly`, `no` or null | `trade_judgement.plan_followed` |
| `label` | `valid_loss`, `mistake` or null | `trade_judgement.label` |
| `mistakes` | text[] of mistake ids | `trade_mistake` |

Filter: `deleted_at IS NULL`, `trading_day BETWEEN from AND to`, and either `account_id = chosen` or (`account.kind = 'live'`, archived included). Order: `trading_day, entry_at, id` (the order the running result and the streaks use).

## The figures (not stored; produced by `internal/analytics`)

```text
Scope        { from, to, accountId|null, band, journalZone, blocks[] }
Block        { currency, accounts[{id,name,kind,archived}], n, plan{followed,partly,notFollowed,notJudged,of},
               statistics[Statistic], curve[CurvePoint], days[Day], breakdowns{weekday,hour,instrument,direction,account}[Row],
               replay{lines[ReplayLine], judged, of}, mistakeCost[MistakeCost] }
Statistic    { key, label, value|null, unit, n, plan{...same trades...}, reason|null, definitionKey, few }
CurvePoint   { day, result, cumulative }
Day          { day, trades, result, plan{...}, openAccountId }
Row          { key, label, trades, netResult, wins, counted, plan{...}, few }
ReplayLine   { key: followed|notFollowed|notJudged|actual|without, trades, netResult }
MistakeCost  { mistakeId, name, trades, netResult, plan{...}, records }
```

A `value` is an exact decimal string or null; null always comes with a `reason` (the dash and why). `n` is the number of trades the figure was made of. `few` is true below 10 trades.

## Rules and where they are written

| Rule | Where |
|---|---|
| Win, loss, set-aside, win rate, profit factor, expectancy (money and R), average win and loss, payoff, largest win and loss, drawdown, streaks, minimum samples, few trades | `docs/domain.md` (new section, each **unconfirmed** until the owner confirms it) and `research.md` section 4 |
| Edge leak, replay lines, mistake cost | `docs/domain.md` and `research.md` section 5 |
| Scope (live accounts, archived included; backtest only when chosen), per currency | `docs/domain.md` and `research.md` section 2 |
| Plan followed X of Y, trading day, Missing, week states | already in `docs/domain.md` (unchanged) |

## State and lifecycle

None: every figure is computed on request from the recorded rows. Deleting a trade, restoring it, judging it, tagging it or changing the time zone changes the next answer; nothing has to be invalidated.
