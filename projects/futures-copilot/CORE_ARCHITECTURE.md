# FUTURES COPILOT: CORE ARCHITECTURE & FEATURES

## Goal
A deterministic, AI-assisted trade journaling and risk-management platform for Prop Firm traders. The system reduces emotional/impulsive entries by combining hard risk math with AI-assisted setup grading and retrospective pattern analysis.

## Architecture Snapshot (Current + Target)
* **Frontend**: Next.js (App Router), React 19, Tailwind CSS, Framer Motion.
* **Backend**: Go (Fiber), REST APIs, async job-friendly architecture.
* **Data**: Postgres + `pgvector` (already enabled in Docker stack), Redis for queue/state.
* **UI Style**: Brutalist Swiss (high-contrast B/W, sharp borders, no rounded corners).

---

## ADR: Phase Strategy Decision

### Decision
We will **move directly toward Phase B capabilities** (semantic retrieval + AI setup grading), but with a **minimal Phase A foundation** to avoid fragile behavior.

### Why
1. `pgvector` is already provisioned in infra and migration path.
2. The product value comes from contextual grading and historical similarity, not manual-only checks.
3. A tiny foundation step (normalization + queue + status lifecycle) prevents a brittle “LLM-on-submit” experience.

### Guardrail
Use a **hybrid** evaluator:
* deterministic checks for hard constraints (risk $, account limits, required fields), and
* vector retrieval for soft/contextual pattern matching (similar setups, behavior notes, rubric text fit).

---

## 1) Trade Lifecycle (Canonical Flow)

1. **DRAFT (Guardrail Stage)**
   * User enters `instrument`, `entry`, `stop_loss`, `target`, `contracts`, rubric, and optional context notes.
   * Draft is saved quickly and deterministically.
   * Optional AI setup grading can run async.

2. **WORKING (Radar Stage)**
   * User submits setup to market; order is `working`.
   * Dashboard Live Radar tracks working orders.

3. **FILLED (Position Stage)**
   * Order fill is confirmed; trade is `filled`.
   * Entry is effectively locked for integrity; management updates focus on SL/TP adjustments.
   * Replay is available from **filled trade cards** in dashboard.

4. **JOURNALED (Retrospective Stage)**
   * User records final PnL/outcome/reflection.
   * Record becomes part of historical corpus for retrieval and pattern analysis.

> Note: prior wording “Closed / Journaled” is unified as **Journaled** for consistency in product language.

---

## 2) Account Model: State vs Logic

Prop firm rules mutate and are often too nuanced for brittle relational modeling alone.

### Deterministic State (hard math)
* `current_balance`
* `current_daily_stop_level`
* `current_max_loss_level`

### Rules Logic (context input)
* `rules_context` (free text)
  * e.g., trailing drawdown behavior, lock rules, session constraints.

Accounts are intentionally highly editable so users can update reality quickly at session boundaries.

---

## 3) Rubrics and AI Setup Grading

Rubrics remain user-defined plain-text strategy constraints.

### UX/flow (agreed)
* `Create Draft` remains immediate.
* Optional checkbox: `Run AI Setup Grade`.
* If checked, backend enqueues grading job (non-blocking).
* UI status lifecycle: `queued` → `grading` → `ready` (or `failed`).
* Findings are written back into the draft panel “AI Risk Findings” box.

### Suggested grading output contract
* `setup_grade` (0-100)
* `risk_flags[]`
* `rubric_match_summary`
* `similar_setups_summary`
* `recommendation` (`take` | `reduce_size` | `skip`)
* `findings_text`

---

## 4) Phased Delivery Plan (Do Not Forget ✅)

### Phase A (Minimal Foundation — keep this small)
**Objective**: Stabilize data and async workflow primitives needed for reliable AI.

1. Canonical instrument normalization + TradingView symbol mapping consistency.
2. Async grading job model + Redis queue plumbing.
3. Grading status fields on draft (`queued/grading/ready/failed`).
4. Deterministic risk pre-check always runs before enqueue.

**Exit criteria**: Draft creation is instant; grading jobs execute asynchronously with clear status and retries.

### Phase B (Primary Value Phase — start immediately after A-min)
**Objective**: Retrieval-assisted setup grading using existing pgvector stack.

1. Embed journaled trades, rubric text, and high-signal notes.
2. Hybrid retrieval:
   * SQL filters (instrument/session/basic constraints), then
   * vector similarity search (behavioral/pattern context).
3. Compose LLM grading prompt from:
   * deterministic risk snapshot,
   * account `rules_context`,
   * rubric,
   * retrieved similar examples.
4. Persist structured grading output + explanation for UI display.

**Exit criteria**: AI grading is explainable, reproducible enough for review, and meaningfully references historical analogs.

### Phase C (Optimization + Learning Loop)
**Objective**: Improve quality, latency, and trader trust.

1. Feedback loop from user overrides/acceptance.
2. Better retrieval ranking and de-dup logic.
3. Cost/latency instrumentation, caching, and prompt regression tests.
4. Dashboard insights summarizing recurring mistakes and winning patterns.

**Exit criteria**: Lower latency, higher relevance, and visible behavior-change metrics.

---

## 5) UI/UX Principles (Current)

* No “appy” clutter: lean layout and strong hierarchy.
* Panel-first interactions (slide-in right panels, minimal route churn).
* Live chart radar for active monitoring.
* Replay available from dashboard `filled` trade cards (not landing page).
* Strict numeric input handling (sanitize on change, normalize on blur).
