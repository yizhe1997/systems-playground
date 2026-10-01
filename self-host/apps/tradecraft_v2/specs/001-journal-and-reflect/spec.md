# Feature Specification: Journal and Reflect

**Feature Directory**: `specs/001-journal-and-reflect`

**Created**: 2026-10-02

**Status**: Draft

**Input**: Owner's description of the first usable version of Tradecraft v2: log trades, review each trading day by judging decisions rather than results, write down one thing to focus on next, and see it again before the next session.

## Why this feature, and who it is for

The owner is one person: a day trader who takes a few trades a day on futures. Other trading styles (many trades a day, swing, part-time) must not be designed out, but this first version is built around that one person's evening and morning routine.

The product's central idea, from the constitution: **judge the decision, not the outcome**. A journal that only reports results teaches a trader to repeat lucky mistakes. This version delivers the smallest loop that actually changes behaviour: record what happened, grade the decision, write one focus, see that focus again tomorrow.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log a trade and review the day with yesterday's focus (Priority: P1)

The owner records the trades of a trading day. In the evening they open that day's review for an account. At the top of it, before anything else, they see what they wrote last time as their focus for the next session. They look at the day's trades and numbers, answer three questions (what did I do well, what could I improve, what will I focus on next session) and mark the review as reviewed. The next trading day's review opens with their answer at the top.

**Why this priority**: this is the smallest loop that changes behaviour, and every other story builds on it. It is useful with nothing else in place.

**Independent Test**: log two trades on one account on one day, open that account's review for the day, answer the three questions and mark it reviewed. Open the next trading day's review for the same account and confirm the earlier "next session" answer is shown at the top. Delivers value on its own: a daily reflection that carries forward.

**Acceptance Scenarios**:

1. **Given** trades exist on an account for a trading day, **When** the owner opens that account's review for the day, **Then** it shows that account's trades and numbers for the day and the three questions.
2. **Given** the previous trading day's review for the same account has an answer to "what will I focus on next session", **When** the owner opens the next trading day's review, **Then** that answer is shown at the top, labelled with the date it was written.
3. **Given** the same account has no review for the previous trading day, **When** the owner opens a day's review, **Then** it shows the nearest earlier focus, labelled with its date, or says plainly that there is none yet.
4. **Given** the owner has answered the questions, **When** they mark the review as reviewed, **Then** it shows as reviewed with the time, and can be reopened and edited.
5. **Given** an account has no trades on a day, **When** the owner opens its review for that day, **Then** the review opens with an empty-day message and the three questions still work.

---

### User Story 2 - Grade the decision, not the result (Priority: P1)

For each trade, the owner records whether they followed their plan, and labels a losing trade as a "valid loss" (the rules were followed, no change needed) or a "mistake". A winning trade can also be tagged as a mistake (for example a profitable trade that was chased). For each day, the owner gives a process grade for their mental state and for their technical execution. Every money figure on a review appears next to process information.

**Why this priority**: it is the product's central idea. Without it the journal is just a results table.

**Independent Test**: on a day with one winning trade and one losing trade, tag the win as a mistake and the loss as a valid loss, give the day a mental and a technical grade, and confirm the review shows the process information beside the money figures.

**Acceptance Scenarios**:

1. **Given** a losing trade, **When** the owner opens it, **Then** they can label it "valid loss" or "mistake".
2. **Given** a winning trade, **When** the owner tags it as a mistake, **Then** the review shows it as a profitable mistake, not as a clean win.
3. **Given** a trade, **When** the owner records whether it followed the plan, **Then** the answer is saved with the trade and shown on the day's review.
4. **Given** a day's review, **When** the owner sets a mental grade and a technical grade, **Then** both are saved and shown with the day's net result.
5. **Given** any review figure in money, **When** it is displayed, **Then** process information for the same trade or period (plan adherence, mistake count) is displayed beside it.

---

### User Story 3 - Tag mistakes and see the counter with a stop line (Priority: P2)

