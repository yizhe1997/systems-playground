# Projects Workspace

This folder contains independently scoped showcase projects built on top of the Systems Playground platform.

## Quick Start

1. Copy `projects/_template/` into `projects/<project-slug>/`.
2. Fill in the project docs and env template.
3. Implement your project in `backend/`, `frontend/`, or both.
4. Register it in the platform project listing UI.

## Rules

- No deep imports across project internals.
- Define contracts in `contracts/`.
- Keep run/test scripts local to each project.
- Document architecture decisions in each project's `ARCHITECTURE.md`.

See:

- `docs/MONOREPO_GUIDE.md`
- `CONTRIBUTING.md`
