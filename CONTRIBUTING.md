# Contributing to Systems Playground

Thanks for contributing 👋

This repository is a monorepo containing a platform shell and multiple showcase projects.

Please read these first:

- `docs/DEVELOPER_GUIDE.md`
- `docs/MONOREPO_GUIDE.md`
- `docs/DEPLOYMENT_WSL.md` (if you deploy in WSL)

## What can I contribute?

- Platform improvements (`backend/`, `frontend/`, docs, infra)
- New showcase projects under `projects/`
- Bug fixes, tests, and documentation improvements

## Branch and PR expectations

- Keep PRs small and focused.
- Use clear commit messages that explain intent.
- Include test notes in PR description (what was tested, where).
- If architecture decisions change, add/update an ADR in `docs/adrs/`.

## Monorepo rules

- Avoid deep cross-project coupling.
- Add project-local docs and scripts for anything under `projects/<slug>`.
- Keep platform integration explicit (e.g., route/proxy registration and UI project listing).

## Adding a new project

1. Copy `projects/_template/` to `projects/<your-project-slug>/`.
2. Complete:
   - `README.md`
   - `ARCHITECTURE.md`
   - `.env.example`
   - `scripts/dev.sh` and `scripts/test.sh`
3. Register showcase entry in `frontend/src/app/projects/page.tsx`.
4. Update documentation if platform behavior changes.

## Coding and architecture standards

- Prefer clear interfaces and stable contracts over convenience imports.
- Keep changes backward-compatible unless explicitly coordinated.
- Preserve scale-to-zero and control-plane principles already used by the platform.

## Security and secrets

- Never commit real secrets.
- Commit only safe placeholders in `.env.example`.
- Treat anything under admin/auth/proxy paths as security-sensitive and review accordingly.

## Need help?

Open a draft PR early with context and assumptions. Early feedback beats late rewrites.
