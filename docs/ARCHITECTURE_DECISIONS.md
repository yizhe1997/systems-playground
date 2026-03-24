# Architecture Decision Records (ADR)

This document tracks pivotal architectural and design decisions made during the development of the Systems Playground. It serves as a historical record of *why* certain paths were chosen over alternatives.

---

## ADR 001: Custom Go Control Plane vs. Portainer for Infrastructure Management

**Date:** 2026-03-22
**Status:** Accepted

### Context
The Systems Playground requires backend services (Redis, RabbitMQ, Kafka, etc.) to demonstrate concepts. However, the host machine is a NUC with limited hardware resources (RAM/CPU). Running a dozen enterprise infrastructure containers 24/7 is not feasible and will crash the server.

We needed a way to manage the lifecycle of these containers.

### Options Considered
1. **Portainer / Traefik:** Industry-standard tools for container management.
2. **Custom Golang API via `docker.sock`:** Building a custom control plane that mounts the host's Docker socket to manage specific containers.

### Decision
We chose the **Custom Golang API**.

### Reasoning
1. **Scale-to-Zero (Resource Conservation):** Portainer is a manual dashboard. If a recruiter starts a RabbitMQ demo, they will likely not remember to stop it. Our custom Go API allows us to implement "Scale-to-Zero" logic—automatically issuing `ContainerStop` commands after a period of inactivity. This is strictly required to protect the NUC's memory.
2. **Security & Scope:** Exposing a Portainer iframe to the public internet creates a massive attack surface. If compromised, the attacker gains root access to the entire NUC. The custom Go API is restricted (via Docker labels like `playground.widget=queue`) to *only* interact with portfolio containers, completely isolating it from private home-server services running on the same NUC.
3. **Seamless UX:** A custom API allows us to build toggle buttons directly into the Next.js portfolio UI, creating a cohesive "magic" experience without redirecting users to a third-party IT dashboard.
4. **Demonstrable Engineering Depth:** Building a control plane demonstrates a deep understanding of container orchestration, SDKs, and system design—perfectly aligning with the goal of a senior-level developer portfolio.
