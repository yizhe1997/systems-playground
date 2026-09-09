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

## Content / Copy

Working draft of the site's marketing copy. This is the source of truth when updating landing page text — keep it in sync with `frontend/src/app/page.tsx`.

### Hero / Bio Section

**Headline:** Hi, I'm Chin Yi Zhe.
**Sub-headline:** I build scalable, multi-tenant cloud systems.
**Body:** I'm a Backend-focused Software Engineer with deep expertise in .NET and Golang, alongside full-stack experience with Blazor, Angular, and React. I focus on architecting resilient distributed systems, automating complex cloud deployment pipelines, and modernizing enterprise applications.
**Calls to Action:**
- [Download Resume]
- [View LinkedIn]

### Architecture Case Studies

**TBD — explicitly not written yet.** An earlier draft of this section carried two case studies (an ATS webhook-idempotency project, an enterprise job-portal modernization) that read as fictional placeholder copy, not confirmed work history. Per [PRODUCT.md](./PRODUCT.md#evidence-on-hand), they must not be treated as real evidence or carried forward into any new work — removed here rather than left as content this file describes as "source of truth." Real case studies go here once real work history is supplied.
