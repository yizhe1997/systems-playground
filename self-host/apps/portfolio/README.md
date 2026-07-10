# Portfolio

An interactive portfolio and developer showcase by Chin Yi Zhe. Instead of just listing technologies on a resume, this project visually demonstrates backend architecture concepts (message queues, event streaming, caching, WebSockets) in real time, backed by a Go control plane that scales the demo infrastructure up and down on demand.

This is the flagship project of the [Systems Playground](../../../README.md) monorepo, living at `self-host/apps/portfolio/`.

## Tech Stack

* **Backend:** Go 1.24, [Fiber](https://gofiber.io/) v2
* **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui
* **Infrastructure (scale-to-zero demo widgets):** Redis (cache demo), RabbitMQ (queue demo), Redpanda/Kafka (event streaming demo)
* **Auth:** NextAuth v4 (Google OAuth), BFF proxy pattern for admin routes
* **File storage:** shared [Filebrowser](../../infra/filebrowser/) infra service (resume uploads, CMS assets)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for how these pieces fit together, and [adrs/](./adrs/) for the reasoning behind the big calls (custom Go control plane, BFF security, resume storage).

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
* **RabbitMQ management UI:** http://localhost:15672

Useful commands, run from `self-host/apps/portfolio/`:

```bash
docker compose logs -f     # tail all service logs
docker compose down        # stop the stack
```

`docker-compose.override.yml` is auto-loaded for local dev. Production/self-hosted deploys instead merge `docker-compose.prod.yml` (pre-built images from Docker Hub, Watchtower auto-update labels) — see [docs/DEPLOYMENT_WSL.md](../../../docs/DEPLOYMENT_WSL.md).

## Content / Copy

Working draft of the site's marketing copy. This is the source of truth when updating landing page text — keep it in sync with `frontend/src/app/page.tsx`.

### Hero / Bio Section

**Headline:** Hi, I'm Chin Yi Zhe.
**Sub-headline:** I build scalable, multi-tenant cloud systems.
**Body:** I'm a Backend-focused Software Engineer with deep expertise in .NET and Golang, alongside full-stack experience with Blazor, Angular, and React. I focus on architecting resilient distributed systems, automating complex cloud deployment pipelines, and modernizing enterprise applications.
**Calls to Action:**
- [Download Resume]
- [View LinkedIn]

### The Interactive Playground

Live widgets connected to the real Go backend described above.

**Widget A — The Message Queue (RabbitMQ).** Demonstrates asynchronous task processing. UI: a text input with a "Send Job" button, a visual "Queue," and 3 "Worker" servers. User types a message and clicks Send; the message appears in the queue, a worker lights up, a spinner runs for ~2s, then outputs `[Worker 2] Processed job: <message>`.

**Widget B — The Cache Hit (Redis).** Demonstrates in-memory data store performance. UI: a "Fetch Database Records" button plus "Latency" and "Source" metric boxes. First click (cache miss) takes ~1500ms, source "PostgreSQL"; second click (cache hit) takes ~10ms, source "Redis Cache."

**Widget C — Distributed Event Streaming (Redpanda).** Demonstrates pub/sub event streaming with an immutable log and replayable consumer groups.

### Architecture Case Studies

Short, high-impact write-ups proving deep systems knowledge.

**Case Study 1: Designing Idempotent Webhooks for ATS Integration.** The problem: synchronizing candidate data from a legacy ATS (Bullhorn) into a multi-tenant portal without creating duplicate records or race conditions during high-volume bursts. The solution: a Golang ingestion handler with strict idempotency keys, distributed locking via Redis, and a retry mechanism. The impact: 100% data integrity for the Singapore market pilot, eliminating manual data entry.

**Case Study 2: Modernizing an Enterprise Job Portal.** The problem: a legacy architecture that was difficult to scale and slow to onboard new developers across global teams. The solution: a phased rewrite leveraging Golang and React, orchestrated via GCP and Pulumi. The impact: drastically improved system responsiveness, reduced technical debt, and cleaner separation of concerns across 9 regional enterprise tenants.
