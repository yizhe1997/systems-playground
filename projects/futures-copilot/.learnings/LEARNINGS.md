# Learnings

Corrections, insights, and knowledge gaps captured during development.

**Categories**: correction | insight | knowledge_gap | best_practice

---

## [LRN-20260418-002] correction

**Logged**: 2026-04-18T00:00:00Z
**Priority**: medium
**Status**: pending
**Area**: frontend

### Summary
AI configuration belongs in app settings, not the trading account panel.

### Details
The trading account panel is for prop-firm or brokerage account parameters, while AI routing/provider configuration is global application behavior. The user corrected this distinction and requested that AI provider/model assignment live in `/settings` and be configurable per feature.

### Suggested Action
Keep AI execution actions near their features, but centralize AI routing/configuration in admin settings and model assignment per feature.

### Metadata
- Source: user_feedback
- Related Files: frontend/src/app/settings/page.tsx, frontend/src/app/dashboard/components/panels/AccountPanel.tsx
- Tags: ui-architecture, ai-config, admin-settings

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

## [LRN-20260425-003] correction

**Logged**: 2026-04-25T06:00:00Z
**Priority**: high
**Status**: pending
**Area**: backend

### Summary
Do not globally force provider routing in a way that breaks unrelated model flows.

### Details
User clarified the goal was to ensure BYOK usage for Google AI Studio routing via `provider.only`, not to unintentionally break free/non-Google model behavior. Prior implementation forced routing too broadly and caused regressions.

### Suggested Action
Apply `provider.only` via env-configured OpenRouter payload routing with scoped behavior (`OPENROUTER_PROVIDER_ONLY_GOOGLE_MODELS`) so only Google-family model slugs are restricted to Google AI Studio.

### Metadata
- Source: user_feedback
- Related Files: backend/ai_extraction.go, backend/.env, backend/.env.example
- Tags: openrouter, byok, provider-routing, regression-prevention

---
