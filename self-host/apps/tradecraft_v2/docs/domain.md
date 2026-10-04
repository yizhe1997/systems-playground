# Domain rules

Where each trading rule used by Tradecraft v2 is defined (constitution principle VIII). A rule marked **unconfirmed**
is an interpretation the owner has not yet confirmed; each has a "Confirmed by owner on" line and a "Source" line,
both empty until filled. The rules live in the database as SQL functions (see `specs/000-log-trades/data-model.md`);
this file says what they mean and shows worked examples that the tests also use.

## Trading day

The trading day of a trade is read from its **exit** time, in the journal time zone (one setting for the whole journal,
Central Time by default).

- With no account start time: the calendar date of the exit.
- With an account start time S: add (24 hours − S) to the local exit time and take the date. So with S = 17:00, an exit
  at 17:00 or later counts to the next calendar date, and an exit at 16:59 stays on the same date.

Worked examples (journal zone America/Chicago, October, UTC−5, account start 17:00): Tue 7 Oct 17:30 gives 8 Oct; Tue 7 Oct
16:59 gives 7 Oct; Tue 7 Oct 17:00 exactly gives 8 Oct; with no start time, Tue 7 Oct 17:30 gives 7 Oct.

- **Status:** unconfirmed (trading day from the exit time, not the entry time).
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

A week runs Monday to Sunday and a month is the calendar month, both taken on the **trading day** (never on the exit
timestamp). A week is listed in the Reviews screen under the month its Sunday falls in. The mistake counter counts a week
whole in the week column, and in the month column only the days of that week that fall in the month.

Worked example: Wed 1 Oct 2025 is in the week of Mon 29 Sep to Sun 5 Oct, listed under October.

- **Status:** unconfirmed (Monday weeks; a week under the month of its Sunday).
- Confirmed by owner on:
- Source:

## Today

"Today" belongs to the account: the trading day of the current moment (`account_today`). For an account whose trading day
starts at 17:00, today is already tomorrow at 17:30.

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
