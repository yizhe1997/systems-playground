# Phase 0 Research — Gold Futures Trading Copilot

## Decision 1: Use Go-centric backend orchestration for v1

- **Decision**: Keep business orchestration, deterministic metrics, rubric evaluation orchestration, and alert policy handling in Go within `projects/gold-futures-copilot/backend/pkg/tradingcopilot`, with LLM/embedding providers consumed via adapter clients.
- **Rationale**: Current stack is Go Fiber + Redis + Redpanda. Implementing this inside the project folder adheres to `docs/MONOREPO_GUIDE.md`, preserves extractability, and minimizes runtime complexity while still allowing future service decomposition.
- **Alternatives considered**:
  - Python AI microservice from day one: better experimentation speed but adds operational complexity too early.
  - Full monolith without adapters: rejected because it would make later AI service extraction expensive.

## Decision 2: Canonical persistence in PostgreSQL with pgvector

- **Decision**: Use PostgreSQL for transactional entities (plans, outcomes, subscriptions, alerts, audits) and pgvector for retrieval memory embeddings.
- **Rationale**: A single durable store simplifies consistency and supports both relational queries and similarity retrieval in v1 scale.
- **Alternatives considered**:
  - External vector DB (Pinecone/Weaviate): unnecessary operational overhead for initial single-tenant scope.
  - Redis-only persistence: weak fit for durable journaling and relational audit trails.

## Decision 3: Event backbone with Redpanda, cache/dispatch state with Redis

- **Decision**: Publish domain events (plan graded/published/updated/closed, alert queued/dispatched) via Redpanda and use Redis for dedupe keys, short-lived locks, and delivery retries metadata.
- **Rationale**: Aligns with existing stack and supports future asynchronous extensions (AI-vs-human track, analytics workers) while keeping project internals isolated and integrated with platform only through explicit contracts.
- **Alternatives considered**:
  - Synchronous-only flows: simpler initially but brittle for multi-channel alert fanout and observability.
  - RabbitMQ for this feature: possible, but Redpanda is already present in repo direction and better aligns with event-stream needs.

## Decision 4: Authentication and authorization split by actor

- **Decision**: Creator/admin access via NextAuth + RBAC through project-local BFF/proxy routes; paid subscribers use passwordless magic-link/email OTP through project-scoped subscriber flows.
- **Rationale**: Strong admin security with low-friction subscriber onboarding and minimal credential support burden.
- **Alternatives considered**:
  - Credentials for all users: higher friction and password-reset overhead.
  - Third-party auth suite at launch: useful later, unnecessary complexity for MVP.

## Decision 5: Monetization and payments scope for v1

- **Decision**: Single paid tier; manual subscription lifecycle management; no integrated payment gateway in v1.
- **Rationale**: Validates product demand and operations without billing-system complexity.
- **Alternatives considered**:
  - Stripe at launch: viable but adds webhook failure modes and entitlement edge cases before signal quality is proven.
  - Multi-tier launch: overcomplicates packaging and gating before usage insight.

## Decision 6: Alerting model is semi-automatic with per-event policy

- **Decision**: Support event-level policy where some creator state changes auto-send, while others require confirm-before-send.
- **Rationale**: Balances speed with control and reduces accidental subscriber spam.
- **Alternatives considered**:
  - Fully manual: too slow and operationally heavy.
  - Fully automatic: high accidental-noise risk in early workflow tuning.

## Decision 7: Prompt assembly contract enforces deterministic math authority

- **Decision**: AI grading and retrospective prompts must include (1) system instruction, (2) active rubric snapshot, (3) deterministic metrics payload from backend math engine, and (4) top-k retrieval context; outputs must be strict JSON.
- **Rationale**: Prevents arithmetic hallucination and makes evaluations auditable and contract-testable.
- **Alternatives considered**:
  - Free-form natural language outputs: harder to validate and integrate.
  - LLM-computed metrics: rejected due to known reliability risk for deterministic calculations.

## Decision 8: Public showroom masking strategy

- **Decision**: Anonymous users see historical performance, educational methodology summary, and a non-actionable active setup preview; when no active setup exists, show latest closed setup summary.
- **Rationale**: Builds trust and conversion while protecting proprietary edge.
- **Alternatives considered**:
  - Full live setup visibility: undermines monetization and strategy protection.
  - No setup examples publicly: weaker trust signal for conversion.

## Decision 9: Enforce project-first monorepo boundaries

- **Decision**: Implement feature code under `projects/gold-futures-copilot/` (`backend/`, `frontend/`, `contracts/`, `tests/`, `scripts/`) and keep root-platform changes limited to showcase registration and proxy integration wiring.
- **Rationale**: This satisfies non-negotiable boundaries in `docs/MONOREPO_GUIDE.md` and keeps the project extractable to a standalone repository later.
- **Alternatives considered**:
  - Implement directly in root `backend/` and `frontend/`: faster short-term edits but violates project isolation and increases extraction cost.
