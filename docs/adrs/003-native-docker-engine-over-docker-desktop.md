# ADR 003: Native Docker Engine Instead of Docker Desktop's WSL2 Integration

**Date:** 2026-07-18
**Status:** Accepted

### Context
The host runs WSL2 with an Ubuntu distro, and `bootstrap.sh` / `docs/DEPLOYMENT.md` (then named `docs/DEPLOYMENT_WSL.md` — renamed after this ADR, once the doc's WSL-only framing was corrected too) previously assumed Docker on that host meant Docker Desktop for Windows with "WSL Integration" enabled — Docker Desktop runs the actual engine inside its own hidden WSL2 distros and bridges the `docker` CLI into the user's distro via forwarded sockets and CLI-plugin symlinks. `bootstrap.sh` special-cased this: on a detected-WSL host it printed manual "go install Docker Desktop" instructions and skipped installing anything itself, since Docker Desktop can't be installed from inside WSL bash.

That assumption turned out to be wrong for this host: a native `dockerd` was already running directly inside the Ubuntu distro, independent of Docker Desktop. Docker Desktop's WSL integration toggle was enabled but contributed nothing except CLI-plugin symlinks (`docker compose`, `buildx`, etc.) pointing into Docker Desktop's own mount — disabling that toggle leaves those symlinks dangling (`docker: unknown command: docker compose`) even though the native engine underneath is unaffected. Fix: remove the stale symlink directory and let the `docker-compose-plugin` apt package provide real (non-symlink) plugins in its place. This gotcha is now documented in `docs/DEPLOYMENT.md` for anyone migrating an existing host off Docker Desktop's integration.

### Options Considered
1. **Keep the Docker-Desktop-for-WSL assumption**, fix `bootstrap.sh`/docs to accurately describe how to enable WSL Integration. Rejected: this would have committed the docs and script to describing a setup this host doesn't actually use, since native Docker Engine was already the real runtime.
2. **Formalize native Docker Engine as the supported runtime for WSL2 hosts**, matching what bare-metal Ubuntu hosts already do, and remove the WSL-Desktop branch from `bootstrap.sh` entirely.
3. **Move to Docker Desktop deliberately** (uninstall the native engine, rely solely on Desktop's integration). Rejected: adds a second, heavier install (a Windows GUI app) with no benefit over the native engine already running — WSL2's real Linux kernel makes Docker Desktop's translation layer unnecessary for a headless self-hosted server use case.

### Decision
We chose **Option 2**: native Docker Engine (installed via `apt`, same steps on WSL2 or bare-metal Ubuntu) is the supported runtime. `bootstrap.sh`'s Docker step no longer branches on WSL detection — see the diff in `scripts/bootstrap.sh` (the `IS_WSL` detection block and the three-way Docker branch were both removed in favor of a single "already working / else install natively" check). `docs/DEPLOYMENT.md` is corrected to match, with a disclaimer for hosts that previously had Docker Desktop's WSL integration enabled (see the CLI-plugin-symlink gotcha above).

### Reasoning
WSL2 runs an actual Linux kernel (not a compatibility shim like WSL1), so Docker Engine installs and behaves on it exactly as it would on bare-metal Ubuntu — systemd/`service` works, `dockerd` binds the same socket, `docker-ce`/`docker-compose-plugin` come from the same apt repo. There is no technical reason specific to WSL2 that requires Docker Desktop. Docker Desktop's actual value-add — a GUI, a Windows-native menu-bar app, easy start/stop toggling — is aimed at interactive desktop development, not a headless server that's supposed to `docker compose up -d` its services once and stay running unattended. For this host's use case (self-hosted CI/CD runner + always-on infra services), the native engine is simpler (one less moving part, no dependency on a separate Windows application staying running and its integration toggle staying correctly configured) and was, in practice, already what was running.

Docker Desktop is not being removed from Windows — it remains available for other local Windows development work — but its WSL Integration toggle for this Ubuntu distro should stay off, since enabling it re-introduces the CLI-plugin-shim overlap without providing anything the native engine doesn't already do for this host.

### Consequences
**Positive:**
- `bootstrap.sh` is simpler: one Docker code path instead of three, no WSL-detection logic to maintain or keep in sync with actual host behavior.
- Fresh-host bootstrap on a new WSL2 machine now fully automates Docker install — no more "go click through the Docker Desktop installer, come back and re-run this script" manual step.
- Documented, discoverable gotcha (CLI-plugin symlinks going dangling) for anyone else migrating an existing WSL2 host off Docker Desktop's integration, instead of a confusing `docker: unknown command` error with no obvious cause.

**Negative / accepted tradeoffs:**
- Anyone who genuinely wants Docker Desktop's GUI for managing this host's containers loses that option unless they re-enable WSL integration (and re-accept the CLI-plugin overlap risk if they ever disable it again).
