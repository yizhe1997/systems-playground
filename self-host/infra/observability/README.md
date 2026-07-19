# Observability

Platform-wide infrastructure service — shared across everything on the host, not scoped to a single showcase project. See [the monorepo guide](../../../docs/MONOREPO_GUIDE.md) for the infra vs apps distinction.

## What this runs

Phase 1 of a planned full LGTM (Loki/Grafana/Tempo/Mimir) observability stack, scoped to infra/host debugging first, with app-level tracing (Tempo) and long-term metrics storage (Mimir) deferred until the portfolio app itself gets instrumented — see "Phase 2" below.

Six services, all on the shared `observability` Docker network so they can reach each other by service name:

| Service | Role | Host port |
|---|---|---|
| **Loki** | Log aggregation backend, filesystem storage, 14-day retention (matches this repo's existing `BACKUP_RETENTION_DAYS` default elsewhere) | `3100` |
| **Promtail** | Ships every container's Docker logs to Loki via Docker service discovery (`/var/run/docker.sock`, read-only) — no per-service config needed, new containers are picked up automatically | not exposed (Loki-push only) |
| **Prometheus** | Scrapes and stores metrics from cAdvisor + node-exporter | `9090` |
| **cAdvisor** | Per-container resource metrics (CPU/memory/network/disk) for every container on the host | `8082` (has its own basic web UI) — not `8080`, its own default: this host's Cloudflare Tunnel already routes an unrelated project to `localhost:8080` |
| **node-exporter** | Host-level metrics (CPU/memory/disk/network of the host itself, not just containers). Runs with `pid: host` — a standard, documented requirement for this exporter to read accurate host process/network state, not a custom elevated-privilege choice for this repo | not exposed (Prometheus-scrape only) |
| **Grafana** | Dashboards — pre-provisioned with the Prometheus + Loki datasources | `3030` — not `3000`, its own default: that's also the most common Next.js/React dev-server port, and would collide with running the portfolio frontend locally |

## One-time manual setup

Grafana ships with both datasources pre-wired (provisioned from `grafana/provisioning/`), but no dashboards — importing them is a two-minute manual step, same category as `cloudflared tunnel login` elsewhere in this repo (genuinely one-time, not worth scripting):

1. Log into Grafana (`http://localhost:3030`, or your Cloudflare Tunnel hostname once you add an ingress entry — see [`docs/DEPLOYMENT.md`](../../../docs/DEPLOYMENT.md) section 1), `admin` / the password from `GRAFANA_ADMIN_PASSWORD`.
2. **Dashboards → New → Import**, enter dashboard ID `1860` (Node Exporter Full) — covers host-level CPU/memory/disk/network.
3. Repeat with dashboard ID `14282` (cAdvisor / Docker Container & Host Metrics) — covers per-container resource usage.
4. For logs: **Explore** → select the **Loki** datasource → query `{container=~".+"}` to confirm logs are flowing, then build/save a dashboard panel as needed.

## Phase 2 (not built yet)

Tempo (distributed tracing) and Mimir (long-term metrics storage beyond Prometheus's local retention) are deferred until the portfolio app is actually instrumented with OpenTelemetry — deploying them now, with nothing producing traces or needing more than ~15 days of metrics history, would just be unused services sitting idle.

## Deploy

Deployed automatically by [`.github/workflows/deploy-infra-observability.yml`](../../../.github/workflows/deploy-infra-observability.yml) whenever `self-host/infra/observability/**` changes on `main` — copies the whole directory (compose file, `loki-config.yaml`, `promtail-config.yaml`, `prometheus.yml`, `grafana/provisioning/`) to the host, then `docker compose up -d`. Also started on host boot: `self-host/infra/scripts/wsl-startup.sh` auto-discovers any `self-host/infra/*/docker-compose.yml`, so no separate registration step is needed there.

**Before first deploy:** set `GRAFANA_ADMIN_PASSWORD` in Infisical's `prod` environment (same mechanism as every other infra secret — see [ADR 002](../../../docs/adrs/002-infisical-secret-injection.md)). No fallback default — the deploy fails loudly if it's missing, deliberately, same convention as `REGISTRY_HOST`/`REGISTRY_USERNAME`/`REGISTRY_PASSWORD`.
