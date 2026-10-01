# Prop challenges

The RP treats a prop firm challenge as a **configuration attached to an account**, evaluated live against that account's trades and cash events. This is the module closest to Tradecraft v1's account rules, and the one where the RP goes much deeper.

## Structure (read)

- **Challenge:** name, firm, purchase date, status (active, passed, failed), an outcome for the evaluation, a reference to the firm profile it was built from (firm, challenge, catalog version, when verified, and whether it came from the shared catalog or the user's own), one-time costs (purchase, reset, activation, other), a payout plan, and notice state.
- **Phases:** an ordered list, normally evaluation phase 1, phase 2, funded. Each phase has a stage (evaluation, simulated funded, live funded), a status (pending, active, passed, failed), a starting balance, the broker account id(s) that belong to it, its own rules, start and end times, a failure record, waived failures, and an optional payout policy.
- **Policy history:** rules can change over time (a firm updates its terms). A phase keeps dated revisions of rules and payout policy, with how drawdown state carries over (preserved, or set by hand with floor, peak and locked flag). Firm-catalog **corrections** (fixing a profile that was wrong) are applied with an audit record of before and after.

## Rule kinds (read)

Two families:

**Limit rules (breaching one can fail the phase)**
- **Drawdown:** static, end-of-day trailing, or intraday trailing; an amount; an optional balance at which the floor locks.
- **Daily loss limit:** an amount; on breach either *fail* the phase or *suspend until the next session*. Optional variants: a different amount once profit passes a threshold, an amount scaled from peak end-of-day profit, or tiers by profit. The profit basis can be cumulative trade profit or current account profit.
- **Max position size:** a fixed contract cap, or a **scaling plan** (start at N contracts, add one per X profit up to a maximum), or profit tiers. Micros can count as a fraction of a full contract.
- **Daily profit cap:** profit above the cap on one day is not credited.
- **Live-review daily profit:** a daily profit level that makes the account eligible for review for live funding.

**Achievement rules (must be reached to pass)**
- **Profit target:** absolute or percentage; option to credit withdrawals.
- **Minimum trading days.**
- **Minimum profitable days:** days with at least a given profit.
- **Consistency:** the best day may be at most a given percentage of total profit; an optional cushion; the evaluation reports the total profit still required.

## Evaluation output (read)

For each rule: current value, target, progress, remaining, satisfied, breached, warning, and the breach date. Plus per-kind extras: for drawdown the current floor, the most used and the current buffer warning; for daily loss the usage per trading day and whether today is in breach or warning; for consistency the best-day percent. For the phase: status (active, passed, failed, warning), current balance, whether the target was reached and when, which achievement requirements are still outstanding, the failure (date, rule), and whether a **failure happened after the target was already reached**.

Other rules of the engine (read): a **trading-day cutoff time** decides which day a trade belongs to; a phase only counts the cash events it owns; waived failures can be recorded; a daily-loss breach that only suspends is not a hard breach.

## How the two main limit rules are actually evaluated (read in the engine logic)

**Drawdown.** The floor starts at starting balance minus the limit. It is checked after every closed trade and every cash event; the buffer is balance minus floor, and a buffer at or below zero is a breach dated at that event. Three modes:
- *Static:* the floor never moves.
- *End-of-day trailing:* trades are grouped by trading day (the cutoff time decides the day). Only when a day's events are all in does the app take the highest end-of-day balance and move the floor up to it minus the limit. The floor never moves down.
- *Intraday trailing:* the floor moves up after every closed trade that sets a new high.
An optional **lock** caps the trailing floor at a fixed balance, after which it stops rising. A payout can also lock the floor, or reset the account and the floor to the start. The result keeps the most the limit was ever used and how much is used right now, because the history and the present can differ. A warning shows from a fixed share of the limit used (a single threshold constant, value not read).

**Daily loss.** Closed trades are grouped by trading day. For each day the engine keeps the **running P&L and its worst dip**, not the day's end result, and a breach happens at the first moment the dip reaches the limit. So a day that dips past the limit and recovers still breaches. The limit itself can vary: a fixed amount; a larger amount once lifetime profit passes a percentage of the starting balance; tiers based on the prior end-of-day profit (a tier applies from the *next* day); or a share of the peak end-of-day profit once the account reaches an activation balance (never decreasing). The breach action is either *fail* (the phase fails) or *pause until the next session* (counted only for the current day, and not a hard failure). Today's usage is reported separately, with a warning share.

**Other rules in the engine, not read in detail:** profit target (closed trades only; can credit withdrawals), minimum trading days (a day with at least one closed trade), minimum profitable days, consistency (best day as a share of total profit, with the profit still needed to satisfy it), position size (including scaling by prior-day profit tiers, micros counted as a fraction), daily profit cap (profit above the cap is not credited).

**Cross-cutting behaviours.** A phase only counts events that belong to it (by date window and broker account). A breach can be **waived** with a record, so history after it still counts. When rules change mid-phase, evaluation starts the new rules at the effective time and carries the drawdown state (floor, peak, locked) either from the old rules or from terms you enter by hand. The "failure after the target was reached" case is reported so you can set the transition time and keep later trades out.

## Payouts (read)

A funded phase can carry a payout policy:
- **Cycle:** none, N trading days, N qualifying days (days above a minimum profit), or N calendar days from phase start or first trade.
- **Eligibility:** minimum elapsed hours, minimum balance, minimum cycle profit (or a schedule of them), positive profit required after the first payout, best-day limit (or schedule), first payout exempt from some tests.
- **Availability:** profit above the starting balance or above a balance floor, as a percentage of that profit.
- **Request size:** a minimum, and a maximum that is none, fixed, fixed-first-then-none, a percent of cycle profit, or a schedule of amounts. A "lifetime qualifying days" unlock can raise the limit.
- **Profit split:** fixed, or changing after a cumulative payout amount, or after an account profit level.
- **Request window:** allowed weekdays in a time zone. A cap on number of payouts.
- **After a payout:** deduct the request, optionally lock the drawdown at a floor, or reset the balance to the starting balance and restart drawdown; optionally restart the cycle; the last allowed payout can conclude the account, promote it to the next phase, or mark it eligible for live review.
- **Payout plan (user side):** notify at a minimum amount, and a planned withdrawal as a percent or amount.

## Notices and alerts (read)

Phase failed, unknown account, target reached, evaluation passed, payout available, payout lost (with the unmet requirements). Each has a fingerprint so dismissing it sticks.

## Firm profiles (read, partly unknown)

A catalog of firms, each with challenges, account sizes, currencies and phases, with sources and a "verified at" date, fetched from the RP's servers and cached. Users can also create **personal profiles**. We cannot see the catalog contents here. In v2 a profile would be data we seed ourselves (v1 already seeds TopstepX).

## Dashboard widgets that use it (read)

AUM (total balances with a 7-day trend), drawdown monitor, profit target progress, Eval ROI (fees paid versus payouts received), challenge alerts.

## Compared with Tradecraft v1 (inferred)

v1 has a generic rule engine: daily loss limit, drawdown (several types), R-based risk rules, breach events, Rule Replay and Edge Leak. v1 has no phases, no scaling plans or profit tiers, no payouts, no policy history, no costs and ROI, and no catalog corrections. v1's Rule Replay and Edge Leak (what would the day have looked like if you had obeyed the rules) are **not** in the RP as far as we read, and are worth keeping.
