# Systems Playground

A self-hosted showcase monorepo by Chin Yi Zhe: a platform shell that hosts one or more independent showcase projects, plus the self-hosted infrastructure (home server / NUC) that runs them.

## Repository Layout

```text
systems-playground/
├── self-host/
│   ├── infra/            # Platform-level infra: uptime-kuma, watchtower, filebrowser, n8n, boot scripts
│   │   └── _template/    # `make new-infra` scaffolds from here
│   └── apps/             # Showcase projects, one folder per project
│       ├── portfolio/    # Flagship project — see self-host/apps/portfolio/README.md
│       └── _template/    # `make new-app` scaffolds from here
├── docs/                 # Developer/monorepo/deployment guides, ADRs
└── .specify/             # Speckit spec-driven workflow (specs, plan, tasks per feature)
```

`self-host/infra` and `self-host/apps` are deliberately separate: infra is platform-wide (runs 24/7, shared across everything on the host), apps are independently scoped showcase projects that can be added, changed, or extracted without touching infra. Use `make new-app` / `make new-infra` to scaffold either — see `make help`.

## Documentation

- [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md) — local development workflow and the Speckit feature process.
- [`docs/MONOREPO_GUIDE.md`](docs/MONOREPO_GUIDE.md) — architecture boundaries and project structure for this monorepo.
- [`docs/DEPLOYMENT_WSL.md`](docs/DEPLOYMENT_WSL.md) — WSL/NUC self-hosted deployment guide (Cloudflare Tunnel, CI/CD, Watchtower).
- [`docs/adrs/`](docs/adrs/) — platform/monorepo-wide architecture decision records. Project-specific ADRs live with their project (e.g. [`self-host/apps/portfolio/adrs/`](self-host/apps/portfolio/adrs/)).
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contribution standards, PR expectations, and how to add new projects.
- [`self-host/apps/portfolio/README.md`](self-host/apps/portfolio/README.md) — the portfolio project itself: what it demonstrates, quick start, and the live site's content draft.
- [`self-host/infra/README.md`](self-host/infra/README.md) — current infra services and how to add another.

## Tech Stack

* **Platform backend control plane:** Go 1.24 / Fiber
* **Platform frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
* **Showcase infrastructure:** Docker, Redis, RabbitMQ, Redpanda (Kafka-compatible)
* **Deployment:** Self-hosted on a WSL/NUC host via Docker Compose, GitHub Actions self-hosted runner, and Watchtower

Individual showcase projects may use their own stack — see each project's `README.md` under `self-host/apps/`.
