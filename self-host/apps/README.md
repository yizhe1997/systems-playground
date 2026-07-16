# Apps Workspace

Independently scoped showcase projects, one folder per project. Separate from `self-host/infra/`, which holds platform-wide infrastructure (monitoring, auto-updates, shared file storage) rather than any single project.

## Current Projects

- **`portfolio/`** — flagship project: platform shell (Go control-plane backend + Next.js UI) and the first showcase project. See [`portfolio/README.md`](portfolio/README.md).
- **`scripts/`** — `wsl-startup.sh` / `wsl-shutdown.sh` / `wsl-backup.sh`, deployed to `~/apps/` on the host by `deploy-app-scripts.yml`. Auto-discovers and starts/stops any `self-host/apps/*/docker-compose.yml`. This layer has its own independent backup script, scoped to only its own volumes — it does **not** rely on the infra layer's `wsl-backup.sh` (that changed on 2026-07-14; the two used to share one host-wide script, but that caused their default backup directories to collide). See [`scripts/README.md`](scripts/README.md) for details.
- **`_template/`** — starter template for a new project.

## Adding a Project

```bash
make new-app slug=<project-slug> name="<Project Name>"
```

This copies `_template/` into `self-host/apps/<project-slug>/` with placeholders filled in. For the full procedure, rules, and boundaries, see [`docs/MONOREPO_GUIDE.md`](../../docs/MONOREPO_GUIDE.md#contribution-model-for-projects) — this file is just an index, not the source of truth.
