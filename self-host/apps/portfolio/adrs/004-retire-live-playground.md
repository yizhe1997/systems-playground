# ADR 004: Retire the Live Backend Playground

**Date:** 2026-07-23
**Status:** Accepted
**Supersedes:** [ADR 001](./001-custom-go-control-plane.md)

## Context

ADR 001 built a custom Go control plane specifically to run live, interactive backend demos (Redis cache, RabbitMQ queue, Redpanda event streaming) with scale-to-zero, reasoning that this would demonstrate engineering depth to portfolio visitors.

Revisiting the whole approach: the portfolio's actual goal is to cast a wide net across general software engineering roles and convert visits into resume requests — not to pass deep technical scrutiny from the small subset of visitors who'd actually poke at a live playground. A resource-heavy, scale-to-zero live-container architecture also doesn't scale toward a CMS/wiki-like showcase site, and works against it on a limited-RAM self-hosted host.

Full reasoning and rejected alternatives: see the vault-side brainstorm and ADR (not part of this repo) referenced from the operator's own notes.

## Options Considered

1. Keep the live playground, focus effort on visual polish only.
2. Shrink to one hero live demo, spend the rest of the effort on visual/animation polish.
3. **Retire the live playground entirely; make the AI-native build process the differentiator instead.**

## Decision

Option 3. The live backend playground (Kafka/RabbitMQ/Redis demo widgets, the custom Go control plane, the scale-to-zero reaper) is retired entirely. The portfolio becomes a CMS-style app (projects, documents, resume, work history), with a new "How This Was Built" section as the flagship differentiator instead of live infrastructure depth.

## Consequences

- Removed from `backend/`: `docker.go` (widget container management via `docker.sock`), `kafka.go`/`kafka_routes.go` (Redpanda event-streaming demo), `pkg/rabbitmq/` (RabbitMQ queue demo + WebSocket broadcaster). `redis.go` keeps its core connection/config functions (`GetConfig`/`SetConfig`) since Redis is also the CMS's data store — only the playground-specific `RecordHeartbeat`/`IsHeartbeatAlive` were removed.
- Removed from `docker-compose.yml`: `rabbitmq` and `redpanda` services and volumes, the `/var/run/docker.sock` mount on `backend` (no longer needed once `docker.go` is gone — also a genuine attack-surface reduction).
- Removed from `frontend/`: the `/playground` route, `WidgetGrid`/`RabbitMQDemo`/`RedpandaDemo` components, the `use-widgets-feed`/`use-widget-heartbeat` hooks, the widget-toggle proxy route, the admin dashboard's "Container Orchestration" tab, and the "Featured Demos" selector in the CMS manager.
- `ADR 001` is superseded by this record but kept for historical context.
