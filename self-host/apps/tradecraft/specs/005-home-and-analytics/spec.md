# Feature Specification: Home and Analytics

**Feature Directory**: `specs/005-home-and-analytics`

**Created**: 2026-10-30

**Status**: Draft

**Input**: Owner's decisions (2026-10-27 and 2026-10-30): build analytics next, as **one feature: a Home page that becomes the landing page, and an Analytics screen**, with **Rule replay and edge leak included**. Home: headline cards for a chosen period and account scope, each with its plan-followed process figure beside it; an equity curve and daily result bars; a calendar heatmap; unreviewed days and trades; yesterday's and this week's focus; the mistake counter. Analytics: performance statistics, breakdowns by weekday, hour, instrument, direction and account, the cost of each mistake, and what a period looks like without the trades where the plan was not followed. Every figure is computed by the app, never by a model. Read-only: nothing new is entered. Out of scope for now: a composite score, setup playbook analytics, drawdown percentages, MAE and MFE. Input documents: `research/14-analytics-concepts.md` (written for this feature), `research/06`, `07`, `10`, `12`.

## Why this feature, and who it is for

The owner is one person who judges **decisions**, not results. After four features the journal can record trades, review days, count mistakes, and keep screenshots, but it cannot answer the questions a trader opens a journal to ask: *Is there an edge? Where does it live? Where does it leak? What did my rule-breaking cost me?* And it has no front door: after sign-in the app sends the owner straight to the Reviews list.

This feature adds the front door (**Home**) and the answers (**Analytics**). The product is a process-discipline journal with numbers attached (research `10`), so the numbers are never shown without their process: every money figure sits beside the plan-followed figure of the same scope (constitution I), every rate shows how many trades it is made of, and a figure that cannot be computed is a dash with its reason (constitution III). The feature that no other journal has, the result **without** the trades where the plan was not followed, is part of the first slice (owner decision 2026-10-27).

It is deliberately **read-only** (constitution VI): it changes no trade, review, setting or rule, adds no stored data, and needs no new way to enter anything. It changes no existing figure and no trading rule.

## Clarifications

### Session 2026-10-27

- Q: Home and Analytics as one feature or two? → A: **One feature**: the same figures are computed once and shown in both places.
- Q: Is Rule replay and edge leak in the first slice? → A: **Yes.**
- Q: Which ideas stay out? → A: A composite score, setup playbook analytics (setups do not exist yet), drawdown as a percentage (it needs a capital basis the product does not invent), and MAE and MFE (they need prices inside the trade, and the journal holds closed trades only).

### Session 2026-10-30 (the owner reviewed the wireframes and accepted every default)

- Q: Edge leak: plan not followed means No or Partly, or No only? -> A: **No or Partly** (Partly never counts as following the plan). Trades not judged yet are on neither side.
- Q: A scope with several currencies? -> A: **One block per currency on the same page**, never added; a calendar day with trades in both currencies shows one result line per currency.
- Q: Break-even band: a view option or a setting? -> A: **A view option** typed on the Analytics screen, not saved.
- Q: Archived accounts in "All live accounts"? -> A: **Their trades count** (they are live trades), and an archived account **can be chosen** in the Accounts control, listed after the others and marked archived.
- Q: Rule replay and mistakes: a second tab of Analytics or a section of the same page? -> A: **A second tab** of Analytics (Statistics, Rule replay and mistakes).
- Q: Weekends on the calendar? -> A: **Monday to Friday**, plus Saturday and Sunday columns only for a month that has a trade on one of them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open the journal and see how I am doing, with the process beside it (Priority: P1)

The owner signs in and lands on **Home**. At the top they choose a **period** (this week, this month, last 30 days, this year, all time, or their own range) and an **account scope** (all live accounts, or one account). Below are headline cards: net result, number of trades, win rate (k of n), profit factor, and the plan-followed figure. Every money card shows the plan-followed figure of the same scope next to it. Under the cards are an equity curve and daily result bars for the period, a calendar heatmap, the days and trades still **not reviewed or not judged**, yesterday's focus and this week's focus, and the mistake counter for the period. Nothing on Home can be edited; every item leads somewhere (a day opens its daily review, an unreviewed trade opens its judgement, a mistake opens its trades).

**Why this priority**: it is the front door and the smallest slice that gives value on its own: the owner sees where they stand and what still needs them today, without opening four screens.

**Independent Test**: with trades, reviews and mistakes recorded, open `/`: the cards, the curve and the heatmap show the figures an independent calculation from the Trades list gives, each money card has its plan figure beside it, and the unreviewed list names exactly the days and trades the Reviews screens call Missing or not judged.

**Acceptance Scenarios**:

1. **Given** a signed-in owner, **When** they open the app's root address, **Then** Home opens (not Reviews), and Reviews stays in the navigation.
2. **Given** a month with 12 live trades, 9 judged (6 followed, 2 not, 1 partly) and net +340.00, **When** Home shows the month for all live accounts, **Then** the net result card shows +340.00 with "Plan followed 6 of 12" beside it and "3 not judged yet" in the same card, and the win rate card shows "k of 12" (not only a percentage).
3. **Given** a trade with no stop recorded, **When** the cards need an R figure, **Then** that figure is a dash with "no stop recorded on 4 of 12 trades" and nothing is estimated.
4. **Given** accounts in two currencies in the chosen scope, **When** Home shows the cards, **Then** the figures are shown once per currency, never added across currencies.
5. **Given** no trades at all, **When** the owner opens Home, **Then** it says so plainly and offers Log a trade, with no empty charts and no zeros presented as results.
6. **Given** Backtest accounts exist, **When** the scope is "all live accounts", **Then** they are left out; choosing a Backtest account shows it on its own.
7. **Given** a day on the calendar heatmap, **When** the owner selects it, **Then** that day's daily review opens.

---

### User Story 2 - Ask whether there is an edge, and where it lives (Priority: P1)

The owner opens **Analytics** and sees the performance statistics for the same period and scope controls as Home: net result, trades, win rate (with an optional break-even band), profit factor, expectancy in money and in R, average win, average loss, payoff ratio, the largest win and loss, maximum drawdown of the realised results (in money), and the longest winning and losing streaks. Below them are **breakdowns** of net result, trade count and win rate by weekday, by hour of entry, by instrument, by direction and by account, each row with its `n` and its plan-followed figure. A row with very few trades says so instead of looking conclusive. Selecting a row opens the Trades list filtered to exactly those trades.

**Why this priority**: it is the other half of the owner's request and the reason Home's cards exist; without it the cards cannot be explained.

**Independent Test**: for a known set of trades (the sample day plus a handful more), every statistic equals the value worked out by hand in the domain document, a breakdown row's count and result equal the filtered Trades list's, and removing a trade or changing the scope changes the figures accordingly.

**Acceptance Scenarios**:

1. **Given** 10 live trades with wins +200, +100, +50 and losses -80, -40, -60, -30, -20, -50, -10, **When** the owner opens Analytics, **Then** win rate shows "3 of 10", profit factor shows 350 / 290 = 1.21, average win +116.67, average loss -41.43, payoff ratio 2.82, expectancy +6.00 per trade, each with its definition one click away and "n = 10".
2. **Given** a break-even band of 5.00, **When** it is switched on, **Then** trades with a net result between -5.00 and +5.00 are neither wins nor losses for the win rate, and the screen says how many trades were set aside.
3. **Given** fewer than the minimum number of trades needed for a statistic, **When** it is shown, **Then** it is a dash with "needs at least N trades, has M" instead of a number.
4. **Given** the cumulative realised result of a period that rises to a peak and then falls, **When** drawdown is shown, **Then** it is the largest peak-to-trough fall in money, with the dates of the peak and the trough, and no percentage.
5. **Given** the weekday breakdown, **When** the owner selects "Tue", **Then** the Trades list opens filtered to the period, scope and Tuesdays, and its count equals the row's `n`.
6. **Given** the hour breakdown, **When** trades were entered at 09:41 and 10:14 journal time, **Then** they fall in the 09:00 and 10:00 hours of the journal time zone, the same zone that decides trading days.

---

### User Story 3 - See what rule-breaking cost me (Priority: P2)

On Analytics the owner sees **Rule replay and edge leak** for the period and scope: the result as it was, the net result of the trades where the plan was **not followed** (the edge leak: the money those trades cost or earned), and the result **without** them (the actual result minus the edge leak). Beside it the **cost of each mistake**: for every mistake tag, how many trades carry it, and the net result of those trades. Trades not judged yet are never guessed: they are counted and shown separately, and the screen says plainly how much of the period the figure covers.

**Why this priority**: it is the feature no competitor has and the clearest expression of "process over outcome", but it needs stories 1 and 2's scope and figures first, and it is only as good as the judging done in the daily review.

**Independent Test**: with trades judged Yes, Partly and No and some not judged, the replay figures equal the result of the Yes-judged trades plus the not-judged trades handled as the spec says, the difference equals the sum of the rule-breaking trades, and a mistake's cost equals the sum of the net results of the trades carrying that tag.

**Acceptance Scenarios**:

1. **Given** the sample day (W +300 Yes; L1 -125 Yes; L2 -130 No, tagged Chased entry), **When** Rule replay is shown for that day, **Then** it shows the actual result +45.00, an edge leak of -130.00 (the one plan-breaking trade lost this much), and the result without it +175.00, with "3 of 3 judged".
2. **Given** a period where only 4 of 12 trades are judged, **When** Rule replay is shown, **Then** it says "based on the 4 judged trades of 12; 8 not judged yet" beside the figure, the 8 are listed on their own line with their net result and are left in the result without the plan-breaking trades (they are neither removed nor called rule-breaking).
3. **Given** a profitable trade the owner judged as not following the plan, **When** edge leak is shown, **Then** it is shown as money the rule-breaking earned (a positive part of the leak), not hidden: the replay can come out lower than the actual result.
4. **Given** the cost of each mistake, **When** a trade carries two tags, **Then** it counts under both (as the mistake counter already does) and the screen says that a trade can appear under more than one mistake and that the rows do not add up to the total.
5. **Given** no trade judged in the period, **When** the owner opens Rule replay, **Then** it says "no trade judged yet" with a link to the days waiting for judgement, and no figure.

---

### User Story 4 - Know what still needs me today (Priority: P2)

Home's **needs you** area lists, for the chosen scope, the days that are Missing (ended, with trades, no review), the trades not judged yet, and the weeks not marked reviewed, newest first, each linking to the screen that fixes it, together with yesterday's focus and the focus of this week and this month. It is the journal's own to-do list, built from the states the Reviews screens already compute, so the two never disagree.

**Why this priority**: it turns Home from a report into a daily routine, but it only repeats states that already exist, so it can follow stories 1 and 2.

**Independent Test**: the list equals the days and trades the Reviews and daily review screens show as Missing and not judged for the same scope; marking a week reviewed or judging a trade removes its line.

**Acceptance Scenarios**:

1. **Given** two Missing days and five trades not judged yet, **When** Home shows the scope, **Then** it lists the two days and the five trades (or the newest of each with "and N more" and a link to the full list), each linking to its screen.
2. **Given** everything is reviewed and judged, **When** Home is opened, **Then** it says nothing is waiting, not an empty box.
3. **Given** a Backtest account's days, **When** the scope is "all live accounts", **Then** they never appear as Missing.

---

### Edge Cases

- A scope with accounts in several currencies: figures per currency, never a total across them (as the Trades list already says).
- A period with no trades, or an account with none: a plain "no trades in this period", and no chart of zeros.
- Trades with no dollars per point and a typed result: they count in results, but have no R; R-based figures state how many trades had one ("R from 8 of 12 trades").
- A very small sample (a few trades): every rate shows its `n`; a statistic below its minimum is a dash with its reason.
- Deleted trades never count; restoring one brings it back into every figure.
- A trade entered on one day and exited on another counts on the day of its entry (the trading day rule); the equity curve, bars, heatmap, weekday and hour breakdowns all use the entry.
- The hour breakdown follows the journal time zone, as does everything else; changing the time zone moves trades between hours and days, and the figures follow.
- Drawdown needs at least 2 trades (like the other statistics that need more than one): with fewer it is a dash saying so; with 2 or more trades and only winning days it is zero, with the dates of its peak and trough.
- A period chosen with its end before its start: a plain message, nothing computed. A period that lies entirely in the future simply has no trades and shows "No trades in this period."
- 5,000 trades across ten accounts: Home and Analytics open within the existing one-second budget.
- The owner switches the scope or period: every card, chart and table on the screen changes together; none keeps the old scope.
- An agent token: the owner's read routes still refuse it (as today); nothing in this feature opens a new way in for an agent.

## Requirements *(mandatory)*

### Functional Requirements

**Home**

- **FR-001**: After sign-in, and at the root address, the app MUST show Home. Reviews MUST stay reachable from the navigation, and Home MUST be a navigation item.
- **FR-002**: Home MUST let the owner choose a **period** (this week, this month, last 30 days, this year, all time, a custom range) and an **account scope** (all live accounts, or one account of any kind). The default is this month and all live accounts. The choice MUST be shown in the address so a view can be reopened, and MUST apply to every part of the screen at once.
- **FR-003**: Home MUST show headline cards for the scope: net result, number of trades, win rate as "k of n" with its percentage, profit factor, and expectancy in money. Every card that shows money MUST show the plan-followed figure of the same scope beside it ("Plan followed X of Y", with Partly and not-judged-yet counted as the product already counts them) (constitution I).
- **FR-004**: Home MUST show an **equity curve** (cumulative net result by trading day) and **daily result bars** for the scope, and a **calendar heatmap** with one cell per trading day of the period. A cell MUST carry its meaning in text as well as colour (the day's result and its plan-followed figure), and selecting it MUST open that day's daily review.
- **FR-005**: Home MUST show a **needs you** area: days Missing, trades not judged yet and weeks not marked reviewed, for the scope, newest first, each linking to its screen, using exactly the states the Reviews screens compute (live accounts only; Backtest days never Missing).
- **FR-006**: Home MUST show yesterday's focus (as a daily review shows it), the focus of this week and of this month, and the mistake counter for the period (each mistake's count and stop-line status), each linking to where it is edited or read in full.
- **FR-007**: With no trades in the scope, Home MUST say so plainly and offer Log a trade, and MUST NOT draw charts or show zero as a result.

**Analytics**

- **FR-008**: Analytics MUST use the same period and scope controls as Home and MUST show, for the scope: net result, trades, win rate (k of n), profit factor, expectancy in money and in R, average win, average loss, payoff ratio, the largest win and the largest loss, maximum drawdown of realised results in money (with its peak and trough dates), and the longest winning and losing streaks of trades.
- **FR-009**: Analytics MUST offer an optional **break-even band** (an amount in the account currency, default none): trades whose net result lies inside it are neither wins nor losses for the win rate, and the screen MUST say how many were set aside. The band is a view option and MUST NOT be stored as a setting.
- **FR-010**: Analytics MUST show **breakdowns** of trades, net result, win rate and plan followed by weekday of the trading day, hour of entry (journal time zone), instrument, direction and account. Each row MUST show its `n`. Selecting a row MUST open the Trades list filtered to that row's trades within the period and scope.
- **FR-011**: Analytics MUST show **Rule replay and edge leak** as lines that add up: the net result of the trades where the plan was followed, the net result of the trades where it was not followed (the **edge leak**, positive or negative), the net result of the trades not judged yet, the actual net result (the sum of the three), and the **result without the plan-breaking trades** (the actual result minus the edge leak). Each line MUST show its trade count. Trades not judged yet MUST NOT be called followed or not followed; they stay in the result without the plan-breaking trades, and the screen MUST say how much of the period is judged ("judged: 9 of 12 trades").
- **FR-012**: Analytics MUST show the **cost of each mistake**: for each mistake tag, the number of trades carrying it and their net result, in the scope. A trade with several tags counts under each, and the screen MUST say that the rows do not add up to a total. A mistake with no trades in the period is not listed.
- **FR-013**: Every statistic on Home and Analytics MUST give its definition on request (what it counts, what it leaves out) and its sample size `n` (constitution III). A statistic below its minimum sample MUST be a dash stating the minimum and the actual count, and a figure that cannot be computed (no stop for R, no trades for a rate) MUST be a dash stating why. No figure is ever zero by default, estimated or filled in.
- **FR-014**: Money MUST be exact decimals and never floating point. Figures MUST be per account currency; the product MUST NOT add or convert across currencies and MUST show one block per currency when the scope has several. The product MUST NOT invent a capital basis: nothing in this feature is a percentage of capital.
- **FR-015**: Backtest accounts MUST be left out of every figure when the scope is "all live accounts" and shown on their own when chosen, as everywhere else. Deleted trades MUST never count. Only closed trades exist in the journal, so no figure refers to price excursions inside a trade.
- **FR-016**: Each figure MUST be computed by the application from the recorded trades, reviews and judgements, in a way that makes two views of the same scope agree (Home, Analytics, the Trades list and the daily review). No figure is produced, adjusted or explained by a model.
- **FR-017**: Each figure MUST also be available from a read route of the API with its definition and sample size (the way the existing screens' figures are), so that it can be quoted from a single place; an agent token MUST still be refused by those routes in this feature (agent tools are a later feature).

**Cross-cutting**

- **FR-018**: The feature MUST be read-only: it MUST NOT create, change or delete any trade, review, judgement, mistake, focus, account or setting, MUST NOT store anything new, and therefore adds nothing to the export.
- **FR-019**: Every new rule (profit factor, expectancy, payoff ratio, break-even band, drawdown, streaks, edge leak, cost of a mistake, minimum samples, hour and weekday grouping) MUST be written in `docs/domain.md` with a worked example and flagged **unconfirmed** until the owner confirms it, and the decisions of this feature MUST be logged with their dates (constitution VIII).
- **FR-020**: Home and Analytics MUST meet the same accessibility and design rules as the existing screens: no meaning carried by colour alone, keyboard use, both colour sets, and every chart having a text equivalent (a table the owner can reach) (constitution V).

### Key Entities *(include if feature involves data)*

No new stored data. The feature reads:

- **Trade**: a closed trade (account, instrument, direction, size, entry and exit times, net result, R when risk exists, deleted or not), with its judgement (plan followed Yes, Partly or No, label) and its mistake tags.
- **Account**: its currency and its kind (Live or Backtest); decides the blocks and the scope.
- **Daily review and weekly mark**: only to know which days and weeks are reviewed or Missing.
- **Focus**: the owner's week and month sentences, and the day's "next focus" answer, shown read-only.
- **Mistake and its stop line**: for the counter and the cost table.
- **Figure** (a concept, not stored): a value with its definition, its sample size `n`, its scope (period, accounts, currency) and, when it cannot be computed, its reason.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Signing in lands on Home, and the owner can tell within five seconds, without opening another screen, their net result for the month, how many of those trades followed the plan, and how many days or trades are waiting for them.
- **SC-002**: Every statistic on Home and Analytics equals an independent recomputation from the Trades list for the same period and scope, for a test set that includes all three plan answers, not-judged trades, trades with no stop, a typed result, two currencies, a Backtest account and a deleted trade (zero differences).
- **SC-003**: No money figure on Home or Analytics appears without the plan-followed figure of the same scope, and no rate appears without its `n` (checked on every card, table row and chart text equivalent).
- **SC-004**: Every figure that cannot be computed is a dash with a stated reason, and no screen shows a zero where the honest answer is "unknown" (checked on an empty journal, a journal with only unjudged trades, and a journal with no stops).
- **SC-005**: With 5,000 trades across ten accounts, Home and Analytics open, and a change of period or scope redraws, in under one second each.
- **SC-006**: Selecting a calendar day, a breakdown row, a needs-you line or a mistake leads to the screen that shows exactly those items, and the counts agree (a breakdown row's `n` equals the filtered Trades list's total).
- **SC-007**: The needs-you list equals the Missing days and not-judged trades of the Reviews screens for the same scope, and a Backtest account never appears in it for the live scope.
- **SC-008**: After running the feature against a real journal, nothing was created, changed or deleted by it (no audit entry, no changed row), checked by comparing the export before and after.
- **SC-009**: The owner confirms each new rule in `docs/domain.md` after reading it in words with its worked example.

## Assumptions

- **One owner, desktop browser**, as everywhere else; Home and Analytics are built for that.
- **The product's existing rules decide the rest**: trading day from the entry in the journal time zone, win = net above zero, a trade with no plan answer is "not judged yet", Backtest accounts are left out of live figures, deleted trades never count (`docs/domain.md`).
- **"Plan not followed" for edge leak** means a plan answer of **No or Partly** (anything that is not Yes, since Partly never counts as followed); trades not judged yet are on neither side. Flagged unconfirmed; the owner may prefer "No" only.
- **Default period and scope** are this month and all live accounts; the choice is kept in the address, not stored.
- **Equity curve** is the cumulative net result from the start of the period, not an account balance (the journal has no balance or capital); a curve is drawn per currency.
- **Minimum samples**: rates and ratios show with any count but are marked "few trades" below 10; statistics that need more than one trade (expectancy, payoff, profit factor, drawdown, streaks) are a dash below 2 trades; these numbers are flagged unconfirmed.
- **Drawdown** is the largest peak-to-trough fall of the cumulative realised net result within the period, in money, taken in trading-day order with trades of one day in entry order; flagged unconfirmed.
- **Profit factor** is the sum of winning net results divided by the sum of the absolute losing net results; a period with no losses has a dash with the reason "no losing trades", not infinity. **Payoff ratio** is average win divided by the absolute average loss. **Expectancy** is the average net result per trade (in R: the average R of the trades that have one, with how many that is). All flagged unconfirmed.
- **Streaks** are runs of consecutive wins or losses in entry order; break-even trades (inside the band, or exactly zero) end a run without extending it.
- **Charts** are line and bar drawings with a table equivalent; no chart library is assumed here (that is for the plan).
- **Not included**, and not blocked: a composite score, setup playbook analytics, drawdown percentage, MAE and MFE, tilt and discipline-streak overlays, an agent tool for these figures, and exporting a chart as an image. A later agent feature can read the same figures through the routes of FR-017.
- **No new outbound call, no new secret, no new stored data**: so no security review rows for data protection; the new routes are owner-only like the existing reads.

## Wireframes

Greyscale wireframes are in `screens.md` (Penpot pages H1 to H4, drawn 2026-10-30). The six questions they raised are answered above (Clarifications, Session 2026-10-30).

## Signed-off wireframes

The wireframes in `screens.md` were signed off by the owner on 2026-10-30 for structure, content, states
and behaviour. Plan, tasks and implementation MUST honour them. The look is not signed off here:
it follows the project's approved visual direction and passes a visual review after
implementation (constitution principle V). Any change to an interface covered here MUST update
`screens.md` and its Penpot frames in the same change.
