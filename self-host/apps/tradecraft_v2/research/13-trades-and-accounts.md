# Accounts and trades: the smallest useful version

**Status:** research pass, 2026-10-03. Nothing here is a decision. It feeds the specification of
`000-log-trades`, the feature that comes before `001-journal-and-reflect`.

**Why this exists:** the first research (`02`, `09`) described the reference product (RP) as a whole.
This pass re-reads only how the RP creates an account and logs and lists a trade, then cuts that down to
what v2 needs first. Tradecraft v1 was deliberately not consulted (owner's rule: v2 starts clean; v1 is
looked at only when the owner asks for a feature to reuse it).

**Rules (same as the other notes):** own words, behaviour over layout, confidence marked.
*Read* = taken from the RP's type definitions, validation code or interface strings. *Inferred* = my reading.

## 1. How the RP creates an account (Read)

Creating an account is one dialog. Fields:

| Field | Behaviour |
|---|---|
| Name | Required. Must be unique; a duplicate is refused with a message |
| Type | Demo, evaluation or funded |
| Initial balance | Cannot be negative |
| Creation date | Cannot be in the future; trades before it are flagged later |
| Live balance | Optional correction to the current broker balance |
| Currency | The account's own currency, used for display |
| Monthly cost | Optional, cannot be negative (subscriptions, platform fees) |
| Drawdown type and amount | Only for evaluation and funded accounts; required once a rule is chosen |
| Profit target | Optional switch; amount or percentage, optional target date |
| Prop challenge phases, copy trading | Optional, advanced |

An account is required to log a trade. The first-run checklist puts "set up an account" first, estimated at
15 seconds, so the RP treats it as light.

## 2. How the RP logs a trade (Read)

One form in three tabs: **Basic**, **Details**, **Advanced**. The owner can show, hide and reorder form items,
and a fresh install hides the advanced ones. This is the useful idea: **the form is short by default and
grows only if the trader asks.**

- **Visible on a fresh install:** the asset-specific fields, commission, rebate, swap, stop loss or risk
  amount, a live result preview, an import shortcut, setup, mistake, free tags, thesis, attachments, custom fields.
- **Hidden until switched on:** take-profit targets, ideal exits, an unrealised snapshot for open trades,
  dividends, a separate trade currency, worst and best price reached (MAE and MFE), other fees, exchange,
  and a "type the result directly" switch.

**What the form insists on** (from its validation): account, instrument, direction, asset type, entry time;
at least one entry (price, size, time); for a closed trade an exit with price, size and time; sizes above
zero; an exit no earlier than the entry; total exited size not above total entered size. Costs, stop and risk
are optional numbers with sanity checks (a risk amount must be above zero; a commission percentage must be in range).
Futures also require a dollar value per point; options require strike, expiry and call or put; forex requires
lot size and a conversion rate.

**Scaling:** a trade has a list of entries and a list of exits. The form shows total entry size, remaining
position, and labels the trade open or closed from that. Averages are derived.

**Result:** shown live as a preview with costs separated: total costs, result, result after costs. Computed
from prices and size, or typed directly when the source only gives a result.

## 3. How the RP lists trades (Read)

A filterable, sortable table with row selection and batch actions (mark reviewed, set setups, tags or
mistakes, duplicate, delete). A row expands into the trade's detail. Visible by default: image, account,
instrument, status (open or closed), direction, date, result, setups, mistakes, tags, reviewed. More than
forty other columns exist and are off by default (entry and exit times, duration, prices, stop distance,
risk, R, MAE and MFE, and so on). An empty list says no trades were found and points to starting one.

## 4. What the smallest useful version needs (Proposal, to be reacted to)

Chosen by asking "what must exist for 001's daily review to work, and no more?"

**Account**

| Keep (needed by 001) | Why |
|---|---|
| Name (unique) | Everything is shown per account |
| Currency | 001 shows money in the account's currency (FR-024) |
| Trading-day start (optional) | Which day a late-evening trade belongs to; the daily review is per account per day |

**Trade**

| Keep | Why |
|---|---|
| Account | Required, as in the RP |
| Instrument (symbol) | Shown on the review |
| Direction | Long or short |
| Size | Contracts or units, above zero |
| Entry price and time, exit price and time | The result and the trading day come from these. Closed trades only (owner's decision) |
| Dollars per point | Turns price moves into money for futures; without it the result cannot be computed |
| Costs | One total for now |
| Stop price (optional) | Gives the risk figure; without it the review shows a dash and says why |
| Thesis (optional) | Why the trade was taken (owner's decision for 001) |

**Derived, not typed:** gross result, net result after costs, risk, R (result over risk). All exact decimals.

**Screens**: accounts list with create and edit; trades list for an account and period; a log or edit trade
form with the short, tabbed idea above; delete with restore. Empty states for each.

**Left for later (each is its own feature or a setting):** account type, balances and ledger, drawdown and
profit-target rules, prop challenges, copy trading, monthly cost; scaling in and out with several fills;
typing the result directly; options, forex and crypto details; take-profit targets; MAE and MFE; trade
currency and FX; setups and tags; attachments and screenshots; import and sync; custom fields; batch actions;
more than a dozen list columns; saved filters.

## 5. Decisions the owner needs to make (questions for specify and clarify)

1. **Trading day:** one cutoff time for all accounts (the RP's approach, off by default) or a start time per
   account? The review's day depends on it.
2. **One entry and one exit, or several fills?** The spec (FR-001) says scaling in and out. It roughly doubles
   the form and the maths. A single entry and exit now, with scaling as a later feature, is the smaller slice.
3. **How the result is entered:** computed from prices with a dollar-per-point value, typed directly, or both.
4. **Instruments:** a free-text symbol with a dollar-per-point on each trade, or a small instruments list
   (symbol, tick size, tick value) reused across trades.
5. **Time zone:** the zone trades are entered and shown in, and the day is read in.
6. **List filters:** account and date range only, or direction and instrument too.
7. **Form shape:** adopt the short-by-default idea (Basic first, thesis under Details), or one flat form.

## Confidence

All of sections 1 to 3 are *Read* from the RP's source and interface strings on 2026-10-03; the exact field
list for creating an account and the validation rules for a trade were read directly. Section 4 is my
proposal, not the RP's behaviour.
