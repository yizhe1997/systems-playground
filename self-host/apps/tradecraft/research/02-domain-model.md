# Domain model: what the RP stores

Concepts only. Names here are descriptive, not the RP's field names.

## Trade

A trade is a position with one or more entry fills and one or more exit fills.

- **Core:** instrument, asset type (stock, options, futures, forex, crypto, CFD), direction, entry/exit price and time, position size.
- **Fills:** a list of entries and a list of exits, each with time, price and size, so scaling in and out is first class. The averages are derived. Exit price can be "implied" or "explicit" (a flag records which).
- **P&L:** either computed from prices and size, or typed in directly (a "direct P&L" mode for sources that only give a result). Costs are separate: commission (fixed or percentage), swap, fees, rebate. Stocks and CFDs also carry dividends.
- **Risk:** stop loss, a list of take-profit targets (each by price plus either a size or a percentage of the position), a risk amount, and an R multiple. Risk is derived as the distance from the average entry to the stop times size times point value, and R is result over risk.
- **Excursion:** MAE and MFE (worst and best price reached), with the price they happened at. Used for an "MFE vs realised" chart.
- **Instrument details by asset type:** futures keep tick size, tick value and dollar per point; forex keeps pip size and value, lot size, a quote currency and a conversion rate (automatic or manual) with its date; options keep strike, expiry, call/put and contract size; crypto keeps pair and exchange; leverage ratio.
- **Currency:** trade currency, FX rate, and a "broker base currency P&L" for accounts that report in another currency. Conversion records whether it used manual or fetched rates.
- **Status:** open, partially closed, closed. Open trades carry an unrealised snapshot price and time.
- **Classification:** setups (one or several), mistakes (separate set), free tags, account(s), custom fields.
- **Content:** thesis text, images with annotations, notes, the broker's comment.
- **Review:** a reviewed flag and time, and a structured review (sections of checkboxes, text areas, a label and a choice) plus a separate "loss review" with the same shape.
- **Kind flags:** real, missed, or backtest. Missed trades add a reason. These are the same record shape with a type, not three tables of different shape.
- **Provenance:** which broker row(s) it came from, order and execution ids, an import id and version, and a last-sync time, so re-imports can update instead of duplicate.
- **Copy trading:** a trade can be a copy of a trade on another account, with a multiplier and a P&L adjustment.

## Account

- **Identity and type:** name, optional broker account id, type (demo, evaluation, funded), currency.
- **Balance:** initial and current balance, a manual live-balance adjustment, a ledger of transactions (deposit, withdrawal, trade, cost) each with the balance after it, and daily balance records with the drawdown level that day.
- **Drawdown rule:** none, fixed, end-of-day trailing, or manual (dated snapshots of the limit). Amount, plus the maximum drawdown reached so far.
- **Profit target:** on or off, amount or percentage, optional date.
- **Cost:** monthly cost and last billing date.
- **Metrics:** totals, win rate, best and worst, profit factor, average win and loss (money and R), max drawdown, withdrawals, and a flag when several currencies were mixed.
- **Prop challenge:** an optional attached challenge configuration (see `04`).
- **Copy periods:** date ranges when the account copied another.

## Setup (our "strategy")

- **Identity:** name, aliases, optional category and model, colour and icon, ordering.
- **Status:** testing, active, archived.
- **Scope:** direction (long, short, both), preferred sessions, timeframes and tickers.
- **Playbook:** free markdown plus a **rule checklist**: rules in groups, each with a category (context, entry, exit, risk, management, invalidation, psychology), required or not, ordered. The rule set is versioned.
- **Links:** linked notes.
- **Metrics:** trades, win rate, P&L, average winner and loser, streaks (win, lose, current), expected value, risk-reward, profit factor, average duration, best and worst, average size, last trade date, trading frequency, inactivity streak.
- **Opportunity stats:** the same numbers split into live, missed and backtest, plus a "missed opportunity rate", backtest vs live difference in average R, and a count of missed reasons.
- **Pairs and combinations:** performance of trades that carry two or more setups together, and "needs attention" flags (for example a setup with no trades).

## Tags and mistakes

Tags are plain labels. Mistakes are a distinct set because they are counted differently (cost, recurrence). Tags can be coloured. Trade tags are normalised (case, spaces, symbols) so near-duplicates merge.

## Custom fields (trade level)

Defined once: label, key, type (text, number, dropdown, multiselect, date, datetime, time), validation (required, length, range, pattern), options (and whether users may add options on the fly), helper text, order, and how the column shows in the trade log. Values live on each trade. Dropdown and multiselect fields are filterable.

## Notes and links

Notes belong to something: a trade, a day (daily review), a setup, an account, a review. Setups and reviews can link other notes. There is no free-floating notebook module.
