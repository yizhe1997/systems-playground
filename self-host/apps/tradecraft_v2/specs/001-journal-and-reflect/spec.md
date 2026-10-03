# Feature Specification: Journal and Reflect

**Feature Directory**: `specs/001-journal-and-reflect`

**Created**: 2026-10-02

**Status**: Draft

**Input**: Owner's description of the first usable version of Tradecraft v2: log trades, review each trading day by judging decisions rather than results, write down one thing to focus on next, and see it again before the next session.

## Why this feature, and who it is for

The owner is one person: a day trader who takes a few trades a day on futures. Other trading styles (many trades a day, swing, part-time) must not be designed out, but this first version is built around that one person's evening and morning routine.

The product's central idea, from the constitution: **judge the decision, not the outcome**. A journal that only reports results teaches a trader to repeat lucky mistakes. This version delivers the smallest loop that actually changes behaviour: record what happened, grade the decision, write one focus, see that focus again tomorrow.

## Clarifications

### Session 2026-10-03

- Q: Should the weekly review store anything of its own, or is it only a roll-up of the daily reviews? → A: Only a reviewed mark and its time (per account per week); everything else on it is a read-only roll-up plus the editable week and month focus.
- Q: When a trade is marked "Partly followed the plan", how should it count in the "Plan followed 2 of 3" figures? → A: Partly counts as not followed in the main figure, and the detail line shows it separately (for example "2 of 3 · 1 partly").
- Q: When does a day that has trades but no review start to count as "Missing"? → A: Only after the day has ended (from the next trading day on); the current trading day is never Missing.
- Q: In the mistake counter, what should "Near the line" mean? → A: Nothing: there is no "near the line" status. A mistake is either below its stop line (shows the count, for example "5 of 6 this month") or has reached it ("stop trading"). Colour may later hint at how close the count is, but it never replaces the count text and is decided in the visual direction.
- Q: If a losing trade is labelled "valid loss" but the plan answer is No or Partly, what should the product do? → A: Block it: "valid loss" is unavailable unless the plan answer is Yes, with a short message saying why. If the plan answer is later changed away from Yes, the valid-loss label is cleared and the trade shows as not yet judged.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Log a trade and review the day with yesterday's focus (Priority: P1)

The owner records the trades of a trading day. In the evening they open that day's review for an account. At the top of it, before anything else, they see what they wrote last time as their focus for the next session. They look at the day's trades and numbers, answer three questions (what did I do well, what could I improve, what will I focus on next session) and mark the review as reviewed. The next trading day's review opens with their answer at the top.

**Why this priority**: this is the smallest loop that changes behaviour, and every other story builds on it. It is useful with nothing else in place.

**Independent Test**: log two trades on one account on one day, open that account's review for the day, answer the three questions and mark it reviewed. Open the next trading day's review for the same account and confirm the earlier "next session" answer is shown at the top. Delivers value on its own: a daily reflection that carries forward.

**Acceptance Scenarios**:

1. **Given** trades exist on an account for a trading day, **When** the owner opens that account's review for the day, **Then** it shows that account's trades and numbers for the day and the three questions.
2. **Given** the previous trading day's review for the same account has an answer to "what will I focus on next session", **When** the owner opens the next trading day's review, **Then** that answer is shown at the top, labelled with the date it was written.
3. **Given** the same account has no review for the previous trading day, **When** the owner opens a day's review, **Then** it shows the nearest earlier focus, labelled with its date, or says plainly that there is none yet.
4. **Given** the owner has answered the questions, **When** they mark the review as reviewed, **Then** it shows as reviewed with the time, and stays editable (it is never locked); an edit after that shows when it was last edited.
5. **Given** an account has no trades on a day, **When** the owner opens its review for that day, **Then** the review opens with an empty-day message and the three questions still work.

---

### User Story 2 - Grade the decision, not the result (Priority: P1)

For each trade, the owner records whether they followed their plan, and labels a losing trade as a "valid loss" (the rules were followed, no change needed) or a "mistake". A winning trade can also be tagged as a mistake (for example a profitable trade that was chased). For each day, the owner gives a process grade for their mental state and for their technical execution. Every money figure on a review appears next to process information.

