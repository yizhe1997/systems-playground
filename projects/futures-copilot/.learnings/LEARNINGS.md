# Learnings

Corrections, insights, and knowledge gaps captured during development.

**Categories**: correction | insight | knowledge_gap | best_practice

---

## [LRN-20260418-001] best_practice

**Logged**: 2026-04-18T14:35:00Z
**Priority**: medium
**Status**: resolved
**Area**: backend

### Summary
Validate required request fields before touching the database in Fiber handlers.

### Details
Route-level tests for `draftTrade`, `journalTrade`, and `updateTradeStatus` showed that syntactically valid but empty JSON payloads could fall through into DB calls, causing nil-pool panics in tests and fragile runtime behavior.

### Suggested Action
Keep lightweight request validation in handlers (or shared validator helpers) so obviously incomplete payloads return `400` before repository/DB code runs.

### Metadata
- Source: error
- Related Files: backend/handlers_trades.go, backend/app_test.go, backend/trade_logic.go
- Tags: validation, fiber, backend, tests

### Resolution
- **Resolved**: 2026-04-18T14:40:00Z
- **Commit/PR**: local-working-tree
- **Notes**: Added request validation helpers and route tests covering the fast-fail path.

---
