# Contributing to Systems Playground

Thanks for contributing 👋

This repository is a monorepo containing a platform shell and multiple showcase projects. This file covers PR/commit process and standards — for the technical "how do I run this / how is it built" side, see [`docs/DEVELOPER_GUIDE.md`](docs/DEVELOPER_GUIDE.md); for the exact steps to add a new project or infra service, see [`docs/MONOREPO_GUIDE.md`](docs/MONOREPO_GUIDE.md#contribution-model-for-projects) (not duplicated here, to avoid the two drifting out of sync).

## What can I contribute?

- Platform improvements (`self-host/apps/portfolio/backend/`, `self-host/apps/portfolio/frontend/`, docs, `self-host/infra/`)
- New showcase projects under `self-host/apps/`
- Bug fixes, tests, and documentation improvements

## Branch and PR expectations

- Keep PRs small and focused.
- Use clear commit messages that explain intent.
- Include test notes in PR description (what was tested, where).
- If architecture decisions change, add/update an ADR: platform/monorepo-wide decisions go in [`docs/adrs/`](docs/adrs/), project-specific decisions go in `self-host/apps/<slug>/adrs/`.
- Avoid deep cross-project coupling; keep platform integration explicit (e.g. route/proxy registration and UI project listing) — see [`docs/MONOREPO_GUIDE.md`](docs/MONOREPO_GUIDE.md#architecture-boundaries-non-negotiable) for the full rules.

## Coding and architecture standards

- Prefer clear interfaces and stable contracts over convenience imports.
- Keep changes backward-compatible unless explicitly coordinated.
- Preserve scale-to-zero and control-plane principles already used by the platform.

## Documentation standards

- Use tables for structured, service-by-service, or per-item information (name, required?, used-by, fallback). Reserve prose for genuinely narrative content — why a decision was made, trade-offs weighed.
- Use real markdown links (`[label](path)`) for anything linkable — another doc, an ADR, a workflow, a script. Not bare backtick paths.
- Don't hardcode a list (services, workflows, directories) or a volatile value (port, hostname) that duplicates a file that already defines it — link to that file, or verify against the current repo state before writing it down. Duplicated facts are a second place to go stale.
- Use a Mermaid diagram (fenced ` ```mermaid ` block) only for genuinely branching, sequential, or hierarchical content — not as decoration.
- Define environment-specific or hardware-specific jargon once, precisely, then use a plain generic term (e.g. "the host") everywhere else.

## Security and secrets

- Never commit real secrets.
- Commit only safe placeholders in `.env.example`.
- Treat anything under admin/auth/proxy paths as security-sensitive and review accordingly.
- This repo is public with a self-hosted Actions runner attached — see [ADR 001](docs/adrs/001-cicd-secrets-and-runner-trust-boundary.md) before adding any workflow that runs on the self-hosted runner. In short: never trigger a self-hosted job on `pull_request`.

## Need help?

Open a draft PR early with context and assumptions. Early feedback beats late rewrites.
