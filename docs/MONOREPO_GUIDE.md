---
title: "Monorepo Guide"
description: "Architecture boundaries and contribution model for multi-project development in Systems Playground."
---

# Monorepo Guide

This repository is a **showcase monorepo**: the platform (`backend/`, `frontend/`, infra) hosts and presents one or more independent projects under `projects/`.

## Goals

- Keep project onboarding simple (single repository and shared docs).
- Keep project boundaries strict (easy to extract later into standalone repos).
- Reuse shared infrastructure where it is helpful, without coupling internals.

## Repository Zones

- `backend/`: Go control plane + API services for platform-level orchestration.
- `frontend/`: Next.js UI shell (landing page, docs pages, showcase routes, BFF/proxy layer).
- `docs/`: architecture records, developer guides, deployment and contribution docs.
- `projects/`: independently scoped showcase projects.
- `storage/`: persisted config/files for local/dev flows.

## `projects/` Structure

Each project should follow this shape (or a subset if not needed):

- `projects/<project-slug>/README.md`
- `projects/<project-slug>/ARCHITECTURE.md`
- `projects/<project-slug>/.env.example`
- `projects/<project-slug>/docker-compose.project.yml`
- `projects/<project-slug>/backend/`
- `projects/<project-slug>/frontend/`
- `projects/<project-slug>/contracts/`
- `projects/<project-slug>/tests/`
- `projects/<project-slug>/scripts/`

A starter template lives at `projects/_template/`.

## Architecture Boundaries (Non-Negotiable)

1. **No deep cross-project imports**.
   - Project A must not import internals from Project B.
2. **Shared code goes through stable shared packages only**.
   - If reuse emerges, move it into a dedicated shared module (future `packages/*`).
3. **Integration through contracts, not internals**.
   - Use API/event schemas in `contracts/` and version them.
4. **Projects must be runnable in isolation**.
   - Each project defines its own local scripts, env examples, and test strategy.
5. **Platform code owns platform concerns**.
   - Control plane logic belongs in `backend/`; UI shell and BFF/proxy belong in `frontend/`.

## Contribution Model for Projects

When adding a new project:

1. Copy `projects/_template` to `projects/<your-project-slug>`.
2. Fill in `README.md` (purpose, run, test, interfaces).
3. Fill in `ARCHITECTURE.md` (scope, boundaries, dependencies, extraction plan).
4. Register the project in the showcase UI (`frontend/src/app/projects/page.tsx`).
5. Add or update docs in `docs/` if the platform integration changes.

For detailed PR expectations, naming, and review standards, see `CONTRIBUTING.md`.

## Extract-to-Standalone Readiness

Design every project so it can be split into its own repository later.

A project is usually ready to extract when at least 3 are true:

- independent release cadence,
- separate ownership/team,
- distinct security/compliance profile,
- mostly independent CI/runtime,
- roadmap diverges from core platform work.

If extraction is needed, the expected path is mostly moving `projects/<slug>` and keeping integration contracts intact.
