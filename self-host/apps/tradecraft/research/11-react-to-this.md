# React to this

This replaces `08-open-questions.md`, whose questions needed domain knowledge to answer. Nothing here does. You react to something concrete, one number or one word per item is enough, and "I don't get it, show me" is a valid answer.

All numbers and quotes in the examples are made up to show the idea.

## Part 1: which story is closest to you? (one answer)

**A. The challenge racer.** You buy a prop evaluation, trade it hard, and your whole attention is on not breaking the daily loss and trailing drawdown rules and reaching the target. You may run several attempts a month. What you want to know at any moment: how close am I to a rule, and what went wrong when I failed?

**B. The few-trades day trader.** Two to five trades, flat by the close. You care whether you followed your plan. You review in the evening and want to see what you did well and what to change tomorrow.

**C. The many-trades scalper.** Dozens of trades a day. Single trades barely matter; patterns by time, setup and mood do. You review the day in aggregate, and tilt is your enemy.

**D. The part-timer or swing trader.** A few trades a week, held longer. The week is your unit of reflection, not the day.

**E. Something else / a mix.** Say how.

Why it matters: the reference product literally picks a different review rhythm (daily, weekly or monthly) from this one answer (see `10`). If you are A, the prop cockpit is the product and reviews are secondary. If you are B, reviews are the product. If you are C, analytics and tilt detection are. If you are D, the weekly review is.

## Part 2: ten ideas, in plain language (react to each)

Reply like "1 now, 2 later, 3 skip, 4 explain". Each has a small example. "Size" is rough build effort for us.

| # | Idea | In practice | Size |
|---|---|---|---|
| 1 | **Yesterday's focus shows up today.** The last question of each daily review is "what will I focus on next session". Tomorrow's review opens with your own answer at the top. | You write "stop adding to losers". Next morning, before you trade, that sentence is the first thing on the page. | S |
| 2 | **Plan down, reflect up.** Write a focus once for the month or week; every daily review shows it. The weekly review gathers the answers you gave on each day. | Monthly focus: "wait for candle-close". Each daily shows it. On Sunday the weekly lists Monday to Friday's lessons side by side. | M |
| 3 | **Grade the decision, not the result.** Each trade or day gets a process grade separate from P&L (executed the plan or not, mental state), and losses are labelled "valid loss" or "mistake". | A losing trade where you followed the rules reads "valid loss, no change". A winning trade where you chased reads "mistake". | S to M |
| 4 | **Mistake counter with a stop line.** Mistakes (chased entry, moved stop, oversized) are counted over the week or month; reaching a number you set says "stop trading". | "Moved stop" 6 times this month. The table shows six crosses and a red STOP TRADING cell. | S |
| 5 | **A pre-trade gate.** Before entering, you answer your own yes/no questions (is the setup valid, is risk defined, are conditions OK) and it tells you go, wait or no trade; each use is recorded. | At 09:40 you tap Start, answer three questions, get "wait". Later you can see how often you traded after a "wait". | M |
| 6 | **A live session log.** During the session you jot timestamped notes with a tag (analysis, psychology, lesson), mixed with your trade entries and exits; it warns when psychology notes dominate. | 10:12 "felt FOMO" (psychology), 10:14 entry. Review at night shows what you felt right before each trade. | M |
| 7 | **A prop challenge cockpit.** Phases, each rule with how close you are, warnings, "target reached, advance?", payouts ready, costs and return on the money spent. | "Daily loss: $620 of $1,000 used, $380 left." "Drawdown floor is now $48,300, $1,150 buffer." | L |
| 8 | **Import as a conversation.** Drop a broker file; the app asks only what it can't guess (ambiguous dates, wrong report), marks each trade new, duplicate or update, and after you confirm opens the right review. | "Your dates look like 03/04/2024. Which is it?" then "12 new, 3 already imported, 1 needs a look." | L |
| 9 | **Playbooks for your setups.** Each setup has a rule checklist; the app shows which setup earns, which combinations work together, how much of the available edge you captured, and flags setups you stopped trading or that lose. | "Trend pullback: 61% win, you took 7 of the 11 valid ones. Capture rate 64%." | M |
| 10 | **Missed trades count.** You log trades you saw but didn't take, with why, kept apart from real P&L, to see what hesitation costs. | "Missed 4 breakouts this week, all 'froze after a loss'. Would have been +$900." | S |

## Part 3: ideas that are ours, not the reference product's (the AI / MCP angle)

Nothing in the reference product does these. They are what could make v2 different. React the same way.

| # | Idea | In practice |
|---|---|---|
| A | **A draft review you only edit.** An agent reads your trades, session log and rules, and writes the daily review's first draft (what happened, which rules were close, which mistakes). You correct it. | You open the evening review and the three questions are half-answered from your own notes. |
| B | **Ask your journal anything.** From a chat or a coding agent, ask "why did I breach on Tuesday?" or "what do I do after two losses?" and get an answer from your real data. | "You took 4 trades in 6 minutes after the 2nd loss in 5 of your last 6 breaches." |
| C | **Rule Replay in the answer.** The "what would the day have looked like if I had stopped at the limit / skipped the rule-breaking trades" view (v1 already has this) is available to the agent, so it can show the cost of a breach in dollars. | "Stopping at the daily limit would have saved $1,240 this month." |
| D | **Log by talking.** "Log a long NQ at 21,450, stop 21,430, two contracts" creates the trade; a screenshot becomes a trade. | You log from the phone while the platform is busy. |
| E | **The gate, spoken.** The pre-trade gate is asked by an agent that knows your plan and your recent state. | "Third trade since the loss and 12 minutes later. Your gate says wait. Continue?" |
| F | **You stay in charge.** Anything an agent writes is a draft or goes through a scoped token you can revoke; the audit log shows what it touched. | v1 already has the token and audit foundations. |

## Part 4: three things to open and tell me where you stumble

1. The three diagrams in `diagrams/` (a trading day, importing, a prop challenge). Which step would you skip? Which step is missing?
2. `09-user-flows.md`, section 3 ("The trading day"). Is it close to how you actually work? Strike what you would never do.
3. Tradecraft v1 itself, for ten minutes (it runs locally). Tell me every "huh?". This is the cheapest source of truth we have, because you already felt things you could not name (the Review catalog, the Notebook).

## Part 5: how this settles "reuse v1 or restart" (my honest read, not a vote)

I can only decide this after your answers, because the answer depends on which ideas you keep:

| If you keep... | v1 gives you | v2 needs new |
|---|---|---|
| Ideas 1, 2, 3, 10 (the review loop) | the ledger, auth, audit, stats, review periods | a new review model (focus fields, inheritance, grades); v1's review templates and the Notebook would be reworked or dropped |
| Idea 7 (prop cockpit) | the rule engine, breaches, Rule Replay, daily floors | phases, scaling and payout rules; a much bigger rule model |
| Idea 8 (import) | nothing yet (not started in either) | all of it |
| Ideas 5, 6 (live session) | nothing | all of it |
| Ideas 9, 10 | accounts, strategies, tags, trades | execution-gap maths, pairs, missed-trade type |
| Part 3 (agents) | auth, scoped tokens, audit | an MCP surface, drafting, a query layer |

So reuse is likely for the **foundation** (data layer, auth, rules, replay, tests, design assets) whatever you choose, and the **review and notebook screens** are the part most likely to be rebuilt. A full restart only wins if you drop ideas that v1 already covers (7, 9, 10) and keep mostly new ones (5, 6, 8, A to E).
