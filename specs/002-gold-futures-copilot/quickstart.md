# Quickstart — Gold Futures Trading Copilot (v1)

## Workspace scope

Primary implementation lives in:

- `projects/gold-futures-copilot/backend/`
- `projects/gold-futures-copilot/frontend/`
- `projects/gold-futures-copilot/contracts/`
- `projects/gold-futures-copilot/tests/`
- `projects/gold-futures-copilot/scripts/`

Platform-root changes are limited to showcase/shell integration touchpoints (for example project registration and navigation wiring).

## Prerequisites

- Docker + Docker Compose v2
- Node.js and pnpm/npm for frontend local workflow
- Go 1.24.x for backend local workflow
- Environment variables configured from `projects/gold-futures-copilot/.env.example`

## 1) Start platform dependencies

Bring up compose services required by this feature:

- PostgreSQL (+ pgvector extension)
- Redis
- Redpanda
- Backend API
- Frontend Next.js app

Use project compose configuration in `projects/gold-futures-copilot/docker-compose.project.yml`, plus root compose integration only where required by platform networking.

## 2) Seed core setup

1. Create creator/admin account with NextAuth role `creator`.
2. Create active rubric version and initial weighted rubric rules.
3. Create at least one paid subscriber account and grant manual subscription `active`.
4. Configure one alert channel for that subscriber (Telegram, Discord, or webhook).

## 3) Execute P1 flow: Plan → Grade → Publish

1. In creator UI, create a trade plan draft with entry/SL/TP values.
2. Trigger grade action.
3. Verify response includes decision, score breakdown, and recommendations.
4. Publish approved setup.
5. Verify showroom updates and premium signal details are gated.

## 4) Execute P3 flow: Semi-automatic alerts

1. Update trade status event (for example `entry_hit`).
2. Choose policy (`auto_send` or `confirm_before_send`).
3. Verify alert event and per-channel delivery records are created.
4. Confirm at least one channel receives payload.

## 5) Execute P4 flow: Post-trade journal + retrieval memory

1. Submit trade outcome data (entry/exit/size/MAE/MFE).
2. Verify deterministic portfolio metrics update.
3. Verify retrospective response references historical context where available.
4. Verify memory records and embeddings are upserted.

## 6) Verify v1 scope constraints

- No integrated payment gateway workflow is present.
- Subscription lifecycle can be manually managed by creator/admin.
- Anonymous users cannot access full actionable live setup details.

## 7) Regression checklist

- Creator auth required for all `/creator/*` actions.
- Subscriber entitlement required for premium routes and alert channel management.
- Project-local BFF/proxy remains the only frontend→backend path for privileged operations.
- Alert failures on one channel do not block other channels.

## 8) Monorepo boundary checks

- No project internals are imported directly into other projects.
- Any platform integration is performed through contracts and BFF/proxy boundaries.
- Project run/test scripts are executed from `projects/gold-futures-copilot/scripts/`.
