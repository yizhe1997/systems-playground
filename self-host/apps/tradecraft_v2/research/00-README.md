# v2 research: study of a reference product

**Status:** first pass, 2026-10-01. Nothing here is a decision. It is notes for the v2 spec.

## What this is

Tradecraft v1 (`../tradecraft`) was designed from a thin knowledge of the domain. For v2 the plan is a
self-hosted, AI/MCP-friendly trading journal. To fill the domain gap we read a mature, public trading journal
(called **the reference product**, "RP", in these files) and wrote down, in our own words:

- what modules it has and what each is for,
- the data it keeps for each thing (fields, states, rules),
- the calculations and workflows behind the screens,
- where Tradecraft v1 already matches, differs, or has nothing.

## Rules for these notes

1. **Own words only.** No code, no UI copy, no names copied. Describe behaviour and data, then name things our own way in the v2 spec.
2. **Behaviour over layout.** We record what a module does and why a trader wants it, not how the RP lays out its files or screens. v2's modules come from the spec, not from the RP's directory tree.
3. **Mark confidence.** *Read* = taken from types or logic we read. *Inferred* = my reading of intent. *Unknown* = not visible (for example anything that runs on the RP's own servers).
4. The RP is an Obsidian plugin: notes and trades are files in a vault, and its paid import and sync logic runs on its servers, so that logic is not visible to us. v2 is a web app on Postgres, so every storage detail here is conceptual only.

## Coverage ledger (second pass, 2026-10-01)

The first pass was a skim of type definitions. The second pass read much more. This is what has and has not been read, so you know what to trust.

**Read in full or nearly so**
- The type definitions for trades, accounts, setups, prop challenges (rules, phases, payouts, policy revisions), reviews, review custom fields, session mode, trade gate, session log, import, and templates.
- About 6,000 interface strings from the English language file: every screen, setting, notice, tooltip, empty state and guided tour. This is the product describing itself, and it is where the user flows in `09` come from. Roughly a fifth of the file did not parse into keys and was not read.
- The tour definitions for each screen.
- Built-in review layouts for every level, the default settings (home, navigation, quick links, review questions, checklists), the first-run personalisation rules, the sample journal's content (accounts, setups, mistakes, reviews, custom fields), and the demon tracker and grade widgets' behaviour.
- Logic: review context inheritance, the weekly widget that pulls daily sections, trading-day cutoff, break-even classification, trade P&L calculation (costs, direct P&L, dividends), the prop rule engine's result types, drawdown evaluation (static, end-of-day and intraday trailing, lock, payout effects) and daily loss evaluation (tiers, scaling, soft versus hard breach), the trading score tables, session-phase resolution, review streaks (head only).

**Not read (so treat related claims as inferred)**
- The setup service and its execution-gap calculation (known from the screen text and a formula tooltip, not the code), the missed and backtest services, the demon tracker's exact counting rules, the payout engine, the profit-target, consistency and position-size rule evaluation, the import and sync services (the parsers run on the product's servers anyway), and the trade and account services (about 340 KB together, mostly file-handling plumbing that does not apply to a database app; only their method lists were read), the economic calendar service, share cards, and all of the 569 interface components and the settings code.
- Anything about how it *feels* to use. We have text and logic, not screenshots in motion.

**Corrections made in this pass**
- Review inheritance runs top-down (a daily shows its parents' planning fields), with the weekly pulling chosen sections up from its dailies. The first pass had the direction backwards. See `03`.

## Files

| File | Contents |
|---|---|
| `11-react-to-this.md` | **Start here.** Concrete stories and ideas to react to, instead of abstract questions |
| `10-philosophy-and-defaults.md` | The idea the product is built around, what it does by default, the sample journal's story |
| `09-user-flows.md` | The product's flows step by step: first run, accounts, a trading day, reviews, import, prop challenge, setups, filters |
| `diagrams/*.html` | Interactive diagrams of the trading day, the import pipeline and the prop challenge lifecycle (open in a browser) |
| `01-module-inventory.md` | Every module, one line each, with its status in v1 |
| `02-domain-model.md` | Trade, account, setup, tags, custom fields: what is stored |
| `03-reviews-and-sessions.md` | Review cascade, widget catalog, session mode, trade gate, session log |
| `04-prop-challenges.md` | Phases, rule kinds, payouts, policy history, firm profiles |
| `05-import-and-sync.md` | Import pipeline, duplicate classes, broker sync shape |
| `06-analytics-and-scoring.md` | Dashboard widgets, trading score, streaks, drawdown, setups analytics |
| `07-gap-analysis.md` | RP vs Tradecraft v1, and what to recycle from v1 |
| `08-open-questions.md` | Decisions for the owner, in the order they block the spec |

Real provenance (product name, repo, licence, commit studied) is recorded in the vault note
"Reference product study", not here.