**Why this priority**: it is the product's central idea. Without it the journal is just a results table.

**Independent Test**: on a day with one winning trade and one losing trade, tag the win as a mistake and the loss as a valid loss, give the day a mental and a technical grade, and confirm the review shows the process information beside the money figures.

**Acceptance Scenarios**:

1. **Given** a losing trade whose plan answer is Yes, **When** the owner opens it, **Then** they can label it "valid loss" or "mistake".
1a. **Given** a losing trade whose plan answer is No or Partly, **When** the owner opens it, **Then** "valid loss" is unavailable with a short reason, and "mistake" can be chosen.
2. **Given** a winning trade, **When** the owner tags it as a mistake, **Then** the review shows it as a profitable mistake, not as a clean win.
3. **Given** a trade, **When** the owner records whether it followed the plan, **Then** the answer is saved with the trade and shown on the day's review.
4. **Given** a day's review, **When** the owner sets a mental grade and a technical grade, **Then** both are saved and shown with the day's net result.
5. **Given** any review figure in money, **When** it is displayed, **Then** process information for the same trade or period (plan adherence, mistake count) is displayed beside it.

---

### User Story 3 - Tag mistakes and see the counter with a stop line (Priority: P2)

The owner tags trades with the mistakes they made (starter examples: chased entry, moved stop, oversized, ignored checklist, traded outside plan) and can add their own. For mistakes that are not tied to one trade (for example revenge mode), they record the same kind of mistake once for the day, from the same list. A counter shows, for the current week and month, how many times each mistake occurred. The owner can set a stop line per mistake; when a mistake's count reaches its stop line, the counter says "stop trading" for that mistake.

**Why this priority**: it turns "I keep doing this" into a count that cannot be argued with. It builds on grading but works without the planning stories.

**Independent Test**: tag "moved stop" on four trades across a week, set its stop line to four, and confirm the counter shows 4 of 4 with the stop message; confirm a session-level mistake adds to the count once for its day.

**Acceptance Scenarios**:

1. **Given** a trade, **When** the owner adds a mistake tag, **Then** the tag is saved on the trade and counted.
2. **Given** a mistake not tied to one trade, **When** the owner records it for a day, **Then** it is counted once for that day.
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
3. **Given** no focus is set for a period, **When** a daily review opens, **Then** that period says no focus is written yet and offers a way to write one.
4. **Given** the owner edits a focus, **When** they reopen a daily review in the period, **Then** the new text is shown.

---

### User Story 5 - Reflection flows up: the weekly review (Priority: P3)

The owner opens a weekly review. It gathers, by weekday, what the owner wrote on that week's daily reviews, shows the week's numbers with process information beside them, and shows the focus of the week and of its month with a way to write or edit them. To plan the next week the owner steps to that week and writes its focus there.

**Why this priority**: it closes the loop at the week level, but only has value once daily reviews exist.

**Independent Test**: with answers on three days of a week, open the weekly review and confirm each day's answers are listed under its weekday, the numbers are paired with process information, and the week's and month's focus can be written or edited from it.

**Acceptance Scenarios**:

1. **Given** daily reviews exist for days in a week, **When** the owner opens the weekly review, **Then** each day's answers are listed under its weekday.
2. **Given** a day in that week has no review, **When** the weekly review is shown, **Then** that weekday says so plainly and the week's totals still include that day's trades.
3. **Given** the owner opens next week's weekly review and writes its focus, **When** they open a daily review in that week, **Then** that focus is shown.
4. **Given** the weekly review shows money figures, **When** it is displayed, **Then** process information is shown beside them.
5. **Given** the owner marks a weekly review as reviewed, **When** they open it again, **Then** it shows as reviewed with the time; the week's roll-up is not stored (it is always read from the days), and only the reviewed mark and its time are saved for the week.

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
- **FR-001**: The owner MUST be able to record a trade on an account with instrument, direction, one or more entries and exits (scaling in and out), a stop, costs, and an optional thesis note (why the trade was taken), written when the trade is logged and shown read-only in the review.
- **FR-002**: The owner MUST be able to edit a trade and to delete it so that it can be restored (soft delete).

**Daily review**
- **FR-003**: The owner MUST be able to open a daily review for any trading day and any account. There is one daily review per account per trading day, each with its own answers and grades.
- **FR-004**: A daily review MUST show that account's trades for the day and the day's numbers for that account.
- **FR-005**: A daily review MUST show, at the top, the answer to "what will I focus on next session" from the previous trading day's review of the same account, labelled with its date; if there is none it MUST show the nearest earlier one or say there is none.
- **FR-006**: A daily review MUST provide three questions (what did I do well, what could I improve, what will I focus on next session) and a way to mark the review as reviewed, recording when.
- **FR-007**: A reviewed daily review MUST stay editable and is never locked, MUST show when it was last edited after being marked reviewed, and MUST show if trades changed after it was marked reviewed.

- **FR-007a**: A daily review has one of these states: **Missing** (the trading day has ended, it has at least one trade, and no answers are saved), **Draft** (answers saved, not yet marked reviewed), **Reviewed**. The current trading day is never Missing; a current day with trades and no saved answers is listed as today, not as Missing. A day with no trades has no state until the owner opens it.

**Judging decisions**
- **FR-008**: The owner MUST be able to record per trade whether it followed the plan, as one of yes, partly or no. "Plan followed X of Y" counts only trades answered yes; trades answered partly or no are not counted as followed, and the detail line shows the partly count separately (for example "2 of 3 · 1 partly").
- **FR-009**: The owner MUST be able to label a losing trade as a "valid loss" or a "mistake", and MUST be able to tag a winning trade as a mistake. "Valid loss" MUST be available only when the trade's plan answer is Yes; changing the plan answer to No or Partly MUST clear a valid-loss label.
- **FR-010**: The owner MUST be able to give each daily review a mental process grade and a technical process grade, each from 1 to 5 stars (1 drifted from the plan, 5 followed it fully).
- **FR-011**: Every screen that shows a money figure MUST show process information for the same trade or period beside it (constitution principle I).
- **FR-012**: A figure that cannot be computed MUST show a dash and a short reason (constitution principle III).

**Mistakes**
- **FR-013**: The owner MUST be able to tag mistakes on trades from a list that starts with common examples and that the owner can add to, rename and retire.
- **FR-014**: The owner MUST be able to record a mistake once for a day when it is not tied to one trade.
- **FR-015**: The product MUST show, for the current week and month, the count of each mistake across all accounts with the split per account, counting a day-level mistake once per day.
- **FR-016**: The owner MUST be able to set an optional stop line per mistake; when the count in the chosen period reaches it, the product MUST say "stop trading" for that mistake. The message is advice; it does not block anything. A mistake with a stop line that has not been reached shows its count against the line (for example "5 of 6 this month") and no other status.

**Plan flows down, reflection flows up**
- **FR-017**: The owner MUST be able to write one focus for a week and one for a month, each up to 280 characters; a longer text MUST be refused with a plain message saying how many characters are over.
- **FR-018**: Every daily review MUST show the focus of its week and of its month, each labelled by period; a period with no focus says so and offers a way to write one.
- **FR-019**: The owner MUST be able to open a weekly review for an account that lists, for all seven days (an empty weekend day takes one line), the answers written on that account's daily reviews for the week, states plainly which weekdays have no review, and still counts all of the week's trades.
- **FR-020**: The weekly review MUST show the focus of its week and of its month, each with a way to write or edit it (or to say none is written), and MUST let the owner step to any other week, including by a picker, so a focus for a coming week is written on that week's review.
- **FR-021**: The weekly review MUST show the week's numbers with process information beside them.
- **FR-021a**: A weekly review MUST record only a reviewed mark and its time, per account per week; it MUST NOT store its own copy of the days' answers or numbers. It has no draft state: it is Reviewed, Missing (its week has ended, it has days with trades, and it has no reviewed mark) or not yet reviewed. The current week is never Missing.

**Across the feature**
- **FR-022**: The product MUST be single-owner and MUST keep Tradecraft v1's access controls and audit trail for these new records.
- **FR-023**: Every statistic shown MUST state its definition and the number of trades it is based on.
- **FR-024**: Money MUST be exact (no rounding drift) and shown in the account's currency.
- **FR-025**: The records created here (reviews, focuses, grades, mistake tags) MUST be exportable.
- **FR-026**: The owner MUST be able to look back: the list of reviews shows one month at a time (arrows, a month list, a Today button and a jump to a date), grouped by week, each week collapsible and the current week open, with a week listed under the month it ends in; any daily review can step to the previous or next day or pick a day, with days that have trades or a missing review marked.

### Out of Scope (non-goals for this version)

- Importing trades from files or brokers.
- Live session mode, the pre-trade gate and the session log.
- The prop-challenge cockpit (phases, payouts, firm profiles).
- Setup playbooks and setup analytics.
- Missed and backtest trades as separate records.
- Monthly, quarterly and yearly review documents (only a monthly focus field is in scope).
- A free-form notebook.
- Attachments and screenshots on trades (decided 2026-10-02: its own later feature).
- Agent and MCP features. These come right after this version, and nothing here may prevent them.

### Key Entities

- **Trade**: one position on an account, with its entries, exits, stop, costs, thesis, plan-adherence answer and, for a loss, a valid-loss or mistake label. Belongs to a trading day.
- **Daily review**: the owner's review of one account on one trading day: three answers, a mental grade, a technical grade, a reviewed state with its time. Linked to that day's trades.
- **Focus**: one sentence of intent for a week or a month, written once by the owner. Shown on every daily review in its period, on every account.
- **Mistake**: a named mistake (from an owner-managed list) that can be tagged on a trade or recorded once for a day, with an optional stop line.
- **Weekly review**: the owner's review of one account for one week: a read-only roll-up of that account's daily answers by weekday and the week's numbers, with the week's and month's focus; stores only a reviewed mark and its time.
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
- **Account scope (decided 2026-10-02):** the owner chose one daily review per account per day, not a combined review. The reference product, by contrast, keeps one review per day with an account breakdown inside it. Consequences assumed here, confirmed in the wireframes on 2026-10-02: weekly reviews are also per account; a focus for a week or month is the owner's, written once and shown on every account's daily reviews; mistake counters count across accounts with a per-account split, because habits belong to the trader; "yesterday's focus" comes from the same account's earlier review; there is no combined all-accounts review in this version.
- Accounts, trades, tags and rule status already exist in Tradecraft v1 and are reused where they fit. This feature adds the review, focus, grade and mistake records and the screens for them.
- The trading day and the week follow the definitions in the domain document (v1's day is the Central Time date of the exit, and weeks run Monday to Sunday). Changing those definitions is outside this feature.
- Process grades are 1 to 5 stars for both mental and technical (decided 2026-10-03).
- The starter list of mistakes is: chased entry, moved stop, oversized, ignored checklist, traded outside plan. The owner can edit it.
- Mistake counters use calendar weeks and calendar months.
- "Reviewed" is a state the owner sets; reviews are not created automatically in this version.
- The first version is used on a computer in a browser; phone layout is not a goal.

## Wireframes

Greyscale wireframes were drawn on 2026-10-02 in Penpot (file `Tradecraft_v2`, one page per screen); images are in [wireframes/](wireframes/). An earlier styled draft was set aside because it assumed another project's look. See [screens.md](screens.md) for the inventory and the full wording.

Decided on 2026-10-03, after the owner's reactions to the wireframes (no wireframe questions remain open):

- Grades are 1 to 5 stars, for mental and technical.
- No minimum number of trades for a win rate; it is shown as a count ("1 of 3") with its basis.
- The trade form gains one optional field, the thesis. Plan adherence, the loss label and mistake tags stay in the review.
- Mistakes tied to a trade and mistakes for the whole day share one list; the counter counts each record once and shows the split.
- A reviewed review is never locked; it shows when it was last edited.
- Weekends: all seven days are listed in the weekly review (an empty weekend day takes one line) and are selectable in the pickers.
- The strategy or setup of a trade is not shown in this feature (owner: ignore for now); the strategy builder and playbooks stay a later feature.
