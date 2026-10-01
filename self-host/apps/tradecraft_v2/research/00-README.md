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

## Files

| File | Contents |
|---|---|
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
