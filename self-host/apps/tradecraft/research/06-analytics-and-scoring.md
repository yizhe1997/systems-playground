# Analytics, scoring, streaks, setups analytics

## Home dashboard widgets (read)

Draggable and resizable grid. Widgets seen: trading heatmap (year), weekly summary, recent items, getting started, current streak (trade and review streaks), best hours, top breakdown (by setup, tag and so on), unreviewed trades, goal progress, trading score, embedded note, position size calculator, key events, plus the prop widgets (AUM, drawdown monitor, profit target, eval ROI, challenge alerts).

Analytics widgets also include: performance calendar, daily performance, trades chart, MFE vs realised P&L scatter, weekday and hourly performance, ticker performance, cumulative P&L (total, long, short), drawdown (total, long, short, directional), rolling win/loss ratio and rolling average win and loss.

## Trading score (read)

One 0 to 100 number with a label (poor, below average, average, strong, excellent at cut points 30, 50, 70, 90). It is a weighted sum of six axes:

| Axis | Weight | Built from |
|---|---|---|
| Risk management | 25% | max drawdown (in R when available), recovery factor |
| Profitability | 20% | profit factor, expectancy (R-based when R exists) |
| Execution | 15% | win rate, average win to average loss ratio |
| Consistency | 15% | stability of returns (coefficient of variation), streak stability |
| Return consistency | 10% | variation of positive R and of negative R |
| Experience | 15% | number of active weeks, and share of weeks that were active |

Each input is mapped to 0 to 100 with a piecewise-linear table (for example profit factor 1.0 maps to about 40, 1.5 to 70, 2.0 to 85, 3.0 to 95). Experience has phases: **insufficient** under 4 active weeks (score capped low), **developing** 4 to 11, **established** from 12. Low consistency of activity scales the experience score down (x0.85 under 75 percent of weeks active, x0.7 under 50 percent).

Take-away (inferred): the score is a pleasant summary, but the weights and tables are opinions. v2 could ship it later and expose the breakdown, which is the useful part.

## Drawdown analytics (read)

Computed on realised P&L, for combined, long and short. Percentages need a **capital basis** (none, starting equity, or a fixed capital) and the analysis says "unavailable, a capital basis is required" when there is none, instead of inventing one. Same honesty as v1's decision to show ratios in dollars.

## Review streaks (read)

Kinds: trade review, daily review, weekly review, monthly review. A streak is the number of consecutive required units that were reviewed, anchored on the most recent reviewed unit; the current, still-open unit is "pending" and does not break it. Options: skip weekends, week start day. Reports missed required units.

## Setups analytics (read)

Per setup: win rate, total, average winner and loser, win, lose and current streaks, expected value, risk-reward, profit factor, average duration, best and worst, average volume, last trade, trading frequency, and an **inactivity streak**. Plus live vs missed vs backtest buckets (count, win rate, P&L, profit factor, R), missed-opportunity rate, backtest-minus-live R, and counts of missed reasons. Plus **setup combinations** (which setups appear together and how those trades do) and a "needs attention" flag.

## Other (read)

- **Break-even range:** win rate excludes trades inside a configurable break-even band, so scratch trades do not count as losses.
- **Position size calculator:** a small tool from account balance, risk and stop.
- **Tickers and instruments:** symbol normalisation (contract months, micro and mini), instrument spec table.
- **Currencies:** every figure can be aggregated across currencies with stored rates.
- **Trade grouping:** fills are grouped into trades by account, symbol and time.

## Not found in the RP

- Rule Replay and Edge Leak (what the day looks like without the rule-breaking trades): not present. This is a Tradecraft v1 strength.
- Any AI or MCP integration beyond an "AI mapping" switch in the paid import (server side). So "AI/MCP friendly" is a real differentiator, not a feature to copy.
