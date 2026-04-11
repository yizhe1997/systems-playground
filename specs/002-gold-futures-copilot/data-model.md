# Phase 1 Data Model — Gold Futures Trading Copilot

## Scope Note

- This data model is implemented within `projects/gold-futures-copilot/`.
- Schema ownership belongs to the project backend and project contracts.
- Platform-root integration must consume project interfaces/contracts only (no deep internal imports).

## 1) TradePlan

Represents creator-authored pre-trade intent.

**Fields**
- `id` (UUID, PK)
- `instrument` (enum, v1 fixed: `GC`)
- `session_date` (date)
- `bias` (enum: `long`, `short`, `neutral`)
- `entry_low` (decimal)
- `entry_high` (decimal)
- `stop_loss` (decimal)
- `take_profit_1` (decimal)
- `take_profit_2` (decimal, nullable)
- `take_profit_3` (decimal, nullable)
- `scaling_plan` (jsonb)
- `invalidation_notes` (text)
- `creator_notes` (text)
- `status` (enum: `draft`, `graded`, `published`, `closed`, `archived`)
- `strategy_origin` (enum: `human`, `ai`)
- `rubric_version_id` (UUID, FK)
- `latest_evaluation_id` (UUID, nullable FK)
- `published_at` (timestamp, nullable)
- `created_at`, `updated_at` (timestamp)

**Validation rules**
- For `long`: `stop_loss < entry_low` and `take_profit_1 > entry_high`.
- For `short`: `stop_loss > entry_high` and `take_profit_1 < entry_low`.
- Entry range must be valid: `entry_low <= entry_high`.

## 2) RubricVersion

Versioned grading rubric.

**Fields**
- `id` (UUID, PK)
- `name` (text)
- `version` (integer)
- `approval_threshold` (integer 0-100)
- `is_active` (boolean)
- `created_by` (UUID)
- `created_at` (timestamp)

## 3) RubricRule

Weighted criteria under a rubric version.

**Fields**
- `id` (UUID, PK)
- `rubric_version_id` (UUID, FK)
- `rule_key` (text, unique per rubric)
- `description` (text)
- `weight` (numeric)
- `evaluation_type` (enum: `boolean`, `range`, `formula`, `heuristic_hint`)
- `rule_config` (jsonb)

## 4) AIEvaluation

Result of pre-trade grading or post-trade retrospective.

**Fields**
- `id` (UUID, PK)
- `trade_plan_id` (UUID, FK)
- `evaluation_type` (enum: `pre_trade`, `post_trade`)
- `decision` (enum: `approve`, `revise`, `reject`)
- `overall_score` (integer 0-100)
- `rule_scores` (jsonb)
- `risk_flags` (jsonb)
- `recommendations` (jsonb)
- `public_explanation` (text)
- `creator_explanation` (text)
- `model_name` (text)
- `prompt_snapshot` (jsonb)
- `retrieval_context_ids` (uuid[])
- `created_at` (timestamp)

## 5) TradeOutcome

Post-trade execution/result journal.

**Fields**
- `id` (UUID, PK)
- `trade_plan_id` (UUID, FK unique)
- `entry_price` (decimal)
- `exit_price` (decimal)
- `position_size` (decimal)
- `mae` (decimal, max adverse excursion)
- `mfe` (decimal, max favorable excursion)
- `realized_pnl` (decimal)
- `realized_r` (decimal)
- `outcome_tag` (enum: `win`, `loss`, `breakeven`, `partial`)
- `creator_notes` (text)
- `closed_at` (timestamp)

## 6) PortfolioSnapshot

Deterministic performance checkpoints used for analytics and prompt context.

**Fields**
- `id` (UUID, PK)
- `as_of` (timestamp)
- `equity` (decimal)
- `daily_pnl` (decimal)
- `weekly_pnl` (decimal)
- `monthly_pnl` (decimal)
- `open_risk` (decimal)
- `win_rate` (decimal)
- `expectancy_r` (decimal)
- `max_drawdown` (decimal)
- `trade_count` (integer)

## 7) MemoryRecord

Retrieval-ready chunk for AI context from plans/outcomes/lessons.

**Fields**
- `id` (UUID, PK)
- `source_type` (enum: `trade_plan`, `trade_outcome`, `lesson`)
- `source_id` (UUID)
- `content` (text)
- `metadata` (jsonb)
- `embedding` (vector)
- `embedding_model` (text)
- `created_at` (timestamp)

## 8) Subscription

Subscriber entitlement state.

**Fields**
- `id` (UUID, PK)
- `user_id` (UUID)
- `tier` (enum, v1 fixed: `premium`)
- `status` (enum: `active`, `paused`, `revoked`, `expired`)
- `starts_at` (timestamp)
- `ends_at` (timestamp)
- `managed_by` (UUID, creator/admin)
- `notes` (text)

## 9) AlertChannel

Per-subscriber delivery target.

**Fields**
- `id` (UUID, PK)
- `user_id` (UUID)
- `channel_type` (enum: `telegram`, `discord`, `webhook`)
- `destination` (text)
- `is_verified` (boolean)
- `is_enabled` (boolean)
- `created_at` (timestamp)

## 10) AlertEvent & AlertDelivery

Publisher events and fanout outcomes.

**AlertEvent fields**
- `id` (UUID, PK)
- `trade_plan_id` (UUID, FK)
- `event_type` (enum: `setup_published`, `entry_hit`, `tp_hit`, `sl_hit`, `invalidation`, `status_update`)
- `dispatch_mode` (enum: `auto_sent`, `manual_confirmed`)
- `audience_scope` (enum: `public`, `paid`)
- `payload` (jsonb)
- `created_at` (timestamp)

**AlertDelivery fields**
- `id` (UUID, PK)
- `alert_event_id` (UUID, FK)
- `alert_channel_id` (UUID, FK)
- `status` (enum: `queued`, `sent`, `failed`, `retrying`)
- `attempt_count` (integer)
- `last_error` (text, nullable)
- `delivered_at` (timestamp, nullable)

## Relationships

- `TradePlan` 1—N `AIEvaluation`
- `TradePlan` 1—1 `TradeOutcome` (once closed)
- `RubricVersion` 1—N `RubricRule`
- `TradePlan` N—1 `RubricVersion`
- `User` 1—N `Subscription`
- `User` 1—N `AlertChannel`
- `AlertEvent` 1—N `AlertDelivery`

## State Transitions

### TradePlan status
`draft -> graded -> published -> closed -> archived`

Allowed exceptions:
- `graded -> draft` (for revisions)
- `published -> graded` (if unpublished and re-reviewed)

### Subscription status
`active -> paused -> active`
`active -> revoked`
`active -> expired`

### AlertDelivery status
`queued -> sent`
`queued -> failed`
`failed -> retrying -> sent|failed`
