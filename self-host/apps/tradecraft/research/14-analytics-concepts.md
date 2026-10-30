# Analytics: what the field offers, broken into concepts (input to the spec)

Written 2026-10-27, in our own words. Sources: the reference product study (`06`, `07`, `10`, `12` in this folder), the vault notes "reference product study" (2026-10-01) and "futures trade journal competitive research" (2026-08-02, addendum 2026-09-24), and a fresh read of public help pages: Tradervue ([reports](https://www.tradervue.com/help/reports), [days and times](https://www.tradervue.com/help/reports/reports_dt), [MFE and MAE](https://help.tradervue.com/article/3440-mfe-and-mae-calculations)), Edgewonk ([performance statistics](https://edgewonk.com/blog/a-deep-dive-into-edgewonk-performance-statistics), [Chart Lab](https://edgewonk.com/chart-lab)), TradeZella ([dashboard widgets](https://help.tradezella.com/en/articles/7118437-understanding-dashboard-widgets-and-stats), [Zella score](https://help.tradezella.com/en/articles/10305642-introducing-the-all-new-zella-score)). Vendor pages are marketing: treat what they claim as claims. No code or wording is copied from any product.

## 1. Four layers, which every product mixes

| Layer | Question it answers | Examples |
|---|---|---|
| **Landing / dashboard** | How am I doing, what needs me today | headline cards, equity curve, calendar heatmap, streaks, "unreviewed" list, today's focus |
| **Performance statistics** | Is there an edge | win rate, profit factor, expectancy, average win and loss, max drawdown, recovery factor, SQN, Sharpe and Sortino, gain to pain |
| **Breakdowns ("slice it")** | Where does the edge live | by weekday, by hour or 30-minute window, by instrument, by direction, by size, by hold time, by month, by account |
| **Behaviour and process** | Where does the edge leak | cost of mistakes, plan followed vs not, results with the rule-breaking trades removed, tilt and streaks of discipline, review streaks |

Tradecraft's own position (research `10`, owner decision): it is a **process-discipline journal with numbers attached, not a statistics dashboard with notes attached**. So layer 4 is the product, layers 2 and 3 are the supporting numbers, and layer 1 ties them together. No product we looked at puts "what the result would be without the rule-breaking trades" first; that is ours (the owner asked for it to be kept: research `12`, idea C).

## 2. Concepts, and what Tradecraft already has

| Concept | Common definition | Tradecraft today |
|---|---|---|
| Net result, costs | gross minus costs | yes (per trade, per day) |
| Win rate | winners / trades; scratch trades can be excluded by a break-even band | per day only |
| Profit factor | total profit / total loss | no |
| Expectancy | average result per trade (or win% x avg win - loss% x avg loss); in R when risk exists | no |
| Average win, average loss, payoff ratio | | no |
| R multiple | net / risk (needs a stop) | yes per trade; a dash and a reason when no stop |
| Drawdown | peak-to-trough of realised results; percentages need a capital basis, otherwise "unavailable" | no |
| Streaks | consecutive wins/losses, reviewed days | no |
| Equity curve, daily bars, calendar heatmap | | calendar of review states, no results chart |
| Breakdown by weekday, hour, instrument, direction, account | | no |
| MAE / MFE, efficiency | needs in-trade price range data we do not have (closed trades only) | not possible; out of scope |
| Composite score | weighted sum of the above (weights are opinions) | no; "nice later" (research `07`) |
| **Plan followed X of Y** | share of trades answered Yes | yes (every figure carries it) |
| **Mistake counter and cost** | count per mistake; Edgewonk-style "dollars lost to each mistake" | counter yes; cost no |
| **Rule replay / edge leak** | result without the trades that broke the plan | no (v1 had it) |
| Review streak / discipline overlay | | no |

## 3. What our rules say about any of this (not optional)

- Constitution I: every money figure shows its process figure beside it (plan followed X of Y for the same scope).
- Constitution III: a figure that cannot be computed is a dash with its reason, never zero or a guess (no stop = no R; no capital basis = no drawdown percentage; too few trades = say so).
- Figures are per account currency; no totals across currencies (the Trades list already says so).
- Backtest accounts stay out of live figures unless chosen.
- Small samples: show the count `n` beside every rate; below a threshold say "too few trades" rather than a confident number.
- Every figure must be computed by the app (SQL or Go), never by a model: this is what lets agents quote them later (idea C) without inventing patterns.

## 4. Gaps in Tradecraft itself

- **There is no landing page.** After sign-in the owner lands on Reviews. Every product above has a dashboard; our research (`09`, `10`) describes a Home with an Overview and a Dashboard mode and a year heatmap, weekly summary, unreviewed trades and recent items. None is built.
- Only closed trades, one entry and one exit (decision 2026-10-04): so MAE/MFE, scale-in analytics and partial fills are out.

## 5. Candidate first slice (for the owner to react to)

**Home** (becomes the landing page): headline cards for a chosen period and account scope, each with its process figure; an equity curve and daily result bars; a calendar heatmap; unreviewed days and trades; this week's focus and yesterday's focus; mistake counter.

**Analytics** screen: the performance statistics above, the breakdowns (weekday, hour, instrument, direction, account), the mistake cost table, and **Rule replay / edge leak**.

Left for later: composite score, drawdown percentages (needs capital basis), streak overlays, setup playbook analytics (needs setups, which do not exist yet), MAE/MFE.
