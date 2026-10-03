# Feature Specification: Log Trades

**Feature Directory**: `specs/000-log-trades`

**Created**: 2026-10-03

**Status**: Draft

**Input**: Owner's description: the smallest accounts and trades that feature `001-journal-and-reflect` depends on, usable on its own as a simple trade log. Source: `research/13-trades-and-accounts.md` (section 4 proposal and section 6 owner decisions). Nothing here is reused from Tradecraft v1.

## Why this feature, and who it is for

The owner is one person: a day trader who takes a few trades a day on futures. The daily review in `001` needs two things to exist first: the account a day belongs to, and the trades that happened on it. This feature is exactly that and nothing more. On its own it is a simple trade log: create an account, record a closed trade, see your trades for a period, correct or remove one.

It is deliberately small. The trading day, the exact money, and the honest dash for what cannot be computed are in; everything a bigger journal has (balances, rules, tags, imports, several fills per trade) is not.

## Clarifications

### Session 2026-10-04

- Q: Should the time zone be one setting for the whole journal, or one per account? → A: One setting for the whole journal (Central Time by default, changeable); accounts have no time zone of their own.
- Q: When the owner types a result because dollars per point is blank, is it before or after costs? → A: After costs: the typed value is the net result, and the costs field is not used for that trade.
- Q: What should happen to an account that has trades when the owner no longer wants it? → A: Archive only, never delete: an archived account is hidden from the account chooser when logging a trade and from the accounts list by default, its trades are kept and still appear in the trades list, and it can be restored.
- Q: If the owner changes an account's currency after trades exist on it, what should happen? → A: The currency can always be changed. It is only a label, and nothing is converted; the product warns that old results are relabelled, not converted. Currency conversion is not planned.
- Q: Should R use the net result (after costs) or the gross result (before costs)? → A: The net result: R = net result ÷ risk.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Set up an account and log a trade (Priority: P1)

The owner creates an account by giving it a name and a currency. Then they log a trade on it: the instrument, long or short, the size, the entry price and time, the exit price and time, the dollar value of one price point, and the total costs. The trade appears with its net result already worked out.

**Why this priority**: nothing else works without an account and a trade. It is also the smallest thing that is useful by itself.

**Independent Test**: create an account "Funded 50K" in USD. Log a long trade in NQ: size 2, entry 21450.00, exit 21452.50, dollars per point 20, costs 4.60. Confirm the trade shows a gross result of +100.00 and a net result of +95.40, exactly.

**Acceptance Scenarios**:

1. **Given** no accounts exist, **When** the owner opens the app, **Then** they are invited to create an account and cannot log a trade until one exists.
2. **Given** an account exists, **When** the owner logs a trade with all required fields, **Then** it is saved and shown in the trades list with its net result.
3. **Given** a long trade, **When** the exit is above the entry, **Then** the result is positive; **Given** a short trade, **When** the exit is below the entry, **Then** the result is positive.
4. **Given** costs are entered, **When** the trade is saved, **Then** the net result is the gross result minus the costs, and both can be seen.
5. **Given** a required field is missing or invalid (size not above zero, exit earlier than entry, no instrument), **When** the owner saves, **Then** the trade is not saved and the message names the field and the problem.

---

### User Story 2 - See my trades for an account and a period (Priority: P1)

The owner opens the trades list. It shows their trades, newest first, and can be narrowed by account and by a date range. With nothing to show, it says why and what to do.

**Why this priority**: a log is only useful if you can look at it.

**Independent Test**: log trades on two accounts across two months, then filter by one account and one month and confirm only the matching trades are listed, newest first.

**Acceptance Scenarios**:

1. **Given** trades exist, **When** the owner opens the list, **Then** it shows the current month's trades for all accounts, newest first.
2. **Given** the owner picks an account and a date range, **When** the list updates, **Then** only trades of that account whose trading day falls in the range are shown.
3. **Given** the filters match nothing, **When** the list is shown, **Then** it says there are no trades for those filters and offers to clear them.
4. **Given** no trades exist at all, **When** the list is shown, **Then** it says so and offers to log the first trade.
5. **Given** accounts in different currencies, **When** the list shows results, **Then** each result is shown in its own account's currency and no figure adds different currencies together.

---

### User Story 3 - Correct or remove a trade (Priority: P2)

The owner edits any field of a trade, or deletes it. A deleted trade leaves the list but can be brought back.

