---
title: "Developer Guide"
description: "How to run and manage the Systems Playground."
---

# Developer Guide

## 🏗️ Architectural Decisions
*   **Backend:** Golang (Fiber). Chosen for its concurrency model (goroutines) which makes handling WebSockets and Message Queues lightweight and fast. Plus, compiling down to a single binary makes the Docker image extremely small.
*   **Frontend:** Next.js (App Router) & Tailwind CSS. Next.js provides a robust React framework for our Landing Page and Admin UI, while Tailwind allows for rapid styling.
*   **Container Orchestration (Scale-to-Zero):** Docker Compose + Go API. By mapping the Docker socket (`/var/run/docker.sock`) into the Go backend, the Go API acts as a control plane. This is essential for our **Scale-to-Zero architecture**—the API can dynamically start/stop heavy containers (Redis, RabbitMQ) only when a demo is active, shutting them down automatically after inactivity to save RAM on the host machine (NUC).
*   **Infrastructure:** Redis (for caching) and RabbitMQ (for message queues). These are the industry standard tools for these use-cases and demonstrate real-world system architecture.

*For detailed architectural logs, please refer to `ARCHITECTURE_DECISIONS.md`.*

## 🚀 How to Start the Services

### Prerequisites
*   Docker & Docker Compose must be installed on your machine (or the NUC).
*   *Note:* You do **not** need Go or Node.js installed locally to run the project. Everything is containerized.

### Running the Full Stack
1.  Navigate to the root of the repository.
2.  Run the following command:
    ```bash
    docker-compose up --build -d
    ```
3.  Once the containers spin up, you can access the applications at:
    *   **Public Landing Page & Admin UI:** `http://localhost:3000` (mapped to `8086` when running in prod)
    *   **Golang API:** `http://localhost:8085/health`
    *   **RabbitMQ Management UI:** `http://localhost:15672` (if you want to peek under the hood)

### Useful Commands
*   To view the logs of all services in real-time:
    ```bash
    docker-compose logs -f
    ```
*   To stop the entire stack:
    ```bash
    docker-compose down
    ```

---

## 🤖 Feature Development with Speckit

This project uses [**Speckit**](https://github.com/github/spec-kit) — an AI-assisted specification workflow that turns a feature idea into a spec, an implementation plan, and a task list before a single line of code is written. All speckit artifacts live under `.specify/`.

### End-to-End Workflow

For any non-trivial feature, follow these steps in order:

1. **Specify** — Describe the feature in natural language. The agent produces a structured spec at `.specify/specs/<###-feature-name>/spec.md`.
   ```
   @speckit.specify <describe the feature here>
   ```

2. **Plan** — The agent reads the spec, researches the codebase, and produces an implementation plan (`plan.md`), a data model, API contracts, and a quickstart guide.
   ```
   @speckit.plan
   ```

3. **Generate tasks** — The agent converts the plan into a dependency-ordered task list (`tasks.md`) grouped by user story so each story is independently deliverable.
   ```
   @speckit.tasks
   ```

4. **Implement** — The agent works through `tasks.md` task-by-task, respecting the constitution gates in `plan.md`.
   ```
   @speckit.implement
   ```

At every step the agent verifies the [Constitution](.specify/memory/constitution.md) gates defined in `plan.md` (separation of concerns, clean architecture, BFF security, scale-to-zero, Turbopack compatibility, IaC). A feature PR MUST NOT be raised unless all gates are ✅.

### Migrating Away from GitHub Copilot

Speckit is intentionally agent-agnostic. The workflow artifacts (`.specify/memory/constitution.md`, `spec.md`, `plan.md`, `tasks.md`) are plain Markdown and carry no Copilot-specific tooling inside them.

To switch to a different AI agent (e.g., Cursor, Claude Code, Windsurf):

1. **Copy the prompt files** — `.github/prompts/speckit.*.prompt.md` define each command's instructions. Port them to your new agent's equivalent instruction format (e.g., `.cursor/rules/`, `CLAUDE.md` includes, or custom slash-commands).
2. **Update agent guidance files** — `frontend/AGENTS.md` and `frontend/CLAUDE.md` already demonstrate the pattern. Create equivalent files for the new agent and point them at the same content.
3. **Keep the constitution** — `.specify/memory/constitution.md` is the single source of truth for project rules. The new agent MUST read it at the start of every speckit command.
4. **Validate tool availability** — Each prompt uses file-system and search tools. Confirm the replacement agent exposes equivalent capabilities (read file, grep, write file, run terminal).
5. **Run a smoke test** — Re-run `@speckit.specify` on a small existing feature and verify the output matches the template in `.specify/templates/spec-template.md`.

The constitution and all spec artifacts remain unchanged; only the agent invocation mechanism changes.

---

## 🧩 Monorepo Project Development

Systems Playground now supports multiple showcase projects under `projects/`.

When adding a project:

1. Copy `projects/_template/` to `projects/<project-slug>/`.
2. Complete the project docs (`README.md`, `ARCHITECTURE.md`) and `.env.example`.
3. Add project run/test scripts under `scripts/`.
4. Register your project in `frontend/src/app/projects/page.tsx` so it appears in the showcase.

For full boundaries, extraction readiness, and architecture rules, see:

- `docs/MONOREPO_GUIDE.md`
- `CONTRIBUTING.md`

### Gold Futures Copilot Project Notes

- Project path: `projects/gold-futures-copilot/`
- Start deps: `docker compose -f projects/gold-futures-copilot/docker-compose.project.yml up -d`
- Backend check: `cd projects/gold-futures-copilot/backend && go test ./...`
- Project test harness: `bash projects/gold-futures-copilot/scripts/test.sh`
