# Domain rules

Where each trading rule used by Tradecraft v2 is defined (constitution principle VIII). A rule marked **unconfirmed**
is an interpretation the owner has not yet confirmed; each has a "Confirmed by owner on" line and a "Source" line. On
2026-10-13 the owner confirmed every rule below, one by one. The rules live in the database as SQL functions (see `specs/000-log-trades/data-model.md`);
this file says what they mean and shows worked examples that the tests also use.

## Trading day

The trading day of a trade is read from its **entry** time, in the journal time zone (one setting for the whole journal,
Central Time by default). A trade belongs to the day it was decided, whatever day it was exited.

- With no account start time: the calendar date of the entry.
- With an account start time S: add (24 hours − S) to the local entry time and take the date. So with S = 17:00, an entry
  at 17:00 or later counts to the next calendar date, and an entry at 16:59 stays on the same date.

Worked examples (journal zone America/Chicago, October, UTC−5, account start 17:00): entered Tue 7 Oct 17:30 gives 8 Oct;
entered Tue 7 Oct 16:59 gives 7 Oct; entered Tue 7 Oct 17:00 exactly gives 8 Oct; entered 16:50 and exited 17:10 gives
7 Oct (the exit does not matter); entered Tue 7 Oct 23:30 and exited Wed 8 Oct 00:20 gives 8 Oct. With no start time,
entered Tue 7 Oct 22:00 and exited Wed 8 Oct 01:00 gives 7 Oct.

- **Status:** confirmed by the owner on 2026-10-13. Decided 2026-10-11 (feature `003-backtest-accounts-and-agent-access`, user story 4): the day follows the
  **entry**, not the exit. It was exit-based from feature 000 until then; on arrival every trade's day was recomputed once
  from its entry. The cost, accepted by the owner: a day that was already reviewed shows a trade entered that day but exited
  later, so its figures can change. A future prop daily-loss rule may group by exit for its own purpose; that is its own decision.
- Confirmed by owner on: 2026-10-13
- Source: the owner, in chat, 2026-10-13 (all sixteen rules, ticked one by one after reading each in words)

## Gross result

For a long trade: (exit price − entry price) × size × dollars per point. For a short trade: (entry price − exit price) ×
size × dollars per point. Not defined when dollars per point is blank.

Worked example: NQ long, size 2, entry 21450.00, exit 21452.50, dollars per point 20: (21452.50 − 21450.00) × 2 × 20 = 100.00.

- **Status:** confirmed by the owner on 2026-10-13.
- Confirmed by owner on: 2026-10-13
- Source: the owner, in chat, 2026-10-13 (all sixteen rules, ticked one by one after reading each in words)

## Net result

Gross result minus the total cost. When dollars per point is blank, the net result is the result the owner typed (already
after costs) and the cost is not used.

Worked example: gross 100.00, cost 4.60: net 95.40.

- **Status:** confirmed by the owner on 2026-10-13 (a typed result is taken as after costs: owner decision 2026-10-04).
- Confirmed by owner on: 2026-10-13
- Source: the owner, in chat, 2026-10-13 (all sixteen rules, ticked one by one after reading each in words)

## Risk

|entry price − stop price| × size × dollars per point. Not defined when the stop or dollars per point is blank, and shown as
a dash with the reason "stop equals entry" when it works out to zero. A stop on the wrong side of the entry is allowed.

Worked example: entry 21450.00, stop 21440.00, size 2, dollars per point 20: 10 × 2 × 20 = 400.00.

- **Status:** confirmed by the owner on 2026-10-13.
- Confirmed by owner on: 2026-10-13
- Source: the owner, in chat, 2026-10-13 (all sixteen rules, ticked one by one after reading each in words)

## R

Net result divided by risk, kept to six decimal places and shown to two. Not defined when risk is not defined.

Worked example: net 95.40, risk 400.00: R = 0.2385, shown as 0.24 R.

- **Status:** confirmed by the owner on 2026-10-13 (R on the net result: owner decision 2026-10-04).
- Confirmed by owner on: 2026-10-13
- Source: the owner, in chat, 2026-10-13 (all sixteen rules, ticked one by one after reading each in words)

## Local time to an exact instant

A local date and time typed in the journal time zone is turned into an exact instant. A local time that does not exist (the hour
skipped when clocks go forward) is refused. A local time that happens twice (the hour repeated when clocks go back) uses its
first occurrence.