**Why this priority**: entry mistakes are certain; losing a trade for good by accident must not be possible.

**Independent Test**: edit a trade's exit price and confirm the result changes; delete it, confirm it leaves the list; restore it and confirm it returns unchanged.

**Acceptance Scenarios**:

1. **Given** a trade, **When** the owner changes a price, size, time or cost and saves, **Then** the derived figures update.
2. **Given** a trade, **When** the owner deletes it, **Then** it no longer appears in the list or in any figure.
3. **Given** a deleted trade, **When** the owner restores it, **Then** it returns exactly as it was.
4. **Given** a trade on a day, **When** the owner moves its exit time to another day, **Then** it appears under that other trading day.

---

### User Story 4 - Type the result when the dollar value per point is unknown (Priority: P2)

Sometimes the owner does not have the dollar value of a point at hand. They leave it blank and type the result instead. The trade is still saved, and the figures that need the missing value show a dash with the reason.

**Why this priority**: it keeps logging possible when information is incomplete, without inventing a number.

**Independent Test**: log a trade with dollars per point left blank and a typed result of -120.00. Confirm the result shows -120.00 and that risk and R show a dash with a reason; then add the dollar value and confirm the result is now computed and replaces the typed one.

**Acceptance Scenarios**:

1. **Given** dollars per point is blank, **When** the owner saves, **Then** the form requires a typed result and the trade is saved with it.
2. **Given** dollars per point is present, **When** the owner saves, **Then** the result is computed and any typed result is not used.
3. **Given** a trade has no stop, or no dollars per point, **When** it is shown, **Then** risk and R show a dash and say which value is missing.
4. **Given** a trade has a stop, dollars per point and a computed result, **When** it is shown, **Then** risk and R are shown.

---

### User Story 5 - A trade lands on the right trading day (Priority: P3)

Each account can have a trading-day start time (for example 5:00 PM for evening futures sessions). A trade that exits at or after that time counts to the next calendar day. With no start time, a trade counts to the calendar date of its exit. All times are read in the journal's time zone, Central Time unless the owner changes it.

**Why this priority**: it matters only for trades near the boundary, but `001` builds a daily review per trading day on this, so it must be right.

**Independent Test**: set a start time of 17:00 on an account, log a trade exiting at 17:30 on a Tuesday, and confirm it appears under Wednesday; log one exiting at 16:59 and confirm Tuesday; clear the start time and confirm both are on Tuesday.

**Acceptance Scenarios**:

1. **Given** an account with a start time of 17:00, **When** a trade exits at 17:00 or later, **Then** its trading day is the next calendar date.
2. **Given** the same account, **When** a trade exits before 17:00, **Then** its trading day is that calendar date.
3. **Given** an account with no start time, **When** a trade exits at any time, **Then** its trading day is the calendar date of the exit.
4. **Given** the owner changes the time zone, **When** the list is shown, **Then** times and trading days are read in the new zone.
5. **Given** the clocks change for daylight saving, **When** a trade is logged around the change, **Then** its trading day is still right.

---

### User Story 6 - Edit an account (Priority: P3)

The owner renames an account, changes its currency or its trading-day start time.

**Why this priority**: setup mistakes happen, and the day rule above depends on this setting.

**Independent Test**: rename an account and confirm the list and trades show the new name; change its start time and confirm existing trades move to the correct trading days.

**Acceptance Scenarios**:

1. **Given** an account, **When** the owner renames it to a name already used by another account (ignoring case), **Then** the change is refused with a plain message.
2. **Given** an account with trades, **When** the owner changes its start time, **Then** the trading day of its trades is recomputed.
3. **Given** accounts, **When** the owner opens the accounts list, **Then** each account is shown with its currency and start time.
4. **Given** an account with trades, **When** the owner archives it, **Then** it disappears from the account chooser and the default accounts list, its trades remain in the trades list, and restoring it brings it back.
5. **Given** an account with trades, **When** the owner changes its currency, **Then** the change is allowed after a warning that existing results are shown with the new currency label and are not converted.

---

### Edge Cases

