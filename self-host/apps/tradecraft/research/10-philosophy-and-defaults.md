# What the product is for, and what it does out of the box

Second pass, continued 2026-10-02. This file is about intent: the idea the product is built around, and what a new user actually gets without configuring anything. Sources: the built-in review layouts, the default settings, the personalisation rules and the sample journal (a fictional populated journal the product ships so people can explore it).

## 1. The idea underneath everything

Reading the built-in layouts, the default prompts and the sample journal's story together, one idea shows through. It is not "track your P&L". It is:

> **Judge the decision, not the outcome. Write down one specific thing to do differently next time. Make sure you see it again.**

The evidence, all in the shipped content:
- The sample journal's own example entries include a **losing trade labelled "valid loss"** (followed the rules, no change needed), a **winning trade labelled a mistake** ("chased breakout, profitable despite lower decision quality"), and a **premature exit** study. The playbook text says "grading the decision only by its outcome" is a common mistake.
- Mistakes are a separate list from setups (sample: Chased Entry, Oversized Position, Moved Stop, Exited Early, Ignored Checklist, Traded Outside Plan) and are counted over time (the demon tracker, with a "stop trading" threshold).
- The daily review's three default questions are *what did I do well, what could I improve, what will I focus on next session*. The third answer is **shown at the top of tomorrow's daily review** (the "previous trading day" block is preconfigured to show exactly that heading). That is the loop: yesterday's focus becomes today's reminder.
- Planning goes the other way too: a monthly "trading focus" field is shown on each daily review (sample text: "wait for candle-close confirmation before entering").
- Reviews are graded on two axes, **mental** and **technical** (A/B/C or 1 to 5 stars), and the monthly review counts "A games, B games, C games" per week. So you can see "I executed well but my head was off".
- A trade review's questions differ by outcome, and for a loss one question is literally "valid loss or execution mistake?".
- The session log can warn that psychology notes dominate a session (tilt), and "lesson" notes can be promoted.

In one line: it is a **process-discipline journal** with numbers attached, not a statistics dashboard with notes attached.

## 2. The default daily review, as shipped

