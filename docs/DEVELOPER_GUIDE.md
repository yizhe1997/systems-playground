# Developer Guide

## 🏗️ Architectural Decisions
*   **Backend:** Golang (Fiber). Chosen for its concurrency model (goroutines) which makes handling WebSockets and Message Queues lightweight and fast. Plus, compiling down to a single binary makes the Docker image extremely small.
*   **Frontend:** Next.js (App Router) & Tailwind CSS. Next.js provides a robust React framework for our Landing Page and Admin UI, while Tailwind allows for rapid styling.
*   **Container Orchestration (Scale-to-Zero):** Docker Compose + Go API. By mapping the Docker socket (`/var/run/docker.sock`) into the Go backend, the Go API acts as a control plane. This is essential for our **Scale-to-Zero architecture**—the API can dynamically start/stop heavy containers (Redis, RabbitMQ) only when a demo is active, shutting them down automatically after inactivity to save RAM on the host.
*   **Infrastructure:** Redis (for caching) and RabbitMQ (for message queues). These are the industry standard tools for these use-cases and demonstrate real-world system architecture.

*For detailed architectural logs, see the ADRs under [`self-host/apps/portfolio/adrs/`](../self-host/apps/portfolio/adrs/) (platform-wide decisions, if any, live under [`docs/adrs/`](adrs/)).*

## 🚀 How to Start the Services

### Prerequisites
*   Docker & Docker Compose must be installed, whether that's your local machine or the host (see [`docs/DEPLOYMENT_WSL.md`](DEPLOYMENT_WSL.md) for what "the host" is).
*   *Note:* You do **not** need Go or Node.js installed locally to run the project. Everything is containerized.

### Running the Full Stack

There is no root-level compose file — each project under `self-host/apps/` runs independently. For the flagship portfolio project:

1.  Navigate to `self-host/apps/portfolio/`.
2.  Run the following command:
    ```bash
    docker compose up --build -d
    ```
3.  Once the containers spin up, you can access the applications at:
    *   **Public Landing Page & Admin UI:** `http://localhost:8086`
    *   **Golang API:** `http://localhost:8085/health`
    *   **RabbitMQ Management UI:** `http://localhost:15672` (if you want to peek under the hood)

`docker-compose.override.yml` is auto-loaded for local dev (builds from source). Production/self-hosted runs instead merge `docker-compose.prod.yml` (pre-built images from the self-hosted registry + Watchtower labels) — see [`docs/DEPLOYMENT_WSL.md`](DEPLOYMENT_WSL.md).

Other projects under `self-host/apps/<slug>/` follow the same pattern; see each project's own `README.md`.

### Useful Commands
*   To view the logs of all services in real-time:
    ```bash
    docker compose logs -f
    ```
*   To stop the entire stack:
    ```bash
    docker compose down
    ```

---

## 🧩 Monorepo Project Development

Systems Playground supports multiple showcase projects under `self-host/apps/`.

When adding a project:

1. Copy `self-host/apps/_template/` to `self-host/apps/<project-slug>/`.
2. Complete the project docs (`README.md`, `ARCHITECTURE.md`) and `.env.example`.
3. Add project run/test scripts under `scripts/`.
4. Register your project in the [showcase UI](../self-host/apps/portfolio/frontend/src/app/projects/page.tsx) so it appears.

For full boundaries, extraction readiness, and architecture rules, see:

- [`docs/MONOREPO_GUIDE.md`](MONOREPO_GUIDE.md)
- [`CONTRIBUTING.md`](../CONTRIBUTING.md)
