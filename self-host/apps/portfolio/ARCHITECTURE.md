# Architecture: Portfolio

## Purpose

A CMS-style personal portfolio: projects, documentation, and resume requests, backed by a Go control plane. Previously also ran a live "playground" of real backend demo containers (Kafka/RabbitMQ/Redis widgets) — retired, see ADR 004.

## Components

- **Frontend** (`frontend/`): Next.js 16 App Router UI — landing page, docs pages, admin UI. Acts as the BFF: server-side API routes under `src/app/api/proxy/*` verify the NextAuth session/role before forwarding privileged requests to the Go backend.
- **Backend** (`backend/`): Go/Fiber control plane exposing `/health`, CMS routes (projects/documents/homepage), resume-request routes, and a Filebrowser proxy for resume/doc storage.
- **Data store:** Redis — holds CMS content (projects, documents, homepage layout), site config (resume/LinkedIn/GitHub URLs), and pending resume requests.
- **External dependencies:** shared Filebrowser infra service (`self-host/infra/filebrowser/`) for resume/CMS file storage; NextAuth + Google OAuth for admin login.

## Boundaries

- Frontend must not contain business logic beyond BFF proxy handlers — see ADR 002.
- Backend must never be reachable directly from the public internet; only the frontend's Node server talks to it over the internal Docker network.

## Contracts

- REST between frontend and backend (internal Docker network only, ports `8080`→`8085` host-mapped for local dev).

## Operational Notes

- **Runtime requirements:** Docker + Docker Compose only; no local Go/Node toolchain needed.
- **Observability:** no centralized logging yet (open item, not currently tracked as an ADR).

## Extraction Plan

Portfolio is the platform's flagship project and is not expected to be extracted into its own repository — it *is* the showcase. If that changes, the Go backend and Next.js frontend are already isolated under `self-host/apps/portfolio/` with no cross-project imports, so extraction would mainly involve moving the folder and re-pointing CI workflows (`.github/workflows/build-app-portfolio-*.yml`, `deploy-app-portfolio.yml`).

## Related Decisions

- [ADR 001 — Custom Go Control Plane vs. Portainer](./adrs/001-custom-go-control-plane.md) — superseded, see ADR 004
- [ADR 002 — BFF Proxy Security](./adrs/002-bff-proxy-security.md)
- [ADR 003 — Secure Resume Storage](./adrs/003-secure-resume-storage.md)
- [ADR 004 — Retire Live Playground](./adrs/004-retire-live-playground.md)
