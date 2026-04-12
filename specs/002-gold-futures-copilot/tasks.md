# Tasks: AI-Powered Gold Futures Trading Copilot and Signal Journal

**Input**: Design documents from `/specs/002-gold-futures-copilot/`  
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

**Tests**: No mandatory test-first requirement was explicitly requested in the spec. This task list focuses on implementation and validation checkpoints from `quickstart.md`.

**Organization**: Tasks are grouped by user story for independent implementation and verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (`US1`, `US2`, `US3`, `US4`)
- All paths are project-scoped under `projects/gold-futures-copilot/` unless explicitly marked as platform integration.

## Path Conventions

- **Project Backend**: `projects/gold-futures-copilot/backend/`
- **Project Frontend**: `projects/gold-futures-copilot/frontend/`
- **Project Contracts**: `projects/gold-futures-copilot/contracts/`
- **Project Tests**: `projects/gold-futures-copilot/tests/`
- **Project Scripts**: `projects/gold-futures-copilot/scripts/`
- **Project BFF/Proxy**: `projects/gold-futures-copilot/frontend/src/app/api/proxy/`
- **Platform Integration Touchpoints**: CMS-managed project catalog registration plus root compose/docs only where needed

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize project module layout and baseline config.

- [X] T001 Initialize project scaffold by creating `projects/gold-futures-copilot/README.md` and sibling folders copied from `projects/_template/`.
- [X] T002 [P] Add project documentation skeleton in `projects/gold-futures-copilot/README.md` and `projects/gold-futures-copilot/ARCHITECTURE.md` aligned to `docs/MONOREPO_GUIDE.md`.
- [X] T003 [P] Add `projects/gold-futures-copilot/.env.example` with DB, Redis, Redpanda, auth, AI provider, and alert channel variables.
- [X] T004 Add `projects/gold-futures-copilot/docker-compose.project.yml` for project services and integration notes.
- [X] T005 [P] Add project run/test helper scripts in `projects/gold-futures-copilot/scripts/dev.sh` and `projects/gold-futures-copilot/scripts/test.sh`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core foundations that block all user stories until complete.

**⚠️ CRITICAL**: No user story implementation starts before this phase is complete.

- [X] T006 Implement backend app bootstrap in `projects/gold-futures-copilot/backend/main.go` (wiring only).
- [X] T007 [P] Implement project config loader in `projects/gold-futures-copilot/backend/pkg/config/config.go` for env validation.
- [X] T008 [P] Implement DB connectivity and migration bootstrap in `projects/gold-futures-copilot/backend/pkg/platform/db/postgres.go`.
- [X] T009 [P] Implement Redis and Redpanda client wrappers in `projects/gold-futures-copilot/backend/pkg/platform/cache/redis.go` and `projects/gold-futures-copilot/backend/pkg/events/redpanda.go`.
- [X] T010 Implement base PostgreSQL schema migration in `projects/gold-futures-copilot/backend/migrations/0001_init.sql`.
- [X] T011 [P] Implement creator/admin auth middleware in `projects/gold-futures-copilot/backend/pkg/auth/creator_middleware.go`.
- [X] T012 [P] Implement subscriber entitlement middleware in `projects/gold-futures-copilot/backend/pkg/auth/subscriber_middleware.go`.
- [X] T013 Implement standardized API error model and logging middleware in `projects/gold-futures-copilot/backend/pkg/http/middleware.go`.
- [X] T014 Create project API contract files in `projects/gold-futures-copilot/contracts/` from spec contracts (`api.yaml`, `events.md`).
- [X] T015 Coordinate platform project registration through the CMS-managed catalog; do not hardcode entries in `frontend/src/app/projects/page.tsx` or import project internals.

**Checkpoint**: Foundation complete — user stories can proceed independently.

---

## Phase 3: User Story 1 — Creator Plans, Grades, and Publishes Setups (Priority: P1) 🎯 MVP

**Goal**: Creator can create plans, grade against rubric+math+retrieval context, and publish approved setups.

**Independent Test**: Execute plan→grade→publish flow from project creator UI and verify approved-only publishing.

### Implementation for User Story 1

