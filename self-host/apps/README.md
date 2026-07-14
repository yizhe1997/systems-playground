# Apps Workspace

Independently scoped showcase projects, one folder per project. Separate from `self-host/infra/`, which holds platform-wide infrastructure (monitoring, auto-updates, shared file storage) rather than any single project.

## Current Projects

- **`portfolio/`** — flagship project: platform shell (Go control-plane backend + Next.js UI) and the first showcase project. See [`portfolio/README.md`](portfolio/README.md).
- **`scripts/`** — `wsl-startup.sh` / `wsl-shutdown.sh`, deployed to `~/apps/` on the host by `deploy-app-scripts.yml`. Auto-discovers and starts/stops any `self-host/apps/*/docker-compose.yml`. See `scripts/README.md` — notably, there's no app-layer backup script here; that's handled host-wide by the infra layer's `wsl-backup.sh` (it backs up every Docker volume on the host, not just infra's).
- **`_template/`** — starter template for a new project.

## Adding a Project

```bash
make new-app slug=<project-slug> name="<Project Name>"
```

This copies `_template/` into `self-host/apps/<project-slug>/` with placeholders filled in. For the full procedure, rules, and boundaries, see `docs/MONOREPO_GUIDE.md` and `CONTRIBUTING.md` — this file is just an index, not the source of truth.
