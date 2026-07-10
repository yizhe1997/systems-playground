# <infra-name>

Platform-wide infrastructure service — shared across everything on the host, not scoped to a single showcase project. See `docs/MONOREPO_GUIDE.md` for the infra vs apps distinction.

## What this runs

Describe the service and why it needs to be platform-wide infra rather than a project-scoped dependency.

## Deploy

Deployed automatically by `.github/workflows/deploy-infra-<infra-slug>.yml` whenever `self-host/infra/<infra-slug>/**` changes on `main`. Also started on host boot: `self-host/infra/scripts/wsl-startup.sh` auto-discovers any `self-host/infra/*/docker-compose.yml`, so no separate registration step is needed there.