- [X] T016 [P] [US1] Implement `TradePlan`, `RubricVersion`, `RubricRule`, and `AIEvaluation` repositories in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/repository.go`.
- [X] T017 [P] [US1] Implement deterministic risk/performance math module in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/metrics.go`.
- [X] T018 [P] [US1] Implement rubric evaluation adapter/service in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/rubric.go`.
- [X] T019 [P] [US1] Implement retrieval orchestration interface for similar history lookup in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/retrieval.go`.
- [X] T020 [US1] Implement grading orchestration service (`draft -> graded`) in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/service.go`.
- [X] T021 [US1] Implement publish guard logic (approval threshold enforcement + state transition rules) in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/service.go`.
- [X] T022 [US1] Implement creator handlers/routes for create plan, grade, and publish in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/handler.go`.
- [X] T066 [US1] Implement explicit creator/public explanation split for FR-014 in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/service.go` and expose both fields in `projects/gold-futures-copilot/contracts/api.yaml`.
- [X] T023 [P] [US1] Implement creator pages in `projects/gold-futures-copilot/frontend/src/app/creator/plans/page.tsx`, `review/page.tsx`, `publish/page.tsx`.
- [X] T024 [P] [US1] Implement creator UI components/forms in `projects/gold-futures-copilot/frontend/src/components/tradingcopilot/TradePlanForm.tsx` and `projects/gold-futures-copilot/frontend/src/components/tradingcopilot/GradeReviewPanel.tsx`.
- [X] T025 [US1] Add creator BFF routes in `projects/gold-futures-copilot/frontend/src/app/api/proxy/creator/trade-plans/route.ts`, `projects/gold-futures-copilot/frontend/src/app/api/proxy/creator/grade/route.ts`, and `projects/gold-futures-copilot/frontend/src/app/api/proxy/creator/publish/route.ts`.
- [X] T026 [US1] Emit `trade_plan_graded` and `trade_plan_published` events in `projects/gold-futures-copilot/backend/pkg/events/redpanda.go`.
- [X] T057 [US1] Add strategy origin schema migration in `projects/gold-futures-copilot/backend/migrations/0002_strategy_origin.sql`.
- [X] T058 [US1] Persist and validate `strategy_origin` in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/repository.go` and `projects/gold-futures-copilot/backend/pkg/tradingcopilot/service.go`.
- [X] T059 [US1] Expose `strategy_origin` in `projects/gold-futures-copilot/contracts/api.yaml` and `projects/gold-futures-copilot/backend/pkg/tradingcopilot/handler.go`.

**Checkpoint**: US1 is functional and demoable as MVP.

---

## Phase 4: User Story 2 — Anonymous Showroom Builds Trust (Priority: P2)

**Goal**: Anonymous users can view historical performance and masked latest setup preview.

**Independent Test**: Open showroom unauthenticated and verify public-only data with masking behavior.

### Implementation for User Story 2

- [X] T027 [P] [US2] Implement showroom read models/query service (performance summary + active preview + latest closed fallback) in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/service.go`.
- [X] T028 [US2] Implement masking policy service for anonymous-visible setup fields in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/service.go`.
- [X] T029 [US2] Implement public showroom endpoint handler in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/handler.go`.
- [X] T030 [US2] Implement showroom page in `projects/gold-futures-copilot/frontend/src/app/showroom/page.tsx`.
- [X] T031 [P] [US2] Implement showroom presentation components/charts in `projects/gold-futures-copilot/frontend/src/components/tradingcopilot/ShowroomCharts.tsx`.
- [X] T032 [US2] Add showroom BFF route in `projects/gold-futures-copilot/frontend/src/app/api/proxy/showroom/summary/route.ts`.

**Checkpoint**: US2 public funnel works independently.

---

## Phase 5: User Story 3 — Paid Members Receive Timely Alert Updates (Priority: P3)

**Goal**: Paid subscribers can configure channels and receive semi-automatic alert dispatches.

**Independent Test**: Configure Telegram/Discord/webhook channel and verify dispatch + per-channel status logging.

### Implementation for User Story 3

- [X] T033 [P] [US3] Implement `Subscription`, `AlertChannel`, `AlertEvent`, `AlertDelivery` repositories in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/repository.go`.
- [X] T034 [US3] Implement manual subscription lifecycle service (grant/revoke/renew) in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/service.go`.
- [X] T035 [US3] Implement channel management service (telegram/discord/webhook) in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/alerts.go`.
- [X] T036 [US3] Implement semi-automatic dispatch policy logic (auto-send vs confirm-before-send) in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/alerts.go`.
- [X] T037 [US3] Implement alert fanout workers and delivery status recording in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/alerts.go`.
- [X] T038 [US3] Implement subscriber-facing handlers/routes for channel config and entitlement-checked views in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/handler.go`.
- [X] T039 [P] [US3] Implement subscriber alert channel settings UI in `projects/gold-futures-copilot/frontend/src/components/tradingcopilot/AlertChannelSettings.tsx` and page `projects/gold-futures-copilot/frontend/src/app/subscriber/alerts/page.tsx`.
- [X] T040 [US3] Add BFF routes in `projects/gold-futures-copilot/frontend/src/app/api/proxy/subscriber/alert-channels/route.ts` and `projects/gold-futures-copilot/frontend/src/app/api/proxy/creator/status/route.ts`.
- [X] T041 [US3] Emit and consume alert events in `projects/gold-futures-copilot/backend/pkg/events/redpanda.go` and `projects/gold-futures-copilot/backend/pkg/tradingcopilot/alerts.go`.

