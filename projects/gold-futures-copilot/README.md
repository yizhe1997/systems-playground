# Gold Futures Copilot

AI-powered trading copilot and signal journal for Gold Futures (GC), with creator-led pre-trade planning, rubric-based grading, gated signal publishing, and post-trade learning.

## Scope

- **Primary use case**: Creator defines plans manually; system grades, publishes, alerts, and journals outcomes.
- **Intended audience**: Signal creator and paid subscribers; anonymous visitors see masked showroom.
- **Out of scope (v1)**: Integrated payment gateway, automated market-feed execution.

## Local Development

- Copy `.env.example` to `.env` and fill placeholders.
- Start project dependencies with `docker-compose.project.yml`.
- Run `scripts/dev.sh` for project startup flow.
- Run `scripts/down.sh` to stop and clean project containers/volumes.

## Testing

- Run `scripts/test.sh`.
- Add integration/e2e tests under `tests/`.

## Implemented Feature Flows

- Creator: create plan, grade plan, publish approved plan.
- Showroom: public summary endpoint + masked active preview + latest closed fallback.
- Subscriber alerts: configure channel and process creator status updates with auto/confirm policy.
- Journal: submit post-trade outcome, recompute deterministic portfolio snapshot, and upsert memory records.

## SLO Verification

- Grading latency check script: `tests/perf/grading_latency_slo.sh` (SC-002 threshold default 20s p95).
- Alert dispatch latency check script: `tests/perf/alert_dispatch_slo.sh` (SC-003 threshold default 60s).

## Latest Validation Results

- Backend compile/tests: `go test ./...` ✅
- Core edited files diagnostics: no current errors ✅

## Interfaces

- HTTP API contract: `contracts/api.yaml`
- Event contract: `contracts/events.md`
