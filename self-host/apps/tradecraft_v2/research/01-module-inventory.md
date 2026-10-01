# Module inventory

Confidence: *Read* unless noted. "v1" is Tradecraft v1 on the `tradecraft` branch.

| Module | What it is for | v1 |
|---|---|---|
| **Trade** | One position: entries, exits (scaled in/out), costs, stop, targets, MAE/MFE, tags, review, images | Built (single and multi-leg, no MAE/MFE, no targets list, no dividends) |
| **Trade log** | Filterable table of all trades, saved filters, image gallery view | Partly (Trades list and filters) |
| **Missed trade** | A trade you saw and did not take: same shape as a trade plus a reason, kept apart from real P&L | None |
| **Backtest trade** | A simulated trade, same shape, kept apart so it never mixes with real results | v1 has a Backtest scope on trades |
| **Account** | A broker or prop account: type, balance, drawdown rule, target, monthly cost, currency, transactions, daily balances | Built (accounts, rules, balances) |
| **Account merge / copy trading** | Merge duplicate accounts; mark an account as a copy of another with a multiplier | None |
| **Prop challenge** | Multi-phase challenge on an account: rules per phase, live rule status, pass/fail, payouts, costs, ROI | Partial (rule status, breaches, Rule Replay); no phases, payouts or firm profiles |
| **Setup** (our "strategy") | A named playbook: status, direction, preferred sessions/timeframes/tickers, rules by category, linked notes | Built as Strategy (vocabulary, risk rules); no playbook or rule checklist |
| **Tags / mistakes** | Labels on trades; mistakes are a separate set | Built as Vocabulary (4 categories, mistake flag) |
| **Custom fields** | User-defined fields on trades (text, number, dropdown, multiselect, date/time) with validation | None |
| **Daily review** | The richest review, one per trading day | Built as a templated Review entry |
| **Weekly / monthly / quarterly / yearly reviews** | Roll-ups with stats, grades, mistakes, goals; can show what was written on lower levels | Built, but as separate aggregates (no quarterly, no inheritance) |
| **Review custom fields + groups** | Fields you define once and place on chosen review levels, with inheritance rules | None |
| **Review layout builder** | A review is an ordered list of widgets chosen from a catalog | Built as templates and blocks |
| **Review streaks** | Counts consecutive reviewed days, weeks, months, trades | None |
| **Session mode** | Live trading-day companion: windows, prep, live, break, ended | None |
| **Trade gate** | Pre-trade decision tree that ends in green light, wait or no trade | None |
| **Session log** | Timestamped, tagged notes during a session, merged with trade events | None |
| **Home dashboard** | Draggable widget grid: heatmap, streaks, score, account widgets, recent items | Built (Home, fixed layout) |
| **Analytics** | Charts and stats over filtered trades | Built (Analytics) |
| **Trading score** | One composite 0 to 100 score from six axes | None |
| **Key events / key levels / economic calendar** | Context for a day: events, price levels, calendar | None |
| **Trade import** | File upload with broker detection, mapping, preview, dedupe, commit | Not started (M4) |
| **Trade sync** | Pull trades from some brokers automatically (MetaTrader, Tradovate, Rithmic, cTrader) | Not started |
| **Share** | Share cards or images of results, share codes for templates | None |
| **Onboarding, guides, sample journal** | Tours, a fake journal to explore, release notes | None |
| **Image gallery / annotations** | Screenshots on trades with annotations | Not started (M4 uploads) |
| **Exchange rates / currencies** | Multi-currency P&L with conversion | None |
| **Notebook (free notes)** | Not a separate module here: notes attach to trades, days, setups and reviews, plus markdown zones inside reviews | Built as a standalone Notebook |
