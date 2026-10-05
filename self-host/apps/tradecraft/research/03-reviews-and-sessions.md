# Reviews, session mode, trade gate, session log

## The review levels form a chain (read)

Five levels: **daily, weekly, monthly, quarterly, yearly.** Each level has its own templates. A review is an ordered list of **widgets** picked from a catalog; some are automatic (computed from trades), some are things you fill in.

### Widgets (grouped by purpose)

| Purpose | Widgets |
|---|---|
| Plan | goals (checkboxes), checklist (pre-session), key levels, key events, previous-trading-day context (daily), the week's daily context (weekly) |
| Reflect (you write) | mental and technical grade, session mistakes, free markdown zones and section headers, charts and media, mark-as-reviewed |
| Trades | trade list, per-trade review, missed trades, backtest trades, best/worst trades, days, weeks, months, quarters |
| Numbers | stats grid, equity curve, drawdown (total, long, short, directional), P&L by trade/day/week/month/quarter, summary tables by period, account breakdown, setup performance, tag performance |
| Patterns | **demon tracker** (see below), "technical game" and "mental game" views (monthly and up) |
| Custom | review context fields (see below) |

Which widgets are available depends on the level. For example the session log and previous-day context exist only on daily; the demon tracker and the technical/mental views only on weekly and above.

### How the levels connect (read in logic, corrected 2026-10-01)

The context moves in **both directions**, by two different mechanisms.

**Top-down: planning context (read in the inheritance logic).** *Review custom fields* are fields you define once, for things like bias, focus, intent or a plan. Each field says which review levels can show it, which can edit it, and which lower levels it is **inherited into**. The sources a daily review can inherit from are its weekly, monthly, quarterly and yearly reviews, in that order; a weekly can inherit from monthly, quarterly and yearly; and so on. So you write "this month's focus" once on the monthly review, and each daily review shows it as read-only context, labelled with where it came from. A field can be inherit-only, local-only, or both (show the parent's value and let you write your own). Empty inherited values can hide. If the parent review does not exist yet, the widget says so instead of failing.

**Bottom-up: what actually happened (read in the weekly widget).** A weekly review has a widget that lists the week's daily reviews by weekday (or one chosen day). For each day it pulls out the sections (headings) you configured, such as a lessons section, and shows them read-only in a collapsible row, with that day's reviewed status. The monthly and higher levels use automatic numbers instead: best and worst weeks or months, summaries by week or month, and the grade distributions below.

**The daily also looks backwards:** a "previous trading day" widget shows chosen sections from the previous daily review, with a choice of fallback (the nearest earlier daily, or only the expected previous trading day).

**Streaks** count consecutive reviewed units (trades, days, weeks, months). The current unit being still open does not break a streak. The home widget words it as "N days reviewed in a row" or "missed N days since your last review".

So the point of the levels: **plan down, reflect up.** You set direction at the longer horizon, the daily review keeps it in front of you, and the longer reviews pull what you wrote on the dailies back together.

**Review notes are documents.** In the RP a review is a note with an ordered list of widgets, some automatic and some places to write. Headings and free markdown zones sit between them. A layout can preset text for new reviews. New reviews can be created automatically when the first trade of a period is logged, or when you navigate to one.

**What fills them in automatically:** recurring goals and a pre-trade checklist copied into every new daily review (editable per day), review questions, forecast timeframes, and key events imported weekly from an economic calendar feed.

### Demon tracker (read)

Counts how often a named recurring mistake happens in the period, with a stop threshold (a count between 2 and 9, default 6) after which it flags. Three ways of counting: by trade occurrences, by trading days affected, or by daily-review entries.

### Grades (read)

A mental grade and a technical grade per review, either letters or numbers.

## Session mode (read)

A live companion for the trading day.

- **Windows:** named time windows (start, end; an end earlier than the start means it runs past midnight). A **preparation lead time** opens a prep period before each window.
- **Phases:** unconfigured, waiting, preparation, live, break, ended. The screen shows different modules in each of preparation, live and ended, and the user can choose which modules and in what order (preparation resources, goals, checklist, trade gate, timeline, ended actions, ended stats).
- **Unplanned sessions:** start and stop on demand with a reason, so off-schedule trading is recorded too.
- **Resources:** linked notes shown during preparation.
- **Trading day:** a session belongs to a trading day, which can start in the evening of the previous calendar day.

## Trade gate (read)

A pre-trade decision tree the trader builds.

- **Questions:** a title, a prompt, and a few options (usually Yes/No).
- **Workflow:** nodes (each is a question), routes (answer leads to the next node or to an outcome), a start node.
- **Outcomes:** **green-light**, **wait**, **no-trade**, each with a note.
- **Run record:** every use is stored: the workflow, start and finish time, each answer with its time, the outcome, and a status (in progress, completed, abandoned). So the journal can later show how often a trade was taken after a "wait" or "no-trade".
- **Starter set:** three questions (valid setup per plan, risk defined, conditions acceptable) chained in that order.

## Session log (read)

- **Entries:** timestamp, a tag, free text, "resolved" and "promoted" flags.
- **Default tags:** analysis, market, trade, psychology, lesson, uncategorized. "Uncategorized" must be resolved later; "lesson" can be promoted (to a longer-lived note, inferred).
- **Alert rule:** warn if one tag dominates, by default psychology at 3 or more entries and 40 percent of the log. This is a tilt signal.
- **Timeline:** manual entries and trade entry/exit events share one timeline.

## What this suggests for v2 (inferred, not decided)

1. Reviews as a **two-way chain** is the idea worth taking: plan flows down (a monthly or weekly focus shows on each daily), reflection flows up (the weekly pulls chosen sections from its dailies). Our v1 treated each period as a separate aggregate with neither.
2. Session mode and the trade gate are the **process-discipline** part of the product. They are optional but are where a self-hosted AI/MCP version could add the most: an agent could run the gate, read the log, and write the daily review draft.
3. The widget catalog is large because the RP is a general layout tool. v2 does not need 30 widgets to deliver the cascade.
