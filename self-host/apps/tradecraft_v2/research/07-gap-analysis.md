# Gap analysis: the reference product vs Tradecraft v1, and what to recycle

## Where v1 matches

Trades with scaled fills and R, accounts and rule status, strategy vocabulary and tag analytics, templated reviews at four levels, a Home dashboard, an Analytics screen with ratios and drawdown, daily notes, a Deleted-trades bin, audit log, single-owner auth.

## Where the RP has something v1 does not

| Area | RP idea | Weight for v2 |
|---|---|---|
| Review cascade | Fields and context inherit from daily up to yearly | High: this is what makes the higher levels worth having |
| Reflection | Mental and technical grades; demon tracker for recurring mistakes | High: cheap to build, directly useful |
| Process | Session mode, trade gate, session log with tilt alert | High if you trade live and want discipline support; also the best AI/MCP hook |
| Missed trades | First class, with a reason, kept out of P&L | Medium |
| Setup playbook | Rule checklist per setup, preferred sessions and tickers, linked notes | Medium |
| Setup analytics | Missed vs live vs backtest, pairs of setups, inactivity | Medium |
| Prop challenges | Phases, scaling, payouts, policy history, costs, ROI, alerts | Depends on how many prop accounts you run |
| Custom fields | User-defined trade fields, filterable | Medium |
| Import | Analyse then preview with duplicate classes and update-in-place | High: needed anyway; the classification list is the main idea |
| Trade form | MAE/MFE, take-profit targets, dividends, options and forex details | Low for futures-only |
| Score | Composite trading score | Low, nice later |
| Multi-currency, copy trading, account merge | | Low unless you need them |
| Onboarding, sample journal, share cards | | Low (single owner) |

## Where v1 has something the RP does not

- Rule Replay and Edge Leak.
- Breach events with a notes thread.
- Audit log, step-up for identity changes, service-token auth and a hardened BFF.
- Self-hosting, Postgres, an OpenAPI contract: the whole point of v2.
- Honest empty states and "dash and say why" for ratios that cannot be computed.

## Recycle from v1 (proposal)

| Piece | Verdict |
|---|---|
| `internal/ledger`, `internal/replay`, `internal/rules`, `internal/stats`, `internal/reviewperiod` | Keep: domain-correct and tested. Extend the rules engine toward phases and payouts if prop accounts matter. |
| Auth, service token, audit, `inTx` helpers, test harness (`scripts/test-backend.sh`) | Keep as is. |
| Migrations | Keep as a starting point; v2 will reshape review and notebook tables. |
| `contracts/openapi.yaml` | Keep; it grows with the new modules. |
| Design: logo kit, tokens, Penpot flows | Keep. The flows are the product-flow baseline until v2 changes them. |
| `docs/domain.md`, `docs/security-review.md`, gates, decision logs | Keep. |
| Review templates and blocks (backend and UI) | Rework around the cascade; likely replaced. |
| Notebook | Rework or drop (RP has no standalone notebook). |
| Frontend pages | Reuse the shell, sign-in, Accounts, Trades, Strategies; rebuild Review, Notebook, Home on the new spec. |
| Fixtures `import.ts`, `strategies.ts` | Discard. |

## What the RP's design suggests about product shape (inferred)

It is a **module-rich, widget-driven** journal for people who want to build their own layouts. Tradecraft v1 went for fixed screens. For a single self-hosted owner, fixed screens plus a short list of well-chosen modules is the better fit. The widget builder is the most expensive part of the RP and the least necessary for one person.