- **Status:** confirmed by the owner on 2026-10-13 (practically irrelevant for futures, which are closed when clocks change).
- Confirmed by owner on: 2026-10-13
- Source: the owner, in chat, 2026-10-13 (all sixteen rules, ticked one by one after reading each in words)

## Prices

Prices must be above zero. Sizes, costs and dollars per point are decimals with at most 8 decimal places.

- **Status:** confirmed by the owner on 2026-10-13 (a price of zero or below, such as the 2020 oil futures price, is refused for now).
- Confirmed by owner on: 2026-10-13
- Source: the owner, in chat, 2026-10-13 (all sixteen rules, ticked one by one after reading each in words)

# Feature 001: reviews, judging and focus

Every rule below is defined once, in the SQL of `backend/migrations/00007` to `00011`, and used by the day, the week and
the mistake counter alike. All were confirmed by the owner on 2026-10-13.

## Week and month

A week runs Monday to Sunday and a month is the calendar month, both taken on the **trading day** (never on the entry
or exit timestamp itself). A week is listed in the Reviews screen under the month its Sunday falls in. The mistake counter counts a week
whole in the week column, and in the month column only the days of that week that fall in the month.

Worked example: Wed 1 Oct 2025 is in the week of Mon 29 Sep to Sun 5 Oct, listed under October. That week crosses two months:
a trade on Tue 30 Sep and one on Wed 1 Oct both count in the week column of the mistake counter (2), while the month column
counts 1 for September (30 Sep) and 1 for October (1 Oct). The week's focus is found by its Monday, 29 Sep; the month focus
shown with it is the month of its Sunday, October.

- **Status:** confirmed by the owner on 2026-10-13 (Monday weeks; a week under the month of its Sunday).
- Confirmed by owner on: 2026-10-13
- Source: the owner, in chat, 2026-10-13 (all sixteen rules, ticked one by one after reading each in words)

## Today

"Today" belongs to the account: the trading day of the current moment (`account_today`). For an account whose trading day
starts at 17:00, today is already tomorrow at 17:30.

Worked example (a 17:00 account): a trade entered at 17:10 on Tue 30 Sep belongs to Wed 1 Oct; one entered at 16:50
belongs to Tue 30 Sep. The sample day of Wed 1 Oct 2025 uses a 17:00 account, so its three trades (entered at 09:41, 10:14,
10:40) all belong to 1 Oct. The database clock decides what "today" is, so tests that need the current week read it from the database.

- **Status:** confirmed by the owner on 2026-10-13.
- Confirmed by owner on: 2026-10-13
- Source: the owner, in chat, 2026-10-13 (all sixteen rules, ticked one by one after reading each in words)

## Daily and weekly states

A day with live trades and no saved review is **Missing** once the day has ended and **today** on the current trading day
(never Missing). A saved review is **Draft**; one with a reviewed time is **Reviewed**. A saved review keeps its state even if
its day later has no trades. A day with no trades and no review has no state. A week is **Missing** when it has ended, a day
has a live trade, and it has no reviewed mark; the current week is never Missing; a week with a mark is **Reviewed**.
Changing the time zone or an account's day start moves trades to other days but leaves reviews on the date they were written.

- **Status:** confirmed by the owner on 2026-10-13.
- Confirmed by owner on: 2026-10-13
- Source: the owner, in chat, 2026-10-13 (all sixteen rules, ticked one by one after reading each in words)

## Plan followed, wins and losses

A **win** has a net result above zero, a **loss** below zero; a break-even trade is neither and cannot be a valid loss.
**Plan followed X of Y**: X trades answered Yes of Y live trades; Partly never counts as followed; trades with no answer are
"not judged yet" and shown beside the others so the parts add up to Y.
**Valid loss**: the label is only possible when the plan answer is Yes and the trade is a loss; a plan answer other than Yes,
or an edit that stops the trade being a loss, clears it.
**Win rate k of n**: k wins of n live trades; the percentage is 100 k / n rounded half up to a whole percent, absent
(a dash, "no trades") when n is zero.

Worked example (the sample day, 1 Oct 2025): W +300.00 (plan Yes), L1 -125.00 (Yes, valid loss), L2 -130.00 (No, mistake,
tag Chased entry). Net +45.00; plan followed 2 of 3 (1 not followed, 0 partly); mistakes 1; valid losses 1 of 2 losing
trades; win rate 1 of 3 (33%).

