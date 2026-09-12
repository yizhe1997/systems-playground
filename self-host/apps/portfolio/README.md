# Portfolio

A CMS-style personal portfolio by Chin Yi Zhe — projects, documentation, and resume requests, backed by a Go control plane. Previously also ran a live "playground" of real backend demo containers (Kafka/RabbitMQ/Redis widgets); retired in favor of a CMS-first design — see [ADR 004](./adrs/004-retire-live-playground.md).

This is the flagship project of the [Systems Playground](../../../README.md) monorepo, living at `self-host/apps/portfolio/`.

## Tech Stack

* **Backend:** Go 1.25, [Fiber](https://gofiber.io/) v2
* **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui
* **Data store:** Redis (CMS content, site config) and SQLite (resume requests — a real source of truth, not a cache, see [ADR 005](./adrs/005-sqlite-for-resume-requests.md))
* **Auth:** NextAuth v4 (Google OAuth), BFF proxy pattern for admin routes
* **File storage:** shared [Filebrowser](../../infra/filebrowser/) infra service (resume uploads, CMS assets)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for how these pieces fit together, and [adrs/](./adrs/) for the reasoning behind the big calls (BFF security, resume storage, retiring the live playground).

## Quick Start

From the repo root:

```bash
cd self-host/apps/portfolio
docker compose up --build -d
```

You do **not** need Go or Node installed locally — everything is containerized.

Once containers are up:

* **Frontend (landing page + admin UI):** http://localhost:8086
* **Backend API:** http://localhost:8085/health

Useful commands, run from `self-host/apps/portfolio/`:

```bash
docker compose logs -f     # tail all service logs
docker compose down        # stop the stack
```

`docker-compose.override.yml` is auto-loaded for local dev. Production/self-hosted deploys instead merge `docker-compose.prod.yml` (pre-built images from the self-hosted registry, Watchtower auto-update labels) — see [docs/DEPLOYMENT.md](../../../docs/DEPLOYMENT.md).
