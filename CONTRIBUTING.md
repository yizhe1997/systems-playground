# Contributing to Systems Playground

Thanks for contributing 👋

This repository is a monorepo containing a platform shell and multiple showcase projects.

Please read these first:

- `docs/DEVELOPER_GUIDE.md`
- `docs/MONOREPO_GUIDE.md`
- `docs/DEPLOYMENT_WSL.md` (if you deploy in WSL)

## What can I contribute?

- Platform improvements (`self-host/apps/portfolio/backend/`, `self-host/apps/portfolio/frontend/`, docs, `self-host/infra/`)
- New showcase projects under `self-host/apps/`
- Bug fixes, tests, and documentation improvements

## Branch and PR expectations

- Keep PRs small and focused.
- Use clear commit messages that explain intent.
- Include test notes in PR description (what was tested, where).
- If architecture decisions change, add/update an ADR: platform/monorepo-wide decisions go in `docs/adrs/`, project-specific decisions go in `self-host/apps/<slug>/adrs/`.

## Monorepo rules

- Avoid deep cross-project coupling.
- Add project-local docs and scripts for anything under `self-host/apps/<slug>`.
- Keep platform integration explicit (e.g., route/proxy registration and UI project listing).

## Adding a new project

1. Run `make new-app slug=<your-project-slug> name="<Project Name>"` (scaffolds `self-host/apps/<your-project-slug>/` from `_template/`).
2. Complete `README.md` and `ARCHITECTURE.md`. Add `.env.example`, `scripts/dev.sh`/`test.sh`, `backend/`, `frontend/`, `contracts/`, `tests/` only as the project actually needs them — the template ships minimal on purpose.
3. Register showcase entry in `self-host/apps/portfolio/frontend/src/app/projects/page.tsx`.
4. Update documentation if platform behavior changes.

## Adding a new infra service

1. Run `make new-infra slug=<your-infra-slug> name="<Infra Name>"` (scaffolds `self-host/infra/<your-infra-slug>/` from `_template/`, plus its deploy workflow).
2. Complete `docker-compose.yml`, `README.md`, `.env.example`.
3. No separate boot registration needed — `wsl-startup.sh` auto-discovers it.

## Coding and architecture standards

- Prefer clear interfaces and stable contracts over convenience imports.
- Keep changes backward-compatible unless explicitly coordinated.
- Preserve scale-to-zero and control-plane principles already used by the platform.

## Security and secrets

- Never commit real secrets.
- Commit only safe placeholders in `.env.example`.
- Treat anything under admin/auth/proxy paths as security-sensitive and review accordingly.
- This repo is public with a self-hosted Actions runner attached — see `docs/adrs/001-cicd-secrets-and-runner-trust-boundary.md` before adding any workflow that runs on the self-hosted runner. In short: never trigger a self-hosted job on `pull_request`.

## Need help?

Open a draft PR early with context and assumptions. Early feedback beats late rewrites.