- **Status:** confirmed by the owner on 2026-10-13.
- Confirmed by owner on: 2026-10-13
- Source: the owner, in chat, 2026-10-13 (all sixteen rules, ticked one by one after reading each in words)

## Mistakes and stop lines

The mistake count is the number of **records**: each tag on a live trade and each whole-day record, each once. The same mistake
tagged on a trade and also recorded for its day is two records. A trade labelled "mistake" with no tag adds nothing to a count.
A stop line (1 to 999) belongs to one period, a week or a month; its status is read from that period for the week or month being
viewed: STOP TRADING when the count has reached the line, otherwise the count only. A retired mistake appears only when it has a
count in the period.

Worked example: Moved stop has a stop line of 2 per week. L1 and L2 of the sample day are both tagged Moved stop: the week of
29 Sep shows "2 of 2 this week" and STOP TRADING; with one tag it shows "1 of 2 this week" and the count only; the week of 22 Sep
shows "0 of 2 this week". With the same mistake also recorded for the whole day (a day record) the count is 3, split "2 on trades
. 1 on the day".

- **Status:** confirmed by the owner on 2026-10-13.
- Confirmed by owner on: 2026-10-13
- Source: the owner, in chat, 2026-10-13 (all sixteen rules, ticked one by one after reading each in words)

## Focus (week and month)

A focus is a sentence of up to 280 **characters** (counted as characters, not bytes), one for a week and one for a month,
written by the owner and shown on every account's reviews in the period. An empty text clears it. The week is identified by its
Monday and the month by its first day; a daily review shows the focus of the week and month of its trading day.

- **Status:** confirmed by the owner on 2026-10-13.
- Confirmed by owner on: 2026-10-13
- Source: the owner, in chat, 2026-10-13 (all sixteen rules, ticked one by one after reading each in words)

## Weekly review

A weekly review is read from the seven days of one account's week and stores only one thing: a **reviewed mark** with its time.
Its figures come from the same SQL as a day, over the whole week, so a missing day's trades count in it and the week equals the
sum of its days. Marking again changes nothing and no mark can be removed. A week that has not started cannot be marked.
Day statuses in a week: Missing, Draft, Reviewed, Today, No trades (a day with nothing), Not yet (after today).

Worked example (the sample week of 29 Sep to 5 Oct 2025 with one extra +20.00 trade on Mon 29 Sep and a review saved for Wed
1 Oct): Mon missing, Tue none, Wed reviewed, Thu draft if a review was saved, Fri to Sun none; 4 trades, net +65.00.

- **Status:** confirmed by the owner on 2026-10-13.
- Confirmed by owner on: 2026-10-13
- Source: the owner, in chat, 2026-10-13 (all sixteen rules, ticked one by one after reading each in words)

## Yesterday's focus

The "yesterday" line of a daily review is the nearest earlier review **of the same account** whose "what will I focus on next
session" answer is not empty, labelled with its own date. The week and month focus belong to the owner (all accounts), decided
by the review's trading day.

- **Status:** confirmed by the owner on 2026-10-13.
- Confirmed by owner on: 2026-10-13
- Source: the owner, in chat, 2026-10-13 (all sixteen rules, ticked one by one after reading each in words)

# Feature 003: backtest accounts and agent read access

## Backtest accounts

An account has a **kind**, Live or Backtest. A new account is Live. The kind decides where the account's days, weeks
and trades **count**, never what they are: no trade, review, grade or focus is altered by changing it.

- A day of a Backtest account with trades and no saved review has **no state**: it is never Missing and never
  Today. A saved review still shows Draft or Reviewed. A week of a Backtest account is never Missing (it is "not
  reviewed" until marked).
- A list or figure that spans accounts covers **Live accounts only**: the Trades list with no account chosen (unless
  "Show backtests" is on) and the mistake counter's "all accounts". Choosing a Backtest account shows it, on its own.
- A figure of one account (a day, a week, plan followed X of Y, a stop line's status) reads only that account, so it
  does not change because a Backtest account exists.
- Backtests are told apart by the account they sit in, not by a flag on each trade. One account per backtest set is
  the expected way to work.

- **Status:** confirmed by the owner on 2026-10-13. Decided 2026-10-11 (account kind, not one account per backtest and
  not a per-trade flag); the exact rules above were read and confirmed on 2026-10-13.
- Confirmed by owner on: 2026-10-13
- Source: the owner, in chat, 2026-10-13 (all sixteen rules, ticked one by one after reading each in words)

# Feature 005: Home and Analytics

Every rule below is written once here, implemented once in `backend/internal/analytics` (with the words of each definition in `definitions.go`, which a test checks against this file), and used by Home and Analytics alike. All were read one by one with the owner and **confirmed on 2026-10-31** (feature 005, task T055). Worked examples use the reference month of `specs/005-home-and-analytics/quickstart.md`: October 2026, twelve USD trades with results +120, -90, +60, -150, +200, +80, -40, +110, -70, +150, -90, +60 (net +340.00), plan answers Yes, not judged, Yes, No, Yes, Yes, Partly, Yes, not judged, Yes, No, not judged.

## Scope of a figure

A trade is in the figures when it is not deleted, its trading day is in the chosen period (first and last trading day, both included), and its account is in the chosen scope: with no account chosen, **all Live accounts, archived ones included**; a chosen account of any kind is shown on its own. Backtest accounts are never mixed into the all-accounts scope. Figures are made **per currency**: the trades of the scope are grouped by their account's currency and each group is its own block. Nothing is added or converted across currencies and no capital basis is invented.

- **Status:** confirmed by the owner on 2026-10-31.
- Confirmed by owner on: 2026-10-31
- Source: owner decisions 2026-10-27 and 2026-10-30; `specs/005-home-and-analytics/research.md` section 2. Confirmed: the owner, in chat, 2026-10-31 (all eleven rules, read one by one in words with their worked examples).

## Win, loss, set aside, and win rate

A **win** has a net result above zero and a **loss** below zero (as in feature 001). With a **break-even band** b greater than zero (a view option, never saved) a trade whose net result is from -b to +b is **set aside**: neither a win nor a loss for the win rate and the streaks. **Win rate k of n**: k wins of n counted trades, where the counted trades are those not set aside; the percentage is 100 k / n rounded half up to a whole percent, a dash with the reason "no trades" when n is zero. A win rate with n below 10 is marked **few trades**.

Worked example (reference month): 7 wins of 12 counted, 58%. With b = 40.00 the trade of -40.00 is set aside: 7 of 11, 64%.

- **Status:** confirmed by the owner on 2026-10-31.
- Confirmed by owner on: 2026-10-31
- Source: the owner's request for a break-even band option (2026-10-27); `research/06-analytics-and-scoring.md`. Confirmed: the owner, in chat, 2026-10-31 (all eleven rules, read one by one in words with their worked examples).

## Profit factor, average win and loss, payoff ratio

**Profit factor** is the sum of the winning net results divided by the absolute sum of the losing net results, over all trades of the block, whatever the band (the band changes what counts as a win, never the money); six decimals, shown to two. It is a dash with the reason "no losing trades" when there is none, and with "needs at least 2 trades, has N" below 2 trades. **Average win** is the mean net result of the wins and **average loss** the mean of the losses (strictly above and below zero, the band ignored), each a dash with "no winning trades" or "no losing trades" when there are none. **Payoff ratio** is the average win divided by the absolute average loss, a dash with "needs a win and a loss" otherwise.

Worked example (reference month): wins 780.00 over 7 trades, losses 440.00 over 5: profit factor 780 / 440 = 1.77, average win 111.43, average loss 88.00, payoff 1.27. A ten-trade example: wins +200, +100, +50 and losses -80, -40, -60, -30, -20, -50, -10 give profit factor 350 / 290 = 1.21, average win 116.67, average loss 41.43, payoff 2.82.

- **Status:** confirmed by the owner on 2026-10-31.
- Confirmed by owner on: 2026-10-31
- Source: common definitions of the field (`research/14-analytics-concepts.md`); the minimum sample is this feature's own rule. Confirmed: the owner, in chat, 2026-10-31 (all eleven rules, read one by one in words with their worked examples).

## Expectancy

**Expectancy in money** is the net result of all trades divided by their number (six decimals, shown to two). **Expectancy in R** is the sum of the R multiples of the trades that have one divided by their number; the figure says how many trades had an R ("8 of 12 trades") and is a dash with "no stop recorded on N of N trades" when none has. Both are dashes with "needs at least 2 trades, has N" below 2 trades.

Worked example: net +340.00 over 12 trades: +28.33 per trade; ten trades of the example above: 60 / 10 = 6.00.

- **Status:** confirmed by the owner on 2026-10-31.
- Confirmed by owner on: 2026-10-31
- Source: common definitions of the field; the R rule is feature 000's (net divided by risk). Confirmed: the owner, in chat, 2026-10-31 (all eleven rules, read one by one in words with their worked examples).

## Largest win and largest loss

The **largest win** is the highest net result above zero and the **largest loss** the lowest below zero, each with the trading day of the trade (the earlier one when two are equal); a dash with "no winning trades" or "no losing trades" when there is none.

Worked example (reference month): +200.00 on Thu 8 Oct, -150.00 on Tue 6 Oct.

- **Status:** confirmed by the owner on 2026-10-31.
- Confirmed by owner on: 2026-10-31
- Source: common definitions of the field. Confirmed: the owner, in chat, 2026-10-31 (all eleven rules, read one by one in words with their worked examples).

## Maximum drawdown

The running net result is taken trade by trade in **trading-day order, then entry time, then id**. The peak starts at 0 before the first trade. The **maximum drawdown** is the largest fall from a peak to a later point of the running result, in money (a positive amount shown as a loss, for example -150.00), with the trading day of the peak ("the start" when the peak is the 0 before the first trade) and of the trough. With two or more trades and no fall it is zero, with the day of the first trade for both. It is a dash with "needs at least 2 trades, has N" below 2 trades. It is never a percentage: the journal has no capital to take one of.

Worked example (reference month): the running result is 120, 30, 90, -60, 140, 220, 180, 290, 220, 370, 280, 340. The running result peaks at 120.00 on Thu 1 Oct and later falls to -60.00 on Tue 6 Oct (the lower peaks of 90.00 and 220.00 fall less): the largest fall is 180.00.

- **Status:** confirmed by the owner on 2026-10-31.
- Confirmed by owner on: 2026-10-31
- Source: `research/06-analytics-and-scoring.md` (drawdown on realised results); the start-at-zero peak is this feature's rule. Confirmed: the owner, in chat, 2026-10-31 (all eleven rules, read one by one in words with their worked examples).

## Streaks

A **winning streak** is a run of consecutive wins and a **losing streak** a run of consecutive losses, in the order of the running result. A trade that is neither (zero, or set aside by the band) ends a run without extending it. The figure is the length of the longest run with the days of its first and last trade; a dash with "needs at least 2 trades, has N" below 2 trades, and "no winning trades" or "no losing trades" when none exists.

Worked example (reference month): the longest winning streak is 2 (Thu 8 and Fri 9 Oct), the longest losing streak 1.

- **Status:** confirmed by the owner on 2026-10-31.
- Confirmed by owner on: 2026-10-31
- Source: common definitions of the field. Confirmed: the owner, in chat, 2026-10-31 (all eleven rules, read one by one in words with their worked examples).

## Minimum samples

A statistic that needs more than one trade (profit factor, expectancy, payoff ratio, drawdown, streaks) is a dash below 2 trades. A rate or a ratio made of fewer than 10 trades is marked **few trades** (shown, never hidden). Every figure shows the number of trades it was made of.

- **Status:** confirmed by the owner on 2026-10-31 (the numbers 2 and 10 as proposed).
- Confirmed by owner on: 2026-10-31
- Source: constitution III (every statistic states its definition and its sample size). Confirmed: the owner, in chat, 2026-10-31 (all eleven rules, read one by one in words with their worked examples).

## Weekday and hour

The **weekday** of a trade is the weekday of its **trading day**, not of the calendar date of its entry (they differ for an account that starts its day in the evening). The **hour** is the hour of the **entry** in the journal time zone, so 09:41 and 10:14 fall in the 09:00 and the 10:00 hour. Weekdays Monday to Friday are always listed in the breakdown, Saturday and Sunday only when they have a trade, and the other breakdowns list only the values that have trades.

- **Status:** confirmed by the owner on 2026-10-31.
- Confirmed by owner on: 2026-10-31
- Source: the trading-day rule of feature 003; owner answer 2026-10-30 on weekends. Confirmed: the owner, in chat, 2026-10-31 (all eleven rules, read one by one in words with their worked examples).

## Edge leak and Rule replay

The trades of a block are split by their plan answer into **followed** (Yes), **not followed** (No or Partly, because Partly never counts as following the plan) and **not judged yet** (no answer). The **edge leak** is the net result of the not-followed trades (negative when they cost money, positive when plan-breaking trades earned it). The replay lines are: followed, not followed (the edge leak), not judged yet, **actual** (their sum) and **without the plan-breaking trades** (the actual result minus the edge leak, so the not-judged trades stay in). Each line shows its trade count and the screen says how many trades are judged of how many. A trade not judged yet is never placed on a side by guess.

Worked example (reference month): followed +720.00 (6 trades), not followed -280.00 (3), not judged -100.00 (3), actual +340.00 (12), without the plan-breaking trades +620.00 (9). The sample day of feature 001 (W +300 Yes, L1 -125 Yes, L2 -130 No): actual +45.00, edge leak -130.00, without +175.00, 3 of 3 judged.

- **Status:** confirmed by the owner on 2026-10-31 (No or Partly, answered 2026-10-30).
- Confirmed by owner on: 2026-10-31
- Source: the owner, 2026-10-27 (edge leak in the first slice) and 2026-10-30 (the definition); `research/12-owner-decisions.md` idea C. Confirmed: the owner, in chat, 2026-10-31 (all eleven rules, read one by one in words with their worked examples).

## Cost of a mistake

For each mistake, the **trades that carry it** in the scope (each trade once per mistake it carries, so a trade with two mistakes appears under both and the rows do not add up to a total), the sum of their net results, their plan figure, and the mistake's **records** for the period (the same count as the Mistakes counter: each tag on a trade and each whole-day record). A mistake with no trade in the scope is not listed.

Worked example (reference month): Chased entry on two trades (-150.00 and -90.00): 2 trades, -240.00; Moved stop on the second of them: 1 trade, -90.00.

- **Status:** confirmed by the owner on 2026-10-31.
- Confirmed by owner on: 2026-10-31
- Source: the owner's request for the cost of each mistake (2026-10-27); `research/14-analytics-concepts.md`. Confirmed: the owner, in chat, 2026-10-31 (all eleven rules, read one by one in words with their worked examples).

## Definitions shown on the screens

The words the screens and the API show for each statistic (the Definition link of every row). They are the same text as in `backend/internal/analytics/definitions.go`, and a test checks that the two files agree. The sections above say the rules in full with their worked examples.

- **netResult**: The sum of the net results of the trades in the scope: gross result minus costs, or the typed result when there are no dollars per point. Closed trades only, judged or not.
- **winRate**: The number of winning trades (net result above zero) out of the trades counted, as k of n with a percentage rounded half up to a whole number. A trade inside the break-even band, when a band is set, is set aside and not counted. Marked few trades below 10.
- **profitFactor**: The sum of the net results of the winning trades divided by the sum of the net results of the losing trades, as a positive number. Not shown when there is no losing trade or fewer than 2 trades. Every trade in the scope counts, judged or not, whatever the break-even band.
- **expectancy**: The net result of all the trades divided by their number: what a trade is worth on average. Not shown below 2 trades.
- **expectancyR**: The sum of the R multiples of the trades that have one divided by their number. A trade has an R only when a stop was recorded. Not shown when no trade has one or below 2 trades.
- **averageWin**: The mean net result of the winning trades (net result above zero). The break-even band is ignored. Not shown when there is no winning trade.
- **averageLoss**: The mean net result of the losing trades (net result below zero). The break-even band is ignored. Not shown when there is no losing trade.
- **payoffRatio**: The average win divided by the average loss, as a positive number: how much a win is worth compared with a loss. Not shown without a win and a loss.
- **largestWin**: The highest net result above zero, with its trading day. Not shown when there is no winning trade.
- **largestLoss**: The lowest net result below zero, with its trading day. Not shown when there is no losing trade.
- **maxDrawdown**: The largest fall of the running net result from a peak to a later low, in money, with the days of the peak and the trough. The running result starts at 0 and trades are taken in trading-day, then entry-time order. Never a percentage: there is no capital to take one of. Not shown below 2 trades.
- **winStreak**: The longest run of consecutive winning trades, in the order of the running result. A trade that is neither a win nor a loss (zero, or inside the break-even band) ends a run. Not shown below 2 trades.
- **lossStreak**: The longest run of consecutive losing trades, in the order of the running result. A trade that is neither a win nor a loss (zero, or inside the break-even band) ends a run. Not shown below 2 trades.