- A trade whose exit is exactly at the account's start time: it belongs to the next calendar day.
- A trade that spans midnight or several days: its trading day comes from its exit time.
- Entry and exit at the same instant: allowed; the result is zero before costs only if the prices are equal.
- Entry and exit prices equal with costs: the net result is negative by the costs.
- A stop equal to the entry price: risk would be zero, so risk and R show a dash with the reason "stop equals entry".
- A stop on the "wrong" side of the entry (for example above the entry on a long): allowed, because a stop can be moved past the entry; risk uses the distance between them.
- Very large or very small numbers, and many decimal places: money stays exact, with no rounding drift.
- An account name with extra spaces or different case: treated as the same name.
- A trade logged for a time in the future: refused with a plain message.
- Clearing the dollars-per-point value on a saved trade: the form asks for a typed result.
- Two trades identical in every field: allowed (the owner may have taken them).

## Requirements *(mandatory)*

### Functional Requirements

**Accounts**
- **FR-001**: The owner MUST be able to create an account with a name and a currency, and optionally a trading-day start time.
- **FR-002**: An account name MUST be unique, ignoring case and surrounding spaces, and 1 to 80 characters.
- **FR-003**: The owner MUST be able to edit an account's name, currency and trading-day start time, and to see all accounts in a list with their currency and start time.
- **FR-004**: A trade MUST NOT be loggable until at least one account exists.
- **FR-004a**: The owner MUST be able to archive an account and restore an archived one. An account is never deleted. An archived account MUST be left out of the account chooser when logging a trade and out of the accounts list by default (a "Show archived" switch reveals it); its trades MUST stay in the trades list and in exports, and its name stays reserved.

**Trades**
- **FR-005**: The owner MUST be able to log a closed trade on an account with: instrument (free text), direction (long or short), size (above zero), one entry price and time, one exit price and time, and one total cost (zero or more, default zero).
- **FR-006**: A trade MAY also carry a dollars-per-point value (above zero), a stop price, and a thesis note (why the trade was taken).
- **FR-007**: The exit time MUST NOT be earlier than the entry time, and neither time MAY be in the future.
- **FR-008**: The owner MUST be able to edit any field of a trade, and to delete it so that it can be restored (soft delete); a deleted trade MUST NOT appear in the list or in any figure until restored, and the owner MUST be able to view deleted trades to restore them.
- **FR-009**: When dollars per point is present, the gross result MUST be computed as (exit price − entry price) × size × dollars per point for a long trade, and (entry price − exit price) × size × dollars per point for a short trade; the net result MUST be the gross result minus the cost.
- **FR-010**: When dollars per point is blank, the owner MUST type the result, and that typed value is the trade's net result; gross result is then not shown.
- **FR-011**: Risk MUST be |entry price − stop price| × size × dollars per point, and R MUST be the net result divided by risk. When any needed value is missing or risk is zero, risk and R MUST show a dash and a short reason naming what is missing (constitution principle III).
- **FR-012**: All money values MUST be exact decimals, shown in the account's currency, with no floating-point error.

**Trading day and time**
- **FR-013**: A trade's trading day MUST be derived from its exit time, read in the journal's time zone: with an account start time set, an exit at or after that time counts to the next calendar date; with none, to the calendar date of the exit.
- **FR-014**: The journal has one time zone for all accounts. It MUST default to Central Time and the owner MUST be able to change it; times are stored as exact instants so a zone change or a daylight-saving change never alters a trade's moment.

**Trades list**
- **FR-015**: The owner MUST be able to see trades newest first, filtered by account and by a date range (on trading day); the default is all accounts and the current month.
- **FR-016**: The list MUST show, for each trade: exit time, account, instrument, direction, size and net result (with R, or a dash and reason).
- **FR-017**: The list MUST show a clear message when there are no trades at all, and a different one when the filters match nothing.
- **FR-018**: The list MUST NOT add results of different currencies together. It MUST NOT show money totals in this feature, because money figures need process information beside them (constitution principle I) and that arrives in `001`.

**Across the feature**
- **FR-019**: The owner MUST be able to export all accounts and all trades (including deleted ones, marked as deleted) from the trades list; the file format is decided at the plan step.
- **FR-020**: The form for logging and editing a trade MUST show its essential fields first and keep the thesis note under a separate "Details" section.

### Out of Scope (non-goals for this version)

