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
    *   **Public Landing Page & Admin UI:** `http://localhost:3000` (mapped to `8081` when running in prod)
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
