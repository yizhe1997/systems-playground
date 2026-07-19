# Systems Playground

A self-hosted showcase monorepo by Chin Yi Zhe: a platform shell that hosts one or more independent showcase projects, plus the self-hosted infrastructure that runs them (see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for what host this actually runs on).

## Repository Layout

```text
systems-playground/
├── self-host/
│   ├── infra/            # Platform-level infra (see self-host/infra/README.md for the current list)
│   │   └── _template/    # `make new-infra` scaffolds from here
│   └── apps/             # Showcase projects, one folder per project (see self-host/apps/README.md)
│       ├── portfolio/    # Flagship project — see self-host/apps/portfolio/README.md
│       └── _template/    # `make new-app` scaffolds from here
└── docs/                 # Developer/monorepo/deployment guides, ADRs
```

`self-host/infra` and `self-host/apps` are deliberately separate: infra is platform-wide (runs 24/7, shared across everything on the host), apps are independently scoped showcase projects that can be added, changed, or extracted without touching infra. Use `make new-app` / `make new-infra` to scaffold either — see `make help`.

## Documentation

- [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md) — local development workflow.
- [`docs/MONOREPO_GUIDE.md`](docs/MONOREPO_GUIDE.md) — architecture boundaries and project structure for this monorepo.
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — self-hosted deployment guide (any Ubuntu 22.04+ host, Cloudflare Tunnel, CI/CD, Watchtower).
- [`docs/adrs/`](docs/adrs/) — platform/monorepo-wide architecture decision records. Project-specific ADRs live with their project (e.g. [`self-host/apps/portfolio/adrs/`](self-host/apps/portfolio/adrs/)).
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — PR/commit process, coding standards, security expectations.
- [`self-host/apps/portfolio/README.md`](self-host/apps/portfolio/README.md) — the portfolio project itself: what it demonstrates, quick start, and the live site's content draft.
- [`self-host/infra/README.md`](self-host/infra/README.md) — current infra services and how to add another.
- [`self-host/apps/README.md`](self-host/apps/README.md) — current showcase projects and how to add another.

## Tech Stack

* **Platform backend control plane:** Go 1.24 / Fiber
* **Platform frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
* **Showcase infrastructure:** Docker, Redis, RabbitMQ, Redpanda (Kafka-compatible)
* **Deployment:** Self-hosted on a Windows/WSL2 host via Docker Compose, GitHub Actions self-hosted runner, and Watchtower

Individual showcase projects may use their own stack — see each project's `README.md` under `self-host/apps/`.