An ordered page, mostly automatic:
1. Header with previous and next day.
2. **Yesterday's focus** (pulled from yesterday's third answer, falling back to the nearest earlier day).
3. **Goals** (checkboxes) and **pre-trade checklist** (copied in each day from your recurring list; shipped examples: review market conditions, check the economic calendar, set risk limits for the day, review the previous day's trades).
4. **Forecast:** pictures and notes (charts you marked before the session).
5. **Performance:** equity curve, drawdown, stats, the day's trades table.
6. **Trade review:** each trade expanded with its images and outcome-based questions; a free notes area.
7. **Review:** the two grades, missed trades for the day, then three questions (done well / improve / next focus), end-of-day images, and a **Mark as reviewed** banner with the time.

You write: the forecast, the trade answers, the grades, the three answers. Everything else appears by itself.

## 3. The other levels, as shipped

- **Weekly:** goals, a preparation checklist (shipped examples: check the news calendar, build the weekly plan, prepare the higher-timeframe narrative), key events for the week (from the economic calendar), a forecast per timeframe; then performance (curve, drawdown, stats, setup performance, best and worst trades, a day-by-day table); then the **review**: the week's daily answers pulled in by weekday, grades, the **demon tracker**, and five questions (what worked, what didn't, which setups paid, which mistakes cost the most, what to improve next week).
- **Monthly:** performance with best and worst weeks and a week-by-week table; goals; demon tracker; **mental and technical game** distributions; five questions (key lessons, best strategies, patterns noticed, next month's goals, risk management).
- **Quarterly:** stats, monthly P&L bars and table, setup performance, best and worst months, notes, grades, demon tracker.
- **Yearly:** the same by quarter; plus an optional **"Detailed Yearly"** layout that is a long reflective questionnaire (what are you proud of, three biggest challenges overcome, where did you fall short, three things to reinforce and three to improve, goals achieved or not and why, did you leave potential untapped) and a P&L section with questions.

So the higher levels are mostly **numbers plus a few reflective questions**. The daily is the working document.

## 4. Reviews appear on their own

By default a review is created automatically when the first trade of its period is recorded, and also when you navigate to a period that has none. The home screen has a streak widget ("N days reviewed in a row", or "missed N days since your last review") and an "unreviewed trades" widget. After an import or sync, a banner says "N trades synchronised: view them / review now", and offers the right period.

## 5. It reshapes itself to the kind of trader you say you are

The first-run questions (how do you trade, what account, what asset) change real defaults. Examples read from the rules:
- **Many trades a day:** do not auto-open each new trade, silence "new trade" notifications, streak counts *daily reviews*, home gets weekly summary, best hours, streak.
- **A few trades a day, nothing overnight:** streak counts *trade reviews*; home adds an unreviewed-trades widget.
- **Held for days or weeks (swing):** streak counts *weekly reviews*; session mode and "today's review" are hidden from shortcuts; reviews are not auto-created on navigation; analytics use the *exit* date.
- **Held weeks to months:** the same, with a *monthly* streak and monthly review shortcut, no automatic weekly review.
- **Prop challenge or funded:** home gets a drawdown monitor and profit-target widget; the accounts shortcut moves next to Add Trade; new accounts default to evaluation with end-of-day trailing drawdown.
- **Demo or practice:** a goal widget ("journal 30 trades").
- **Asset focus** (not "a mix"): the asset type is fixed so the form stops asking; futures also switch take-profit sizing to contracts and excursion display to ticks; position-size calculator defaults to that asset.

The lesson is that **the product assumes there are different kinds of traders with different review rhythms**, and it picks the rhythm for you. A scalper's unit of reflection is the day; a swing trader's is the week.

## 6. What the app looks like on day one

- **Navigation:** Home, Dashboard, Trade Log, Accounts, Add Trade, Layout Builder, Quick Import, Sync Trades, Trade Import, Session Mode, Economic Calendar, Position Size Calculator; with sections Overview, Reviews and Tools, and a calendar sidebar that shows each day's P&L and links to that day's, week's, month's or quarter's review. Items can be hidden. Account and setup shortcuts can be pinned.
- **Home (default):** year heatmap, weekly summary, getting-started checklist, unreviewed trades, recent items, position size calculator. Quick links: Add Trade, Today's review, Sync Trades, Trade Log, Setups, Dashboard, Accounts, Trade Import, Layout Builder, Session Mode (the weekly, monthly, quarterly and yearly shortcuts are present but hidden).
- **Trade log columns:** image, account, ticker, status, P&L, direction, setups, mistakes, tags, date, reviewed.
- **Defaults that matter:** week starts Monday, weekends excluded, missed trades *not* included in calculations, unrealised P&L not included, R display off, break-even band zero, review auto-creation on.

## 7. What the sample journal teaches about intended use

A fictional journal with about a year of activity: five accounts (a futures account, an evaluation, an equities account, a funded account, and a **failed challenge**), four setups (opening range breakout, trend pullback, range reversal, failed breakout), instruments MES, MNQ, AAPL, MSFT, around 32 recent daily reviews with a few **deliberate gaps and drafts**, weekly reviews with one missing daily ("totals still include its trades"), four monthly reviews, a quarterly and yearly each completed and in progress, charts as illustrations, a "Start here" note and a practice checklist, custom trade fields (plan adherence, confidence, confluence, catalyst notes) and custom review fields (trading focus, energy level). The suggested tour is: open Home with the daily routine layout, open the dashboard, open the trade log, edit a trade and finish an unfinished review. In other words it shows the *routine*, not the features.

## 8. What this means for reading the rest of the code

Most of the 200 KB trade service and 137 KB account-page service is **file plumbing**: where each trade note lives (year, month, week, day folders), how front matter is migrated between versions, caches, queues for pending writes, rollback of half-created files. None of that applies to a database-backed app, so reading it in full adds little. The product-relevant surface of the trade service is short: create, update, delete, duplicate; mark a trade reviewed and save its outcome-based answers; list the distinct instruments, accounts, setups, mistakes and tags; apply instrument specs to trades. The same holds for the account service: balances, cash events, rename (with references), delete, metrics.
