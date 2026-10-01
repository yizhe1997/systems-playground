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

### How the levels connect (read)

- A **weekly** review can show the context of that week's dailies.
- **Review custom fields** are fields you define once, then place on chosen levels. Each field says where it can be edited and where it is *inherited to*. A field written on the daily can appear read-only on the weekly and monthly ("inherit only"), be local to one level, or both. Groups organise the fields. Empty inherited fields can hide.
- **Streaks** count consecutive reviewed days, weeks, months and trades, with options to skip weekends and set the week start.
- **Review-needed signal:** the dashboard has an "unreviewed trades" widget, and an import hands off to "review now" for the new trades.

So the answer to "what is the point of the higher levels" is: the daily is where you reflect in detail, and the higher levels are summaries that carry the daily's context and numbers upward, so patterns across days are visible without rewriting.

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

1. Reviews as a **cascade** with per-field inheritance is the idea worth taking. Our v1 treated each period as a separate aggregate.
2. Session mode and the trade gate are the **process-discipline** part of the product. They are optional but are where a self-hosted AI/MCP version could add the most: an agent could run the gate, read the log, and write the daily review draft.
3. The widget catalog is large because the RP is a general layout tool. v2 does not need 30 widgets to deliver the cascade.