**Checkpoint**: US3 channel setup and delivery lifecycle work independently.

---

## Phase 6: User Story 4 — Post-Trade Journal Improves Future Decisions (Priority: P4)

**Goal**: Creator submits outcomes; system updates deterministic portfolio stats and generates retrospective with memory updates.

**Independent Test**: Submit outcome for closed plan and verify portfolio snapshot changes + retrospective response.

### Implementation for User Story 4

- [X] T042 [P] [US4] Implement `TradeOutcome`, `PortfolioSnapshot`, and `MemoryRecord` repository operations in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/repository.go`.
- [X] T043 [US4] Implement outcome ingestion and state transition logic (`published/graded -> closed`) in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/service.go`.
- [X] T044 [US4] Implement portfolio recomputation pipeline in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/metrics.go`.
- [X] T045 [US4] Implement post-trade retrospective prompt assembly and evaluation persistence in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/service.go`.
- [X] T046 [US4] Implement memory record chunking + embedding upsert orchestration in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/retrieval.go`.
- [X] T047 [US4] Implement post-trade handler/route in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/handler.go`.
- [X] T048 [P] [US4] Implement creator journal page and components in `projects/gold-futures-copilot/frontend/src/app/creator/journal/page.tsx` and `projects/gold-futures-copilot/frontend/src/components/tradingcopilot/JournalForm.tsx`.
- [X] T049 [US4] Add outcome/retrospective BFF routes in `projects/gold-futures-copilot/frontend/src/app/api/proxy/creator/outcome/route.ts` and `projects/gold-futures-copilot/frontend/src/app/api/proxy/creator/retrospective/route.ts`.
- [X] T050 [US4] Emit `trade_outcome_recorded` and `memory_record_upserted` events in `projects/gold-futures-copilot/backend/pkg/events/redpanda.go`.

**Checkpoint**: US4 journaling and learning loop are independently functional.

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: Hardening and integration across stories.

- [X] T051 [P] Add audit-trail coverage in `projects/gold-futures-copilot/backend/pkg/audit/audit.go` for rubric, grading, publish, and dispatch actions.
- [X] T052 [P] Add input validation and error-envelope consistency in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/handler.go` and `projects/gold-futures-copilot/backend/pkg/http/errors.go`.
- [X] T053 [P] Update `projects/gold-futures-copilot/README.md` and `ARCHITECTURE.md` with final run/test/contracts and extraction notes.
- [X] T054 Update project quickstart/run scripts in `projects/gold-futures-copilot/scripts/` to reflect implemented flows.
- [X] T055 [P] Update platform docs integration notes in `docs/DEVELOPER_GUIDE.md`.
- [X] T056 Run end-to-end validation from `specs/002-gold-futures-copilot/quickstart.md` and capture results in `projects/gold-futures-copilot/README.md`.
- [X] T060 [P] Add alert dispatch latency metrics for SC-003 in `projects/gold-futures-copilot/backend/pkg/observability/metrics.go`.
- [X] T064 [P] Add grading latency metrics for SC-002 in `projects/gold-futures-copilot/backend/pkg/observability/metrics.go` (track request start/end and p95).
- [X] T065 Add SC-002 SLO verification script in `projects/gold-futures-copilot/tests/perf/grading_latency_slo.sh` and document threshold checks in `projects/gold-futures-copilot/README.md`.
- [X] T061 Add SC-003 SLO verification script in `projects/gold-futures-copilot/tests/perf/alert_dispatch_slo.sh` and document threshold checks in project docs.
- [X] T062 [P] Add showroom success/error telemetry for SC-004 in `projects/gold-futures-copilot/frontend/src/app/showroom/page.tsx` and `projects/gold-futures-copilot/backend/pkg/observability/metrics.go`.
- [X] T063 Add journal timeliness tracking for SC-005 in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/service.go` and reporting query in `projects/gold-futures-copilot/backend/pkg/tradingcopilot/repository.go`.

---

## Phase 8: Design Integration (UI/UX Polish)

**Purpose**: Replace bare HTML with premium trading dashboard design generated by v0.

**Reference**: `design-v0.md` contains the complete design specification with color palette, layouts, and all page requirements.

