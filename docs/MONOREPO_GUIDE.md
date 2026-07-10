---
title: "Monorepo Guide"
description: "Architecture boundaries and contribution model for multi-project development in Systems Playground."
---

# Monorepo Guide

This repository is a **showcase monorepo**: `self-host/infra` hosts platform-wide infrastructure, and `self-host/apps` hosts one or more independent showcase projects, each presented through the flagship `portfolio` project's UI.

## Goals

- Keep project onboarding simple (single repository and shared docs).
- Keep project boundaries strict (easy to extract later into standalone repos).
- Reuse shared infrastructure where it is helpful, without coupling internals.

## Repository Zones

- `self-host/infra/`: platform-wide infrastructure — Uptime Kuma (monitoring), Watchtower (auto-update), Filebrowser (shared file storage), n8n, and the WSL boot/shutdown scripts. Runs continuously, independent of any single showcase project.
  - `self-host/infra/_template/`: starter template for a new infra service (scaffold with `make new-infra`).
- `self-host/apps/`: independently scoped showcase projects, one folder per project.
  - `self-host/apps/portfolio/`: the flagship project — Go control-plane backend, Next.js UI shell (landing page, docs pages, showcase routes, BFF/proxy layer), and the platform's own demo widgets (Redis, RabbitMQ, Redpanda).
  - `self-host/apps/<other-slug>/`: additional showcase projects, each self-contained.
  - `self-host/apps/_template/`: starter template for a new project (scaffold with `make new-app`).
- `docs/`: architecture records, developer guides, deployment and contribution docs.
- `.specify/`: Speckit spec-driven workflow — specs, plans, and tasks per feature (see `docs/DEVELOPER_GUIDE.md`).

Because `portfolio` is both the platform shell *and* the first showcase project, it is the one place where platform code (`backend/`, `frontend/`) and showcase content coexist. Every other project under `self-host/apps/` is purely a showcase project with no platform responsibilities.

## `self-host/apps/<slug>/` Structure

Each project should follow this shape (or a subset if not needed):

- `self-host/apps/<slug>/README.md`
- `self-host/apps/<slug>/ARCHITECTURE.md`
- `self-host/apps/<slug>/.env.example`
- `self-host/apps/<slug>/docker-compose.project.yml`
- `self-host/apps/<slug>/backend/`
- `self-host/apps/<slug>/frontend/`
- `self-host/apps/<slug>/contracts/`
- `self-host/apps/<slug>/tests/`
- `self-host/apps/<slug>/scripts/`

A starter template lives at `self-host/apps/_template/` — intentionally minimal (`README.md`, `ARCHITECTURE.md`, `docker-compose.project.yml`). Add `backend/`, `frontend/`, `contracts/`, `tests/`, `scripts/` etc. to your project only once you actually need them; don't pre-create empty folders.

**Current status:** `portfolio` is the only fully-built-out project (its own `docker-compose.yml`/`docker-compose.prod.yml`/`docker-compose.override.yml` rather than the `docker-compose.project.yml` template name, since it also carries platform responsibilities).

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
   - Control plane logic belongs in `self-host/apps/portfolio/backend/`; UI shell and BFF/proxy belong in `self-host/apps/portfolio/frontend/`.
6. **Infra is not a project**.
   - Anything in `self-host/infra/` is platform-wide and shared; it must not encode logic specific to a single showcase project.

## Contribution Model for Projects

When adding a new showcase project:

1. Run `make new-app slug=<your-project-slug> name="<Project Name>"` (scaffolds from `self-host/apps/_template`).
2. Fill in `README.md` (purpose, run, test, interfaces).
3. Fill in `ARCHITECTURE.md` (scope, boundaries, dependencies, extraction plan).
4. Register the project in the showcase UI (`self-host/apps/portfolio/frontend/src/app/projects/page.tsx`).
5. Add or update docs in `docs/` if the platform integration changes.

When adding a new platform infra service:

1. Run `make new-infra slug=<your-infra-slug> name="<Infra Name>"` (scaffolds from `self-host/infra/_template`, including its deploy workflow).
2. Fill in `docker-compose.yml`, `README.md`, `.env.example`.
3. It's picked up automatically by `wsl-startup.sh`'s auto-discovery — no separate registration step.

For detailed PR expectations, naming, and review standards, see `CONTRIBUTING.md`.

## Extract-to-Standalone Readiness

Design every project so it can be split into its own repository later.

A project is usually ready to extract when at least 3 are true:

- independent release cadence,
- separate ownership/team,
- distinct security/compliance profile,
- mostly independent CI/runtime,
- roadmap diverges from core platform work.

If extraction is needed, the expected path is mostly moving `self-host/apps/<slug>` and keeping integration contracts intact.
