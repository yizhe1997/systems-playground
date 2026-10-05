# User flows in the reference product

Read from the product's own guided tours, onboarding, settings text and notices (about 6,000 interface strings) plus the logic behind them. Written as what a trader does, step by step. "Unknown" marks anything the strings do not settle.

## 1. First run

1. Welcome screen.
2. "Have you used the host app before?" (RP-specific, an Obsidian question; drop for v2). Yes skips an orientation; No shows one short screen.
3. **Where are your trades right now?** Four answers: on my broker or platform, in my own spreadsheet, nowhere yet (add as I go), or "let me explore a sample". The text says outright that bringing history makes the stats meaningful from day one.
4. Broker answer: search a list of brokers and platforms; badges mark the ones that can auto-sync; "not listed" leads to manual import and a request link.
5. **Personalise:** three questions: how do you trade (many trades a day / a few, nothing overnight / held days to weeks / held weeks to months), what kind of account (personal / demo / prop challenge or funded), what do you mainly trade (stocks, futures, forex, crypto, options, a mix). It says the app personalises from these. What it changes is unknown.
6. First trade: "add your first trade" or "explore with sample data".
7. **Waiting state:** the onboarding stays open, labelled "waiting for your first trades", with one action (finish connecting the broker, finish the import, or save the first trade). It closes by itself when the first trade arrives.
8. **Sample journal:** a fictional populated journal you can explore, with a badge in the corner to exit or reset it. Edits there are practice only, sync is paused, and removing it only deletes files it can prove it created.
9. The Home screen also keeps a **Getting started** checklist: set up an account (15 s), bring in history (30 s), open the trade log, open the layout builder, open the sidebar, activate the paid tier. Each item has an estimated time.

## 2. Accounts

- **Create:** name (unique), type (demo, evaluation, funded, or custom types you add; "archived" is reserved), initial balance, live balance, creation date (not in the future), currency, drawdown type (none, fixed, end-of-day trailing, manual with dated snapshots), drawdown amount, profit target (amount or percent, optional date), monthly cost.
- **Prop challenge toggle:** turn it on, pick a firm and challenge, and the phases and rules are filled in; or choose "other / custom firm" and enter rules. Applying firm rules replaces whatever was typed, with a confirmation.
- **New broker account detected** (from sync or import): a prompt offers to create a new account with a name, link to an existing account, or use a default name.
- **Account page:** balance chart that also shows the drawdown floor and profit-target lines, performance for this account only (balance, P&L, win rate, every cost), risk progress (drawdown used, remaining, target progress, status breached/achieved/in progress), cash movements (deposits and withdrawals, shown as **payouts** on a prop account), actions: open this account's trades, add a cash event, edit.
- **Warnings:** trades found before the account creation date or before the first phase start, with a one-click fix of the date.
- **Accounts dashboard:** AUM chart over time, totals, accounts grouped by type with a weight bar, a switch between **Overview** and **Challenges**. Settings: custom account types (deleting a type with accounts forces reassign, archive or delete), which type each challenge stage sets, which types count in totals and whether their withdrawals count, display order.
- **Copy trading:** an account can copy a base account with a multiplier (0.1x to 100x) from a date; copied trades are derived, P&L can be adjusted per copied trade; a base cannot also be a copier. Whether copies count in all-account analytics is a setting.
- **Merge / convert legacy accounts:** older separate accounts per phase can be combined into one challenge with phases; reversible until you confirm "looks right". Migration tooling, not needed in v2.

## 3. The trading day

**Before the open (optional, session mode):**
1. Session windows are set once (name, start, end). A lead time before each opens preparation mode.
2. Waiting: shows the next session and when preparation opens.
3. Preparation: countdown, linked notes and playbooks, goals ("write down what a good session looks like"), a pre-session checklist.
4. Live: the **trade gate** (press start, answer the questions, end on green light, wait or no trade), the **session log** (timestamped notes tagged analysis, market, trade, psychology, lesson, with trade entries and exits merged into the timeline), and an alert when one tag dominates (the shipped example: psychology above a share of notes means "mindset was a major theme").
5. Break: "step away, hydrate, clear your mind" with the next session time.
6. Ended: stats (trades, notes, gate checks), and three actions: import trades, add a trade manually, open the daily review.
7. Outside a window you can **start an unplanned session**: you must write why; it is marked unplanned in the daily review and cannot start while a session is live.

**Logging a trade:** the form has Basic, Details and Advanced tabs. It is customisable (show, hide, reorder blocks; choose input mode "prices" or "P&L plus risk"; ask or fix the asset type). Trade type is regular, missed (with a reason) or backtest. Fills are lists (entries, exits) with a running "remaining position". Optional blocks: costs, risk and stop, take-profit targets (by price with close percent or size), "ideal exits" (the hindsight plan, to measure how much of the move you captured), thesis, tags, setups, mistakes, custom fields, attachments, and for an open trade a price snapshot to show unrealised P&L. With no account yet the form tells you to create one first.

**Reviewing trades:** in the trade log, filter, sort, multi-select, and batch mark reviewed, add setups, tags or mistakes, duplicate or delete. A trade's own review asks questions chosen by outcome: for a win "what worked, was it repeatable, key lesson"; for a loss "what went wrong, was it a valid loss or an execution mistake, what will I avoid"; for breakeven "was it managed correctly". Questions can be text or a choice, can appear only when an earlier answer matches, and keep stable ids so edited prompts do not orphan old answers.

**Daily review ("DRC"):** see `03`. Automatic pieces: recurring goals, the pre-trade checklist, the day's trades, stats, charts, key events from the weekly review, previous-day context, session log, missed trades, then your own grades (mental and technical, stars or letters), session mistakes ("log a mistake once for the session, not on every trade"), free notes, and "mark as reviewed" with a time.

## 4. Weekly, monthly, quarterly, yearly

- **Weekly:** preparation block (weekly goals, key events with a day, time, currency and notes, a forecast per timeframe), the week by weekday (pulling sections from each daily), performance (stats, curve, drawdown, best and worst trades, setup performance), self-assessment (mental and technical), review questions, and "goals for next week".
- **Economic calendar:** pulls events (by currency, impact level, holidays) into the weekly review automatically, refreshes readings without re-adding events you removed, and offers "restore missing". A paid feature in the RP.
- **Monthly and above:** summaries by week or month, best and worst weeks, months or quarters, grade distribution over the dailies, the demon tracker with a stop threshold, goals.

## 5. Import and sync

1. **Pick the source** ("where are these trades from?"): a platform whose file format is read directly (no mapping needed), or an own spreadsheet or other file. A tile says when the platform can also sync automatically.
2. Upload (size cap 10 MB). A privacy note says exactly what is sent and that raw files are not stored by default; the AI mapping option is explicit and can be switched off.
3. **Analyse:** the sheet and header row are guessed; the app reads the file and asks anything it cannot decide, for example **ambiguous dates** ("your dates look like 03/04/2024, which is it?"), and warns about the wrong report type with a link to the right export steps. If the file looks like a different source than the one chosen, it offers to **switch source** without re-uploading.
4. **Map columns:** each column to a trade field, with required fields marked per asset type; "what is each row?" (a fill/order, or a finished trade with P/L); unmapped columns can be **kept as custom fields**; screenshots embedded in a spreadsheet can be attached to their trades; the mapping can be saved as a template and shared as a code.
5. **Preview:** counts (found, ready, possible duplicates, need attention), date range, symbols, and a table with a status per trade (new, already imported, in another account, updates existing, possible duplicate, needs review, duplicate in file, invalid, no open trade to close, several open trades match, quantity mismatch). Possible duplicates can be imported anyway, one or all.
6. **Confirm,** then a result: written, updated, skipped as duplicates, failed rows with a copyable report.
7. **Handoff:** "view N trades" opens the trade log filtered to just this operation, "review now" jumps to the right review period, with other periods offered.
8. **Undo:** import history lists every import with the number of trades; one can be undone or deleted; deleting also checks whether another import contains the same trades and keeps those.
9. **Quick import:** a drop zone that reuses the favourite source and mapping and skips straight to the preview.
10. **Sync:** connect a broker (some on the product's website, with account discovery), map each broker account to a local account, choose initial history (all, recent 90 days, from a date, new trades only), then "Sync all"; status per connection (setup required, connecting, paused, reauthorise, error); pending acknowledgements and "restore missing notes" exist because the host app keeps files.

## 6. A prop challenge

1. Create the account with the challenge toggle (see 2). Phases pending, active, passed or failed.
2. **Rule cockpit** on the account page: pick a phase and see each rule with progress, state (not started, in progress, reached, met, safe, clear, within rule, near limit, limit reached, cap applied, breached) and a **help text with a live example** ("today: $X lost of the $Y daily limit, $Z left"). Funded phases with payout rules show payout readiness.
3. Notices: near a limit; target reached ("ready to move to the next phase?"); evaluation passed; failed (rule and date); rules broken after the target was reached, with a transition time so those trades stay out of the phase; new unknown account.
4. **Advance** to the next phase (choose a transition time: now or when the target was reached); the account type can change automatically per stage. **Mark passed or failed, archive, or reopen.**
5. Funded: payout readiness (requirements met of total, available amount, trader share, balance after, room before breach); "record payout"; the cycle resets or continues per the rules; the final payout can conclude the account, advance it or mark it eligible for live review; a payout plan (notify at a minimum, suggested withdrawal).
6. Costs (purchase, reset, activation) feed the **Challenges** view: pass rate, cost per attempt, cost per funded account, payout conversion, ROI, per-phase average duration and "most failed" phase, per-firm attempts.
7. Rules can change over time: a firm update raises a notice; the user compares added, removed and changed rules, and applies it from an effective time; earlier history keeps the old rules. A "keep current rules" choice dismisses it.

## 7. Setups (playbooks)

- Create with name, status (testing, active, archived), direction, colour, tags, preferred sessions, timeframes and tickers, linked notes. Rules are added from a template (best conditions, entry criteria, invalidation, risk management, avoid when, common mistakes) or one by one, in groups, each with a category and a required flag.
- **Overview:** cards with key metrics, a trend line, status, last traded; rank by a chosen metric; filter by tag and direction; **Pairs** (setup combinations with 5 or more shared trades, with edge); **Compare** two setups (winner, expectancy edge, confidence, reasons, cumulative chart).
- **Detail:** performance (cumulative P&L, cumulative R, drawdown), **execution gap** (live P&L, missed edge, live plus missed, backtest, **capture rate** = live P&L over live plus missed P&L, average R difference), playbook note preview, rules, linked notes, screenshots, and a **needs attention** list (no playbook, no rules, no trades, no screenshots, not traded for N days, profit factor under 1, negative expectancy).

## 8. Looking at the numbers

- **Filters** work the same on Home, Dashboard, Trade log, Setups and reviews: accounts (and challenge phases), tickers, setups, tags, mistakes, trade type, status, direction, review status, session tags, custom fields. Every value can be **excluded**; several values can match as any of, all of, only these, or exactly these.
- **Home** has two modes sharing one page: Overview (personal widgets, quick links) and Dashboard (metric cards plus charts and breakdowns), each with its own layout and filters, both editable by drag and resize.
- **Privacy mode** masks money, prices and account values everywhere without changing data; shared images can hide dollar amounts.
- **Display choices:** show R instead of currency, a currency for all values, 12 or 24 hour time, week start day, exclude weekends, a **trading-day cutoff time** (trades after it belong to the next day; default off), a **break-even band** (fixed or a percent of balance; scratch trades are not wins or losses and are left out of win rate), analytics date basis (entry or exit date, for swing traders), include unrealised P&L, include copy accounts.
- **Metric help:** every number with a formula has a tooltip stating the formula and how many trades it was computed from, and says plainly when a number is unavailable (for example mixed currencies without conversion).
- **Gallery:** screenshots from trades and reviews as a grid, grouped by entry or individual, with tags and notes on each image, filtered by annotation status.
- **Position size calculator** and **performance calendar** are small tools.