- Sign-in, the email allow-list, the audit log and any access control. These are later features; until they exist the product runs on the owner's own computer only and is not exposed (see Assumptions).
- Account types, balances, deposits and withdrawals, drawdown and profit-target rules, prop-firm challenges, copy trading, monthly cost.
- Several entries or exits per trade (scaling in and out is logged as separate trades).
- A separate "direct entry" mode: typing the result is only the fallback when dollars per point is blank.
- Currency conversion of any kind: an account's currency is only a label.
- Options, forex and crypto details, take-profit targets, worst and best price reached (MAE and MFE), exchange, trade currency conversion.
- Tags, setups, mistakes, attachments and screenshots, custom fields, open (unclosed) trades.
- Importing or syncing trades, batch actions, saved filters, extra list columns, money totals.
- The daily and weekly reviews, grades, focus and mistake counter (feature `001`).

### Key Entities

- **Account**: where trades happen. Has a unique name, a currency and an optional trading-day start time.
- **Trade**: one closed position on an account. Has an instrument, direction, size, entry and exit price and time, a total cost, optional dollars per point, optional stop price, optional thesis, and either a computed or a typed result. Derives gross result, net result, risk, R and its trading day. Can be soft-deleted and restored.
- **Journal settings**: the time zone used to read times and trading days (Central Time by default).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The owner can log a trade, with an account already set up, in under 1 minute.
- **SC-002**: A set of hand-calculated trades (long and short, with and without costs, with and without a typed result) produces exactly the expected gross, net, risk and R in 100% of cases.
- **SC-003**: Every figure that cannot be computed shows a dash and a reason; a check of the edge cases above finds no blank, zero or made-up value.
- **SC-004**: In a test of trades logged at, just before, and just after the account start time, and across a daylight-saving change, every trade lands on the expected trading day.
- **SC-005**: Deleting a trade and restoring it returns every field exactly as before, in 100% of tests.
- **SC-006**: Filtering by account and date range returns exactly the matching trades in 100% of tests, and the owner can find a given day's trades in under 10 seconds.
- **SC-007**: A full export contains every account and every trade, deleted ones marked, and its trade count matches the app's count.

## Assumptions

- The owner is the only user. Several accounts are possible.
- **Local only, with a written exception (constitution IV):** this feature has no sign-in or audit log. Those arrive as their own later features. Until both exist and have passed their reviews, the product MUST run only on the owner's computer and MUST NOT be exposed beyond it. This exception expires when the sign-in and audit features are accepted, and in any case before any exposure.
- Only closed trades exist. A trade is logged after it has exited.
- The trading day is read from the exit time. (Unconfirmed domain interpretation, to be written into the domain document.)
- R is the net result divided by risk (decided 2026-10-04). Still an unconfirmed domain interpretation until it is written into the domain document with a source.
- A typed result (when dollars per point is blank) is the net result, after costs (decided 2026-10-04); the cost field is then not used for the result.
- No warning is shown for a probable duplicate trade in this feature (two identical trades are allowed, as in the edge cases).
- With exactly one active account, the Log a trade form preselects it. R is shown with two decimals; stored values keep full precision.
- Currencies are chosen from the standard three-letter codes; USD is offered first.
- Dollars per point is "money value of one whole price point per unit of size", for example 20 for an E-mini Nasdaq contract.
- The first version is used on a computer in a browser; phone layout is not a goal.

## Points for clarify

All six original points are settled (see Clarifications, and the defaults in Assumptions for duplicates). One item is left for the sign-off step, not for clarify: the constitution's principle I (process information beside every money figure) cannot be met here, because plan adherence and mistakes arrive with `001`. It needs a written exception that ends when `001` is built.

## Wireframes

Greyscale wireframes were drawn on 2026-10-03 (and revised on 2026-10-04 after clarify) in Penpot (file `Tradecraft_v2`, pages `L1` to `L5`); images are in [wireframes/](wireframes/). See [screens.md](screens.md) for the inventory, the full wording, and the open questions, which were settled in the clarification session of 2026-10-04.

## Signed-off screens

The screens in `screens.md` were signed off by the owner on 2026-10-04. Plan, tasks and implementation
MUST honour them. Any change to an interface covered here MUST update `screens.md` and its
Penpot frames in the same change (constitution principle V).

Written exceptions accepted at sign-off (constitution governance: justification and expiry):

1. **Principle I (process information beside money).** The trades list shows each result with R but no
   plan-adherence or mistake information, which only exists from feature `001`. Expires when `001` is built.
2. **Principle IV (security gates).** This feature has no sign-in or audit log. It MUST run only on the
   owner's own computer and MUST NOT be exposed. Expires when the sign-in and audit features are accepted,
   and in any case before any exposure.

Noted, not blocking: the export file format is chosen at the plan step.
