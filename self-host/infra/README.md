# Infra Workspace

Platform-wide infrastructure — shared across everything on the host, unlike `self-host/apps/`, which holds independently scoped showcase projects. Runs continuously; started/stopped as a group by `scripts/wsl-startup.sh` / `wsl-shutdown.sh`.

## Current Services

- **`uptime-kuma/`** — uptime monitoring.
- **`watchtower/`** — automatic container image updates.
- **`filebrowser/`** — shared file storage (used by the portfolio project for resume/CMS assets).
- **`n8n/`** — automation.
- **`scripts/`** — `wsl-startup.sh` / `wsl-shutdown.sh`, deployed to `~/infra/` on the host. Auto-discovers and starts/stops any `self-host/infra/*/docker-compose.yml`.
- **`_template/`** — starter template for a new infra service.

## Adding an Infra Service

```bash
make new-infra slug=<infra-slug> name="<Infra Name>"
```

This scaffolds `self-host/infra/<infra-slug>/` and a matching `.github/workflows/deploy-infra-<infra-slug>.yml`. For the full procedure and rules, see `docs/MONOREPO_GUIDE.md` and `CONTRIBUTING.md` — this file is just an index.