- [X] T067 [P] Create shared layout component with left sidebar nav and theme toggle in `projects/gold-futures-copilot/frontend/src/app/layout.tsx` and `projects/gold-futures-copilot/frontend/src/components/tradingcopilot/SidebarNav.tsx`; implement dark charcoal (#0f1117) background, gold accents (#D4AF37), and collapsible mobile nav.
- [X] T068 [P] Integrate v0 design into Dashboard homepage: hero stat cards (Win Rate, Avg RR, Active Plans), Today's Session Bias banner, Recent Trade Plans table, and Next Session Reminder widget in `projects/gold-futures-copilot/frontend/src/app/page.tsx`.
- [X] T069 [P] Integrate v0 design into Creator Studio: refactor `projects/gold-futures-copilot/frontend/src/app/creator/page.tsx` with two-panel layout (left: new trade plan form with bias toggles and gold-accented inputs; right: outcome journal form with live P&L preview); add recent plans table below.
- [X] T070 [P] Enhance Showroom page with v0 design: add strategy overview header, stats strip (Total Trades, Win Rate, Avg RR, Max Drawdown), performance chart (sparkline), active setup preview with "Signals are live" badge, and latest closed summary card in `projects/gold-futures-copilot/frontend/src/app/showroom/page.tsx` and `projects/gold-futures-copilot/frontend/src/components/tradingcopilot/ShowroomCharts.tsx`.
- [X] T071 Integrate v0 design into Subscriber Settings page: refactor `projects/gold-futures-copilot/frontend/src/app/subscriber/page.tsx` with "Add Alert Channel" form (Telegram/Discord/Webhook segmented control) and "Your Active Channels" table; add empty state illustration.
- [X] T072 [P] Apply gold/dark theme styling: update Tailwind config and globals.css with dark charcoal background, gold accents, green (#22c55e) for long/profitable, red (#ef4444) for short/loss, amber (#f59e0b) for neutral; use monospaced fonts for prices/numbers and sans-serif for text.
- [X] T073 Refactor component styling in `projects/gold-futures-copilot/frontend/src/components/tradingcopilot/` (TradePlanForm, JournalForm, AlertChannelSettings, ShowroomCharts): replace raw HTML inputs with styled form components using Tailwind + shadcn/ui patterns (Button, Input, Select, Textarea, Card, Badge).
- [X] T074 Create chart/visualization components for performance metrics: implement simple sparkline or bar chart using recharts or chart.js for Showroom equity curve and performance display.

**Checkpoint**: All 4 pages match v0 design specification; app is visually polished and ready for production showcase.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Starts immediately.
- **Phase 2 (Foundational)**: Depends on setup; blocks all user stories.
- **Phases 3–6 (User Stories)**: Depend on foundational completion.
  - Can run in priority order (P1 → P2 → P3 → P4) for incremental delivery.
  - Can partially parallelize if team capacity exists.
- **Phase 7 (Polish)**: Depends on completion of desired user stories.
- **Phase 8 (Design Integration)**: Depends on all user story implementations being feature-complete; can run in parallel with Phase 7.

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories; defines MVP.
- **US2 (P2)**: Depends on US1 data availability but remains independently testable.
- **US3 (P3)**: Depends on foundational auth/entitlement and creator status events; independently testable once those are in place.
- **US4 (P4)**: Depends on US1 plan lifecycle; independently testable with closed plan data.

### Parallel Opportunities

- Setup/foundation tasks marked **[P]** can run concurrently.
- Within each story, repository/data tasks and UI component tasks marked **[P]** can run concurrently.
- With staffing, US2 and US3 can proceed in parallel after US1 contract surfaces stabilize.

### Parallel Example: User Story 1

- Run T016 and T017 in parallel (repository + metrics on different files).
- Run T018 and T019 in parallel (rubric + retrieval adapters on different files).
- Run T023 and T024 in parallel (pages + components).

### Parallel Example: User Story 2

- Run T027 and T031 in parallel (backend query service + frontend charts).

### Parallel Example: User Story 3

- Run T033 and T039 in parallel (backend repositories + frontend subscriber settings).
- Run T035 and T040 in parallel after T033 (alerts service + BFF route wiring).

### Parallel Example: User Story 4

- Run T042 and T048 in parallel (backend repositories + frontend journal UI).
- Run T044 and T046 in parallel after T042 (metrics recompute + memory orchestration).

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 + Phase 2.
2. Complete Phase 3 (US1).
3. Validate creator flow via quickstart P1 path.
4. Demo/deploy MVP increment.

### Incremental Delivery

1. Add US2 (public funnel) and validate anonymously.
2. Add US3 (paid alerts) and validate channel deliveries.
3. Add US4 (journal/learning) and validate retrospective loop.
4. Finish with Phase 7 polish.

### Monorepo Boundary Guardrails

- Keep implementation inside `projects/gold-futures-copilot/`.
- Platform-root code changes are integration touchpoints only.
- Do not import project internals directly from platform or sibling projects.
