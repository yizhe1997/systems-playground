# hindsight

Platform-wide infrastructure service — shared across everything on the host, not scoped to a single showcase project. See [the monorepo guide](../../../docs/MONOREPO_GUIDE.md) for the infra vs apps distinction.

## What this runs

[Hindsight](https://github.com/vectorize-io/hindsight) (MIT) — a self-hosted agent memory service. Any harness (Claude Code on any machine, the DeepSeek harness, future ones) stores and recalls memory through one HTTP API or MCP endpoint, so memory follows the user instead of living on one device. It is infra, not an app, because every agent on the host shares it.

| Service | Image | Role |
|---|---|---|
| `hindsight` | `ghcr.io/vectorize-io/hindsight` (pinned) | API + MCP on `8888`, Control Plane UI on `9999`. Bundles local embedding and reranker models. |
| `db` | `pgvector/pgvector:pg16` | Hindsight's store. Named volume `postgres_data`. |

An LLM extracts facts on every `retain`, so a model key is needed (default: OpenRouter, DeepSeek model). Embeddings run locally inside the image.

## Deploy

Deployed by `.github/workflows/deploy-infra-hindsight.yml` whenever `self-host/infra/hindsight/**` changes on `main`, with secrets from Infisical (`prod`):

- `HINDSIGHT_POSTGRES_PASSWORD`
- `HINDSIGHT_TENANT_API_KEY` — the bearer key clients send. Generate with `openssl rand -hex 32`.
- `HINDSIGHT_LLM_API_KEY` — a dedicated key with a spend limit; do not reuse dsh's.

Repository variables: `HOST` (already used by other services). `HINDSIGHT_SUBDOMAIN` is optional (default `memory`).

**Boot.** `wsl-startup.sh` runs a bare `docker compose up -d` here with no secrets. The three secrets carry `:?` guards, so that run fails closed instead of recreating the container with empty keys, and `restart: unless-stopped` brings the existing containers back. Manual runs on the host need the same environment: use the workflow, or `infisical run -- docker compose up -d`.

**Version bumps are manual.** The image tag is pinned and the service is not watchtower-enabled, because an unattended upgrade can migrate the memory schema. Change the tag in `docker-compose.yml` and redeploy.

## Going public

Nothing is published until `HOST` is set; then `memory.<HOST>` routes to port `8888` via `cloudflared-sync.sh` (label on the container). Port `9999` (Control Plane UI) is never routed and binds to loopback only. The only gate on `8888` is the bearer key, so keep it long and rotate it by changing the Infisical value and redeploying.

Do not put Cloudflare Access's interactive login in front of it: MCP clients cannot complete the browser flow. If you want a second gate, use an Access *service token* policy and send its two headers from the client.

## Connecting a client

Claude Code (any machine), one bank per project via the URL, or one default bank:

```bash
claude mcp add --transport http hindsight https://memory.<HOST>/mcp/<bank-id>/ \
  --header "Authorization: Bearer <HINDSIGHT_TENANT_API_KEY>"
```

Any other harness: plain HTTP against `https://memory.<HOST>` with the same `Authorization` header (`retain` on the way out, `recall` before a prompt). Interactive API docs are at `/docs`.

## Verify

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://memory.<HOST>/health           # 200, liveness is open
curl -s -o /dev/null -w "%{http_code}\n" https://memory.<HOST>/v1/default/banks # 401 without the key
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer <key>" \
  https://memory.<HOST>/v1/default/banks                                        # 200 with it
```

`/health`, `/docs` and `/openapi.json` are reachable without the key (they expose the API shape, not data); everything else, including `/mcp/...`, returns 401. Checked against the pinned image with throwaway keys.

## Not covered yet

- **Backups.** `wsl-backup.sh` snapshots this volume live; it is not on that script's explicit Postgres quiesce list, so a snapshot taken mid-write may not restore cleanly. Add `hindsight` to that list before relying on it.
- **Retention quality.** Whether DeepSeek via OpenRouter extracts memories well enough is untested; swap the model with `HINDSIGHT_LLM_*` and compare.