The owner tags trades with the mistakes they made (starter examples: chased entry, moved stop, oversized, ignored checklist, traded outside plan) and can add their own. For habits that are not tied to one trade, they record a mistake once for the day. A counter shows, for the current week and month, how many times each mistake occurred. The owner can set a stop line per mistake; when a mistake's count reaches its stop line, the counter says "stop trading" for that habit.

**Why this priority**: it turns "I keep doing this" into a count that cannot be argued with. It builds on grading but works without the planning stories.

**Independent Test**: tag "moved stop" on four trades across a week, set its stop line to four, and confirm the counter shows 4 of 4 with the stop message; confirm a session-level mistake adds to the count once for its day.

**Acceptance Scenarios**:

1. **Given** a trade, **When** the owner adds a mistake tag, **Then** the tag is saved on the trade and counted.
2. **Given** a habit not tied to one trade, **When** the owner records it for a day, **Then** it is counted once for that day.
3. **Given** a week with tagged mistakes, **When** the owner opens the counter, **Then** each mistake shows its count for the week and for the month.
4. **Given** a stop line is set for a mistake, **When** its count reaches the line, **Then** the counter says "stop trading" for that mistake.
5. **Given** a mistake has no stop line, **When** the counter is shown, **Then** it shows the count only.
6. **Given** the owner renames or removes a mistake, **When** earlier trades used it, **Then** history stays readable and the counts stay correct.

---

### User Story 4 - Plan flows down: a focus for the week or month (Priority: P2)

The owner writes a focus once for a week or a month (for example "wait for the candle to close before entering"). Every daily review in that period shows it, labelled with where it came from. A daily review shows both the day-before focus and the longer-term focus.

**Why this priority**: it keeps a longer-term intention in front of the owner every day without rewriting it. It is independent of the weekly review.

**Independent Test**: set a monthly focus and a weekly focus, open three daily reviews in that week, and confirm all three show both, labelled; change the weekly focus and confirm days in other weeks are unaffected.

**Acceptance Scenarios**:

1. **Given** a monthly focus is set, **When** the owner opens any daily review in that month, **Then** the focus is shown, labelled "month".
2. **Given** a weekly focus is set, **When** the owner opens a daily review in that week, **Then** it is shown, labelled "week", beside the monthly one.
3. **Given** no focus is set for a period, **When** a daily review opens, **Then** nothing is shown for that period and no empty box is left.
4. **Given** the owner edits a focus, **When** they reopen a daily review in the period, **Then** the new text is shown.

---

### User Story 5 - Reflection flows up: the weekly review (Priority: P3)

The owner opens a weekly review. It gathers, by weekday, what the owner wrote on that week's daily reviews, shows the week's numbers with process information beside them, and has a place for the focus for next week. Writing it sets next week's focus, which then appears on next week's daily reviews.

**Why this priority**: it closes the loop at the week level, but only has value once daily reviews exist.

**Independent Test**: with answers on three days of a week, open the weekly review and confirm each day's answers are listed under its weekday, the numbers are paired with process information, and a next-week focus written here appears on the following week's daily reviews.

**Acceptance Scenarios**:

1. **Given** daily reviews exist for days in a week, **When** the owner opens the weekly review, **Then** each day's answers are listed under its weekday.
2. **Given** a day in that week has no review, **When** the weekly review is shown, **Then** that weekday says so plainly and the week's totals still include that day's trades.
3. **Given** the owner writes a focus for next week in the weekly review, **When** they open a daily review in the following week, **Then** that focus is shown.
4. **Given** the weekly review shows money figures, **When** it is displayed, **Then** process information is shown beside them.

---

### Edge Cases

- A trading day with no trades: the review opens, shows an empty-day message, and the questions still work.
- A trade that spans two calendar days or has no exit yet (open): it is counted on the trading day defined in the domain document, and open trades are shown as open with no result figure.
- A figure that cannot be computed (no stop recorded so no risk figure, no trades so no win rate, too few trades for a ratio): it shows a dash and says why.
- A day or week with a single trade: statistics that need more trades show a dash and say how many trades they need.
- The owner edits or soft-deletes a trade after reviewing the day: the review and counters update, and the review shows that it changed after being marked reviewed.
- Several trading days in a row without a review: nothing is lost; the nearest earlier focus is shown, labelled with its date.
- A stop line set at zero or a negative number is refused with a plain message.
- Time zones and weekends: the trading day and the week follow the definitions in the domain document; weekend days have reviews only when trades exist or the owner opens one.

## Requirements *(mandatory)*

### Functional Requirements

**Trades**
- **FR-001**: The owner MUST be able to record a trade on an account with instrument, direction, one or more entries and exits (scaling in and out), a stop, costs, and a thesis note.
- **FR-002**: The owner MUST be able to edit a trade and to delete it so that it can be restored (soft delete).

**Daily review**
- **FR-003**: The owner MUST be able to open a daily review for any trading day and any account. There is one daily review per account per trading day, each with its own answers and grades.
- **FR-004**: A daily review MUST show that account's trades for the day and the day's numbers for that account.
- **FR-005**: A daily review MUST show, at the top, the answer to "what will I focus on next session" from the previous trading day's review of the same account, labelled with its date; if there is none it MUST show the nearest earlier one or say there is none.
- **FR-006**: A daily review MUST provide three questions (what did I do well, what could I improve, what will I focus on next session) and a way to mark the review as reviewed, recording when.
- **FR-007**: A reviewed daily review MUST be reopenable and editable, and MUST show if trades changed after it was marked reviewed.

**Judging decisions**
- **FR-008**: The owner MUST be able to record per trade whether it followed the plan.
- **FR-009**: The owner MUST be able to label a losing trade as a "valid loss" or a "mistake", and MUST be able to tag a winning trade as a mistake.
- **FR-010**: The owner MUST be able to give each daily review a mental process grade and a technical process grade.
- **FR-011**: Every screen that shows a money figure MUST show process information for the same trade or period beside it (constitution principle I).
- **FR-012**: A figure that cannot be computed MUST show a dash and a short reason (constitution principle III).

**Mistakes**
- **FR-013**: The owner MUST be able to tag mistakes on trades from a list that starts with common examples and that the owner can add to, rename and retire.
- **FR-014**: The owner MUST be able to record a mistake once for a day when it is not tied to one trade.
- **FR-015**: The product MUST show, for the current week and month, the count of each mistake across all accounts with the split per account, counting a day-level mistake once per day.
- **FR-016**: The owner MUST be able to set an optional stop line per mistake; when the count in the chosen period reaches it, the product MUST say "stop trading" for that mistake. The message is advice; it does not block anything.

**Plan flows down, reflection flows up**
- **FR-017**: The owner MUST be able to write one focus for a week and one for a month.
- **FR-018**: Every daily review MUST show the focus of its week and of its month, each labelled by period; periods with no focus show nothing.
- **FR-019**: The owner MUST be able to open a weekly review for an account that lists, by weekday, the answers written on that account's daily reviews for the week, states plainly which weekdays have no review, and still counts all of the week's trades.
- **FR-020**: The weekly review MUST include a place to write the focus for next week, which MUST then be shown on next week's daily reviews.
- **FR-021**: The weekly review MUST show the week's numbers with process information beside them.

**Across the feature**
- **FR-022**: The product MUST be single-owner and MUST keep Tradecraft v1's access controls and audit trail for these new records.
- **FR-023**: Every statistic shown MUST state its definition and the number of trades it is based on.
- **FR-024**: Money MUST be exact (no rounding drift) and shown in the account's currency.
- **FR-025**: The records created here (reviews, focuses, grades, mistake tags) MUST be exportable.

### Out of Scope (non-goals for this version)

- Importing trades from files or brokers.
- Live session mode, the pre-trade gate and the session log.
- The prop-challenge cockpit (phases, payouts, firm profiles).
- Setup playbooks and setup analytics.
- Missed and backtest trades as separate records.
- Monthly, quarterly and yearly review documents (only a monthly focus field is in scope).
- A free-form notebook.
- Agent and MCP features. These come right after this version, and nothing here may prevent them.

### Key Entities

- **Trade**: one position on an account, with its entries, exits, stop, costs, thesis, plan-adherence answer and, for a loss, a valid-loss or mistake label. Belongs to a trading day.
- **Daily review**: the owner's review of one account on one trading day: three answers, a mental grade, a technical grade, a reviewed state with its time. Linked to that day's trades.
- **Focus**: one sentence of intent for a week or a month, written once by the owner. Shown on every daily review in its period, on every account.
- **Mistake**: a named habit (from an owner-managed list) that can be tagged on a trade or recorded once for a day, with an optional stop line.
- **Weekly review**: the owner's review of one account for one week: gathers that account's daily answers by weekday and holds the focus for next week.
- **Account**: where trades happen; carries the currency and the trading-day settings. Exists already in Tradecraft v1.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The owner can complete a daily review (open the day, check the trades, answer the three questions, mark reviewed) in under 5 minutes on a typical few-trades day.
- **SC-002**: After answering "what will I focus on next session", the owner sees that answer at the top of the next trading day's review without searching for it, 100% of the time that a prior answer exists.
- **SC-003**: Every money figure on every review and weekly screen has process information beside it; a check of all screens finds zero money figures without it.
- **SC-004**: Every figure that cannot be computed shows a dash and a reason; a check of the edge cases above finds no blank, zero or made-up value.
- **SC-005**: Over a trial of two weeks of real use, the owner completes the daily review on at least 8 of 10 trading days (measures whether the loop is light enough to keep).
- **SC-006**: A mistake whose stop line is reached is flagged the moment the count reaches it, and its count matches a manual count of the tagged trades in 100% of spot checks.
- **SC-007**: Setting a weekly or monthly focus makes it appear on every daily review in that period, and nowhere else.

## Assumptions

- The owner is the only user. Several accounts are possible, and the existing sign-in and access controls are kept as they are.
- **Account scope (decided 2026-10-02):** the owner chose one daily review per account per day, not a combined review. The reference product, by contrast, keeps one review per day with an account breakdown inside it. Consequences assumed here, to be confirmed at the screens step: weekly reviews are also per account; a focus for a week or month is the owner's, written once and shown on every account's daily reviews; mistake counters count across accounts with a per-account split, because habits belong to the trader; "yesterday's focus" comes from the same account's earlier review; there is no combined all-accounts review in this version.
- Accounts, trades, tags and rule status already exist in Tradecraft v1 and are reused where they fit. This feature adds the review, focus, grade and mistake records and the screens for them.
- The trading day and the week follow the definitions in the domain document (v1's day is the Central Time date of the exit, and weeks run Monday to Sunday). Changing those definitions is outside this feature.
- Process grades use a simple scale (A, B, C) for both mental and technical. A different scale can be chosen at the screens step.
- The starter list of mistakes is: chased entry, moved stop, oversized, ignored checklist, traded outside plan. The owner can edit it.
- Mistake counters use calendar weeks and calendar months.
- "Reviewed" is a state the owner sets; reviews are not created automatically in this version.
- The first version is used on a computer in a browser; phone layout is not a goal.

## Screens

Rough screens were drafted on 2026-10-02 in Penpot (file `Tradecraft_v2`, one page per screen). See [screens.md](screens.md) for the inventory, the full wording, and the open questions below, which clarify should ask the owner about.

- Weekend days in the weekly review: show Saturday and Sunday when there are no trades, or hide them?
- Grade scale: three steps (A, B, C) or five stars?
- Minimum number of trades before a win rate is shown on a daily review (drafted as five).
- Should the existing trade form also carry the judging fields so a trade can be judged as it is logged?
- Day-level habits and trade mistakes: one shared list or two?
- Should a reviewed review lock until the owner presses Reopen?
