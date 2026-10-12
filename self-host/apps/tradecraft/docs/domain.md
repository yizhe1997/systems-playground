# Domain rules

Where each trading rule used by Tradecraft v2 is defined (constitution principle VIII). A rule marked **unconfirmed**
is an interpretation the owner has not yet confirmed; each has a "Confirmed by owner on" line and a "Source" line,
both empty until filled. The rules live in the database as SQL functions (see `specs/000-log-trades/data-model.md`);
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

- **Status:** owner decision 2026-10-11 (feature `003-backtest-accounts-and-agent-access`, user story 4): the day follows the
  **entry**, not the exit. It was exit-based from feature 000 until then; on arrival every trade's day was recomputed once
  from its entry. The cost, accepted by the owner: a day that was already reviewed shows a trade entered that day but exited
  later, so its figures can change. A future prop daily-loss rule may group by exit for its own purpose; that is its own decision.
- Confirmed by owner on:
- Source:

## Gross result

For a long trade: (exit price − entry price) × size × dollars per point. For a short trade: (entry price − exit price) ×
size × dollars per point. Not defined when dollars per point is blank.

Worked example: NQ long, size 2, entry 21450.00, exit 21452.50, dollars per point 20: (21452.50 − 21450.00) × 2 × 20 = 100.00.

- **Status:** unconfirmed.
- Confirmed by owner on:
- Source:

## Net result

Gross result minus the total cost. When dollars per point is blank, the net result is the result the owner typed (already
after costs) and the cost is not used.

Worked example: gross 100.00, cost 4.60: net 95.40.

- **Status:** unconfirmed (a typed result is taken as after costs: owner decision 2026-10-04).
- Confirmed by owner on:
- Source:

## Risk

|entry price − stop price| × size × dollars per point. Not defined when the stop or dollars per point is blank, and shown as
a dash with the reason "stop equals entry" when it works out to zero. A stop on the wrong side of the entry is allowed.

Worked example: entry 21450.00, stop 21440.00, size 2, dollars per point 20: 10 × 2 × 20 = 400.00.

- **Status:** unconfirmed.
- Confirmed by owner on:
- Source:

## R

Net result divided by risk, kept to six decimal places and shown to two. Not defined when risk is not defined.

Worked example: net 95.40, risk 400.00: R = 0.2385, shown as 0.24 R.

- **Status:** unconfirmed (R on the net result: owner decision 2026-10-04).
- Confirmed by owner on:
- Source:

## Local time to an exact instant

A local date and time typed in the journal time zone is turned into an exact instant. A local time that does not exist (the hour
skipped when clocks go forward) is refused. A local time that happens twice (the hour repeated when clocks go back) uses its
first occurrence.

- **Status:** unconfirmed (practically irrelevant for futures, which are closed when clocks change).
- Confirmed by owner on:
- Source:

## Prices

Prices must be above zero. Sizes, costs and dollars per point are decimals with at most 8 decimal places.

- **Status:** unconfirmed (a price of zero or below, such as the 2020 oil futures price, is refused for now).
- Confirmed by owner on:
- Source:

# Feature 001: reviews, judging and focus

Every rule below is defined once, in the SQL of `backend/migrations/00007` to `00011`, and used by the day, the week and
the mistake counter alike. All are **unconfirmed** interpretations until the owner confirms them.

## Week and month

A week runs Monday to Sunday and a month is the calendar month, both taken on the **trading day** (never on the entry
or exit timestamp itself). A week is listed in the Reviews screen under the month its Sunday falls in. The mistake counter counts a week
whole in the week column, and in the month column only the days of that week that fall in the month.

Worked example: Wed 1 Oct 2025 is in the week of Mon 29 Sep to Sun 5 Oct, listed under October. That week crosses two months:
a trade on Tue 30 Sep and one on Wed 1 Oct both count in the week column of the mistake counter (2), while the month column
counts 1 for September (30 Sep) and 1 for October (1 Oct). The week's focus is found by its Monday, 29 Sep; the month focus
shown with it is the month of its Sunday, October.

- **Status:** unconfirmed (Monday weeks; a week under the month of its Sunday).
- Confirmed by owner on:
- Source:

## Today

"Today" belongs to the account: the trading day of the current moment (`account_today`). For an account whose trading day
starts at 17:00, today is already tomorrow at 17:30.

Worked example (a 17:00 account): a trade entered at 17:10 on Tue 30 Sep belongs to Wed 1 Oct; one entered at 16:50
belongs to Tue 30 Sep. The sample day of Wed 1 Oct 2025 uses a 17:00 account, so its three trades (entered at 09:41, 10:14,
10:40) all belong to 1 Oct. The database clock decides what "today" is, so tests that need the current week read it from the database.

- **Status:** unconfirmed.
- Confirmed by owner on:
- Source:

## Daily and weekly states

A day with live trades and no saved review is **Missing** once the day has ended and **today** on the current trading day
(never Missing). A saved review is **Draft**; one with a reviewed time is **Reviewed**. A saved review keeps its state even if
its day later has no trades. A day with no trades and no review has no state. A week is **Missing** when it has ended, a day
has a live trade, and it has no reviewed mark; the current week is never Missing; a week with a mark is **Reviewed**.
Changing the time zone or an account's day start moves trades to other days but leaves reviews on the date they were written.

- **Status:** unconfirmed.
- Confirmed by owner on:
- Source:

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

- **Status:** unconfirmed.
- Confirmed by owner on:
- Source:

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

- **Status:** unconfirmed.
- Confirmed by owner on:
- Source:

## Focus (week and month)

A focus is a sentence of up to 280 **characters** (counted as characters, not bytes), one for a week and one for a month,
written by the owner and shown on every account's reviews in the period. An empty text clears it. The week is identified by its
Monday and the month by its first day; a daily review shows the focus of the week and month of its trading day.

- **Status:** unconfirmed.
- Confirmed by owner on:
- Source:

## Weekly review

A weekly review is read from the seven days of one account's week and stores only one thing: a **reviewed mark** with its time.
Its figures come from the same SQL as a day, over the whole week, so a missing day's trades count in it and the week equals the
sum of its days. Marking again changes nothing and no mark can be removed. A week that has not started cannot be marked.
Day statuses in a week: Missing, Draft, Reviewed, Today, No trades (a day with nothing), Not yet (after today).

Worked example (the sample week of 29 Sep to 5 Oct 2025 with one extra +20.00 trade on Mon 29 Sep and a review saved for Wed
1 Oct): Mon missing, Tue none, Wed reviewed, Thu draft if a review was saved, Fri to Sun none; 4 trades, net +65.00.

- **Status:** unconfirmed.
- Confirmed by owner on:
- Source:

## Yesterday's focus

The "yesterday" line of a daily review is the nearest earlier review **of the same account** whose "what will I focus on next
session" answer is not empty, labelled with its own date. The week and month focus belong to the owner (all accounts), decided
by the review's trading day.

- **Status:** unconfirmed.
- Confirmed by owner on:
- Source:

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

- **Status:** interpretation recorded 2026-10-12 from the owner's decision of 2026-10-11 (account kind, not one account
  per backtest and not a per-trade flag). The exact rules above are not yet confirmed by the owner.
- Confirmed by owner on:
- Source:
