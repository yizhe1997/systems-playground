# Wireframes: Home and Analytics

**Feature**: `005-home-and-analytics`
**Status**: signed-off
**Penpot**: file `Tradecraft_v2`, pages `H1 Home`, `H2 Analytics`, `H3 Rule replay and mistakes`, `H4 Period and scope`; H for the home and analytics screens (the page letter of feature 005). Drawn 2026-10-30; the frames live only in Penpot and no image of them is stored in the repository. The sidebar is the current one with **Home** added first and **Analytics** added to the Journal group (Reviews, Trades and Mistakes stay).
**Signed off**: 2026-10-30, re-confirmed 2026-10-31 (structure and wording only; the look is decided elsewhere)
**spec-sha256**: 217ade8b78e79053d1aded2b58f067df871164d72be862491f53c3803ac46523

## Why these screens

They serve US1 (Home), US2 (Analytics statistics and breakdowns), US3 (Rule replay and the cost of each mistake) and US4 (needs you, on Home). The existing screens are not redrawn; only the sidebar changes.

All sample figures are one consistent month: October 2026, 12 trades over weekdays only (Thu 1 Oct is the first), net +$340.00, 7 wins of 12, plan followed 6 of 12 with 3 not judged yet (2 No, 1 Partly). The Analytics breakdowns, Rule replay and the heatmap all come from the same 12 trades, so every number can be checked by adding.

## Screen inventory

| ID | Screen | Serves | States drawn | Penpot frames |
|---|---|---|---|---|
| H1 | Home | US1, US4, FR-001 to FR-007 | filled (one currency), two currencies, nothing yet, no trades in the period, only unjudged trades | `H1 Home: filled (one currency)`, `H1 Home: two currencies (one block each)`, `H1 Home: nothing yet (no trades)`, `H1 Home: no trades in this period`, `H1 Home: only unjudged trades` |
| H2 | Analytics, Statistics tab | US2, FR-008 to FR-010, FR-013 | filled, few trades (dashes with reasons), break-even band on, a definition shown | `H2 Analytics: filled`, `H2 Analytics: few trades (dashes with reasons)`, `H2 Analytics: break-even band on`, `H2 Analytics: definition shown` |
| H3 | Analytics, Rule replay and mistakes tab | US3, FR-011, FR-012 | filled, partly judged, nothing judged | `H3 Rule replay: filled`, `H3 Rule replay: partly judged`, `H3 Rule replay: nothing judged` |
| H4 | Period and account scope controls | US1, US2, FR-002 | period list, custom range, invalid range, account list | `H4 Period list`, `H4 Custom range`, `H4 Invalid range`, `H4 Account scope list` |

## Flows

1. **Open the app:** sign in, land on Home (H1). The sidebar's first item is Home; Reviews stays second.
2. **Change what I am looking at:** the Period and Accounts controls (H4) change every card, chart and table on the screen together; the choice is in the address.
3. **See what is waiting:** Home's needs-you panel lists days missing a review, trades not judged yet and weeks not marked reviewed; each line opens the screen that fixes it (daily review, judge drawer, weekly review).
4. **Check a day:** select a calendar cell on Home; the daily review of that day opens.
5. **Ask whether there is an edge:** Analytics, Statistics tab (H2): the performance table, then the breakdowns. Selecting a breakdown row opens the Trades list filtered to exactly those trades.
6. **Ask what rule-breaking cost:** Analytics, Rule replay and mistakes tab (H3); selecting a mistake row opens the Trades list for that mistake; "Judge the trades not judged yet" opens the daily review.
7. **Read a definition:** every statistic has a Definition link (H2 "definition shown") giving what it counts, what it leaves out and its minimum sample.

## Content list

Every word the owner will read. No placeholders. Amounts are examples in the account currency; the words are final.

### H1 Home

| Element | Text |
|---|---|
| Title and subtitle | Home. How you are doing, and what is waiting for you. |
| Controls | Period (This week, This month, Last 30 days, This year, All time, Custom range) and Accounts (All live accounts, or one account). The line beside them: "Backtest accounts are left out. USD accounts only in this scope." |
| Cards | Net result, Trades, Win rate, Profit factor, Expectancy. Each has its value, a note with `n` and its unit (for example "12 trades · USD", "n = 12 · no break-even band", "per trade · n = 12"); the Expectancy card adds a second line, "In R: +0.31 R · 8 of 12 trades" (or the dash and its reason), and, under a divider, the plan figure: "Plan followed 6 of 12 (3 not judged)". With two currencies, "few trades" is added under 10 trades. |
| Card help line | Each card has its definition: select the card title. Results are in USD; this page has no totals across currencies. |
| Equity curve | Heading "Equity curve", subtitle "cumulative net result by trading day, USD", link "View as table". Text equivalent for the picture: "Equity curve: line from $0 to +$340.00 over 12 trades, lowest point -$60.00 on Tue 6 Oct". |
| Daily result | Heading "Daily result", subtitle "net result per trading day". Text equivalent: "Daily bars: 12 trading days, from -$150.00 (Tue 6 Oct) to +$200.00 (Thu 8 Oct)". |
| Calendar | Heading "Calendar", subtitle "October 2026, one cell per trading day: result and plan followed". Weekday columns Monday to Friday. A cell shows the day number, its result and its plan figure ("Plan 1 of 1", "Plan 0 of 1", "Plan 0 of 1 (partly)", "Not judged"); a day with no trades says "no trades"; days outside the month are greyed. Note: "Select a day to open its daily review. Colour is not used: the border marks days with trades." |
| Needs you | Heading "Needs you". "2 days missing a review" with the days and trade counts, link "Open the daily review". "3 trades not judged yet" with the newest trades, link "Judge in the daily review". "1 week not marked reviewed" with its dates, link "Open the weekly review". With nothing waiting: "Nothing is waiting for you." |
| Your focus | Heading "Your focus". "Yesterday (from the review of Tue 27 Oct)", "This week (26 Oct to 1 Nov)", "This month (October)", each with the owner's sentence, or "No focus written." Link "Change focus". |
| Mistakes in October | Heading "Mistakes in October" and "3 records". Each mistake with its count ("2 this month", "1 of 2 this week" with "stop line: 2 per week"). Note: "A count is the number of records: each tag on a trade and each whole-day record." Link "Open the Mistakes counter". |
| Two currencies | Notice: "Your accounts use two currencies. Figures are shown once per currency and are never added together." One block per currency, headed "USD accounts" or "EUR accounts" with the account names. |
| Nothing yet | "No trades yet." "Home shows how you are doing once you have logged trades: your result, how many followed the plan, and what is waiting for you." Button "Log a trade". "Trades you log appear here with the plan answers you give in the daily review. Nothing is shown as zero until there is something to count." |
| No trades in the period | "No trades in this period." "You have 38 trades in other periods. Choose another period." Button "Show all time". |
| Only unjudged trades | Notice: "None of these 12 trades is judged yet. Judge them in the daily review to see how the plan did." Cards show "Plan followed 0 of 12 (12 not judged)"; the Expectancy card keeps its money value and its second note line shows the dash: "In R: — no stop recorded on 12 of 12 trades". |
| Numbers and units | Money as signed amounts with the currency symbol of its account; win rate as "k of n (p%)"; profit factor, expectancy and averages to two decimals. |

### H2 Analytics, Statistics

| Element | Text |
|---|---|
| Title, subtitle, tabs | Analytics. Is there an edge, where does it live, and where does it leak. Tabs: Statistics, Rule replay and mistakes. |
| Controls | Period, Accounts, Break-even band (None, or an amount such as "$ 40.00"). Beside the band: "A trade inside the band is neither a win nor a loss." With a band on: "Trades from -$40.00 to +$40.00 are set aside." |
| Scope strip | "12 trades, USD · Plan followed 6 of 12 · 3 not judged yet · R known for 8 of 12 trades". With a band: "... · 1 trade inside the break-even band set aside from the win rate". |
| Performance table | Columns Statistic, Value, n, Plan followed (same trades), and a Definition link. Rows: Net result, Win rate, Profit factor, Expectancy, Expectancy in R, Average win, Average loss, Payoff ratio, Largest win, Largest loss, Maximum drawdown, Longest winning streak, Longest losing streak. |
| Drawdown note | "Maximum drawdown is the largest fall of the running result from a peak ($90.00 on Mon 5 Oct) to a trough (-$60.00 on Tue 6 Oct). It is in money: there is no capital to take a percentage of." |
| Few trades | Dashes with their reason in the Value column: "— no losing trades", "— needs at least 2 trades, has 1", "— no stop recorded on 1 of 1 trades", "— needs a win and a loss"; the win rate carries "few trades". Note: "A dash always says why. Nothing is shown as zero when the honest answer is "not enough to say"." |
| Break-even band on | "7 of 11 (64%) — 1 trade set aside"; money rows say "(the band does not change money)"; "The band only changes what counts as a win or a loss for the win rate and the streaks. It is a view option: it is not saved." |
| Definition | A panel titled with the statistic, one sentence of what it counts with the worked figure, one of when it is not shown, and a Close link. Profit factor: "The sum of the net results of the winning trades divided by the sum of the net results of the losing trades, as a positive number. Here: $780.00 / $440.00 = 1.77." and "Not shown (a dash with the reason) when there is no losing trade or fewer than 2 trades. Closed trades only. Every trade in the scope counts, judged or not." |
| Breakdowns | Heading "Breakdowns", "Select a row to open the Trades list for exactly those trades." Tables By weekday, By hour of entry (Central Time), By instrument, By direction, By account with columns Trades, Net result, Win rate, Plan followed. A weekday with no trades shows "— no trades". Notes: "Only hours with trades are listed. The hour follows the journal time zone, like the trading day." and "Rows with fewer than 10 trades are marked "few trades". Every row shows its trade count: a rate is never shown without it." |
| Link to the other tab | "Rule replay and the cost of each mistake are on their own screen: Open Rule replay and mistakes". |

### H3 Analytics, Rule replay and mistakes

| Element | Text |
|---|---|
| Scope strip | "Judged: 9 of 12 trades · 3 not judged yet · USD". Partly judged: "Based on the 4 judged trades of 12 · 8 not judged yet · USD". |
| Rule replay | Heading "Rule replay", subtitle "what the period looks like without the trades where you did not follow your plan". Table with Trades, Net result and "What it is": Plan followed (Yes) "Trades you judged as following the plan"; Plan not followed (No or Partly) "The edge leak: what these trades cost"; Not judged yet "Neither followed nor not followed: judge them to place them"; Actual result "The three lines above added up"; Result without the plan-breaking trades "Actual result minus the edge leak; the 3 not judged stay in". Chart text equivalent: "Bars: followed +$720.00, not followed -$280.00, not judged -$100.00, actual +$340.00, without the plan-breaking trades +$620.00". Note: "Not judged yet is never guessed. Partly counts as not followed, because Partly never counts as following the plan." |
| Partly judged | Notice: "Only a third of the period is judged, so the edge leak is a floor, not the whole story. Judge the 8 trades to complete it." and link "Judge the 8 trades not judged yet". |
| Nothing judged | "No trade judged yet." "Rule replay compares the trades where you followed your plan with the ones where you did not. It needs your plan answers from the daily review. 12 trades are waiting." Button "Judge the trades not judged yet". "The cost of each mistake appears when trades carry a mistake tag." |
| Cost of each mistake | Heading "Cost of each mistake", subtitle "the net result of the trades that carry each mistake tag". Columns Mistake, Trades, Net result of those trades, Plan followed on them, Records this month. Note: "A trade with two mistakes counts under both, so these rows do not add up to a total. Mistakes with no trades in the period are not listed. Select a row to open its trades." Link "Judge the 3 trades not judged yet". |

### H4 Period and scope controls

| Element | Text |
|---|---|
| Period list | This week (26 Oct to 1 Nov); This month (1 Oct to 30 Oct); Last 30 days; This year (2026); All time; Custom range... The chosen one is marked. Note: "The choice is kept in the address, so a view can be reopened and shared with yourself. Nothing is stored in the journal." |
| Custom range | Fields From and To (dates), button Apply, note "Days are trading days of the journal time zone." |
| Invalid range | "! The end is before the start. Choose an end on or after Fri 30 Oct 2026." and, below, "The figures below keep the last valid period until a valid range is applied. Nothing is computed for an invalid range." |
| Account list | All live accounts (marked), then LIVE: each live account with its currency, then BACKTEST: each backtest account with its currency. Note: ""All live accounts" leaves backtest accounts out. A backtest account is shown on its own when chosen. One account of any kind can be chosen." Archived accounts come after the others, marked archived; their trades count in "All live accounts". |

## Constitution check

- [x] Every money figure has process information beside it (principle I): every card and every table row has "Plan followed X of Y" for the same trades; the heatmap cell shows the plan figure beside the result; Rule replay is itself the process view.
- [x] Every figure that can be unavailable shows a dash and a reason (principle III): H2 few trades, H1 only unjudged trades (the R dash), "Result without" is always computable.
- [x] No placeholder text anywhere (principle V).
- [x] Greyscale only: no brand colour, brand font or colour-coded meaning (principle V). The calendar uses a border, not colour, to mark trading days, and cells say their result in words.

## Reactions

| Date | Screen | Owner's reaction | What changed |
|---|---|---|---|
| 2026-10-30 | All (H1 to H4) | Looks decent; accepted the default for all six open questions (no preference yet) | Nothing redrawn; the answers are recorded below and in spec.md. Two small words: an archived account is chosen from the Accounts list, after the others and marked archived; weekend columns appear only for a month that has a weekend trade |

## Open questions for clarify (all answered 2026-10-30: the defaults)

1. **Edge leak definition.** Plan not followed = **No or Partly** (as drawn), or **No** only? (The spec's default is No or Partly, because Partly never counts as following the plan.)
2. **Two currencies.** One block per currency on the same page (as drawn in H1, two currencies), or require choosing one currency first? On the calendar, a day with trades in both currencies would show one result line per currency.
3. **Break-even band.** A view option typed on the Analytics screen and not saved (as drawn), or a journal setting?
4. **Archived accounts.** Do the trades of an archived account count in "All live accounts"? (Their trades are live trades; today the Trades list still shows them.) Should an archived account be choosable in the Accounts control?
5. **Analytics tabs.** Rule replay and mistakes drawn as a second tab of Analytics (as drawn), or as a section lower on the same page?
6. **Calendar weekends.** The heatmap shows Monday to Friday only because futures trade on weekdays. If a trade is ever logged on a weekend, should the calendar show Saturday and Sunday columns for that month?

## Sign-off

- **Signed off by**: owner
- **Date**: 2026-10-30; re-confirmed 2026-10-31 after the analyze remediations (drawdown 2-trade minimum, future period, definition text in the API, the Expectancy card's second line; no screen added or removed)
- **Spec hash**: 217ade8b78e79053d1aded2b58f067df871164d72be862491f53c3803ac46523
- **Notes**: signed off with the defaults of the six open questions accepted (no preference yet); an archived account is chosen from the Accounts list after the others and marked archived; weekend columns appear only for a month that has a weekend trade.

## Visual review

Filled in after implementation (constitution principle V).

- **Date**:
- **Visual direction**: see `docs/visual-direction.md`
- **Built screenshots**: not stored in the repository
- **Wireframe match**:
- **Design checks run**: critique, audit
- **Fixed**:
- **Parked**:
- **Owner's approval**:
