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
