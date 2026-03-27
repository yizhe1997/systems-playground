# Architecture Decision Records (ADR)

This document tracks pivotal architectural and design decisions made during the development of the Systems Playground. It serves as a historical record of *why* certain paths were chosen over alternatives.

---

## ADR 001: Custom Go Control Plane vs. Portainer for Infrastructure Management
*(See previous entries for details on Scale-to-Zero architecture).*

---

## ADR 002: Backend-For-Frontend (BFF) Pattern for API Security

**Date:** 2026-03-27
**Status:** Accepted

### Context
The Systems Playground exposes a Golang Control Plane API that can physically start and stop Docker containers on the host machine via `/var/run/docker.sock`. 
The Next.js React frontend needs to allow authenticated "Admin" users to trigger these endpoints while blocking "Viewer" users. 

### Options Considered
1. **Frontend Pre-Shared Key (PSK):** The Next.js client-side code holds an API key (e.g., `NEXT_PUBLIC_API_KEY`) and sends it directly to the Go backend.
2. **Backend-For-Frontend (BFF) Proxy:** The Next.js client talks to a Next.js server-side API route. The server verifies the user's secure HTTP-only session cookie (JWT) and RBAC role. If valid, the Next.js server acts as a proxy, appending a highly secure, server-side-only PSK to the request before forwarding it to the Golang API.

### Decision
We chose the **Backend-For-Frontend (BFF) Proxy Pattern (Option 2)**.

### Reasoning
1. **Zero-Trust Client Security:** Option 1 is inherently insecure for Single Page Applications (SPAs). Any variable exposed to the browser (`NEXT_PUBLIC_`) can be extracted via Chrome DevTools. If a "Viewer" extracted the PSK, they could bypass the UI role restrictions and `curl` the Go backend directly to execute privileged Docker commands.
2. **Enterprise Architecture Standardization:** Using the Next.js Node server as an API Gateway/BFF is the industry standard for securing microservices. The Golang backend is completely isolated from the public internet (except through the gateway), trusting only internal network requests that carry the server-side PSK.
3. **Stateless Authorization:** By verifying the NextAuth JWT on the Next.js server edge, we avoid needing a shared database or complex distributed session management between the Go and Node.js containers.
