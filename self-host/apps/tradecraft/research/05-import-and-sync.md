# Import and broker sync

Most of the RP's import and sync logic runs on its servers (a paid feature), so we can see the **contract** the plugin uses, not the parsers. Confidence: the contract is *read*, the server behaviour is *inferred* from it.

## Import pipeline (shape from the contract)

1. **Capabilities.** The client asks what the service supports: file size, row, column and cell limits; file types (csv, xlsx, xls, html); per broker: its adapter version, whether it can analyse a file, accepts manual mapping, supports AI mapping and an export time zone.
2. **Analyse.** The user uploads a file (and picks a broker and time zone). The service returns: the sheets (name, row-count bucket, column count, a category), a suggested sheet and header row, the headers and some sample rows, **broker candidates with a confidence and reasons**, **suggested column-to-field assignments with a confidence and a reason each**, and diagnostics.
3. **Mapping.** The user fixes the mapping. Manual modes: price-based (entry and exit prices), direct P&L (a result per row), or one trade per row. Required fields are validated before preview. User custom fields can be mapped too. Mappings can be saved as **templates** and shared by a code.
4. **Preview.** The service returns each trade it would create with: source row numbers, the normalised trade (symbol, direction, times, prices, quantity, status open/partly closed/closed/cancelled, optional fills, costs, instrument details, broker ids), plus a **classification and a default action** (see below).
5. **Commit.** The user confirms; chosen actions are applied. Each import has an id and can be removed later (server-side deletion is also reflected locally).

**Diagnostics** carry severity, a code, a message, row, field, an example value and candidate formats (for example for dates). Some codes say "this is the wrong report type" (for example a performance report instead of an executions export).

**Limits worth copying:** a cap on rows/columns/cells, a rate limit on free previews, and short retention of preview data.

## Duplicate and update classes (read) , the most useful idea

Every previewed trade is classed as one of:

- **new**
- **exact duplicate**, **already applied** (this import was done before), **duplicate within the import**
- **exists in another account** (and which)
- **likely duplicate**, **conflict**
- **update existing**, **partial update existing** (for example a trade imported open, now closed)
- **failed:** invalid trade, no open match, multiple open matches, quantity mismatch

and given a default action: **create, update, skip, manual review, blocked**, with decision reasons. Matching uses **identity candidates**: id type, value or hash, strength, cardinality and scope, so a stable broker execution id beats a fuzzy match on time and price.

Open-then-close handling matters: broker exports often give a fill that closes a position opened in an earlier import. "Close only" rows match to an open trade by account, symbol, direction and quantity, and fail loudly if zero or several match.

## Brokers listed in the README (read)

IBKR, Tradovate, TopStepX, TradeZero, TradingView, Bybit, BloFin, Hyperliquid, Sierra Chart, MotiveWave, FX Replay, ATAS, Trading Technologies, Rithmic, MetaTrader 4/5, plus others in code (cTrader, DeepCharts). That is the realistic target list for a futures-first tool: Tradovate, TopstepX, Rithmic, Sierra Chart, ATAS, TradingView, NinjaTrader (not listed).

## Broker sync (read, shape only)

- **Providers:** MetaTrader (through a managed FTP drop), Tradovate, Rithmic, cTrader.
- **How it works:** a job on the server pulls trades, the plugin polls for the job, then receives **projections**: canonical trade records with a version, a generation and an account identity (by broker id or by name). The plugin writes them into the vault and **acknowledges** each batch; unacknowledged items are retried from a queue. Restore and recovery paths exist, and server-deleted trades are mirrored locally.
- **Account mapping:** broker accounts are mapped to local accounts; unknown broker accounts raise a notice.
- **Idea to take:** a canonical, versioned trade record from the source, with an acknowledgement protocol, so sync is idempotent and resumable. The vault-writing and queueing in the RP exist because the plugin is not the system of record. In v2 the database is, so most of that disappears.

## For v2 (inferred)

- Import as a **two-step, reviewable operation**: analyse, map, preview with classification, commit. Keep it stateless on our side until commit.
- Our "AI mapping" suggestion (planned in v1 M4) matches the RP's analyse step; show confidence and reason per column.
- Deterministic broker adapters for the few brokers you use, with AI only as the fallback for unknown files. That keeps results explainable and avoids sending data out for known formats.
- Sync is a separate later module.
