# Architecture: Portfolio

## Purpose

Demonstrate real backend architecture concepts (message queues, event streaming, caching, container orchestration) through live, interactive widgets, backed by a genuine Go control plane rather than static descriptions.

## Components

- **Frontend** (`frontend/`): Next.js 16 App Router UI — landing page, docs pages, playground widgets, admin UI. Acts as the BFF: server-side API routes under `src/app/api/proxy/*` verify the NextAuth session/role before forwarding privileged requests to the Go backend.
- **Backend** (`backend/`): Go/Fiber control plane exposing `/health`, WebSocket broadcast, CMS routes, resume routes, Kafka/Redpanda routes, and Docker lifecycle management via `docker.sock`.
- **Data stores / MQ:** Redis (cache demo), RabbitMQ (queue demo), Redpanda (Kafka-compatible event streaming demo) — all labelled `playground.widget=<name>` so the control plane only ever touches demo containers.
- **External dependencies:** shared Filebrowser infra service (`self-host/infra/filebrowser/`) for resume/CMS file storage; NextAuth + Google OAuth for admin login.

## Boundaries

- Frontend must not contain business logic beyond BFF proxy handlers — see ADR 002.
- Backend must never be reachable directly from the public internet; only the frontend's Node server talks to it over the internal Docker network.
- The Docker socket integration is restricted to containers labelled `playground.widget=<name>` — it must never be able to act on other services running on the same host (e.g. `self-host/infra/*`).

## Contracts

- REST + WebSocket between frontend and backend (internal Docker network only, ports `8080`→`8085` host-mapped for local dev).
- `playground.widget` Docker label convention used by the control plane to discover which containers it may start/stop.

## Operational Notes

- **Runtime requirements:** Docker + Docker Compose only; no local Go/Node toolchain needed.
- **Scale-to-zero:** heavy containers (RabbitMQ, Redpanda) are started/stopped on demand by the Go control plane's reaper after a period of inactivity — required because the production host has limited RAM (see [`docs/DEPLOYMENT_WSL.md`](../../../docs/DEPLOYMENT_WSL.md) for what that host is). See ADR 001.
- **Observability:** RabbitMQ management UI exposed on `15672` for local inspection; no centralized logging yet (open item, not currently tracked as an ADR).

## Extraction Plan

Portfolio is the platform's flagship project and is not expected to be extracted into its own repository — it *is* the showcase. If that changes, the Go backend and Next.js frontend are already isolated under `self-host/apps/portfolio/` with no cross-project imports, so extraction would mainly involve moving the folder and re-pointing CI workflows (`.github/workflows/build-app-portfolio-*.yml`, `deploy-app-portfolio.yml`).

## Related Decisions

- [ADR 001 — Custom Go Control Plane vs. Portainer](./adrs/001-custom-go-control-plane.md)
- [ADR 002 — BFF Proxy Security](./adrs/002-bff-proxy-security.md)
- [ADR 003 — Secure Resume Storage](./adrs/003-secure-resume-storage.md)
