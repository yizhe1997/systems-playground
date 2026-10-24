# hindsight

Platform-wide infrastructure service — shared across everything on the host, not scoped to a single showcase project. See [the monorepo guide](../../../docs/MONOREPO_GUIDE.md) for the infra vs apps distinction.

## What this runs

[Hindsight](https://github.com/vectorize-io/hindsight) (MIT) — a self-hosted agent memory service. Any harness (Claude Code on any machine, the DeepSeek harness, future ones) stores and recalls memory through one HTTP API or MCP endpoint, so memory follows the user instead of living on one device. It is infra, not an app, because every agent on the host shares it.

| Service | Image | Role |
|---|---|---|
| `hindsight` | `ghcr.io/vectorize-io/hindsight` (pinned) | API + MCP on `8888`, Control Plane UI on `9999`. Bundles local embedding and reranker models. |
| `db` | `pgvector/pgvector:pg16` | Hindsight's store. Named volume `postgres_data`. |
| `ui-route` | `alpine` | Does nothing but carry the tunnel labels for the Control Plane UI (the sync reads one hostname per container). No network, read-only, no capabilities. |

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

Nothing is published until `HOST` is set; then `memory.<HOST>` routes to port `8888` via `cloudflared-sync.sh` (label on the container). The only gate on `8888` is the bearer key, so keep it long and rotate it by changing the Infisical value and redeploying.

### Control Plane UI (`memory-ui.<HOST>`)

The UI (port `9999`) holds the API key, so anyone who reaches it has full access. It always binds to loopback (`http://localhost:9999` on the host, or an SSH tunnel), and is published only when its Cloudflare Access application exists: the `ui-route` service carries the tunnel labels and leaves the hostname empty until `HINDSIGHT_UI_ACCESS_AUD` is set. With the AUD tag and `CF_ACCESS_TEAM` both set, `cloudflared` also rejects any request lacking a valid Access token for this application, so a deleted or mis-scoped policy cannot expose it. A half-set pair leaves it unrouted (see `cloudflared-sync.sh`).

1. **Login method.** Zero Trust → Integrations → Identity providers: *One-time PIN* must be listed (the dsh setup already uses it).
2. **Policy.** Zero Trust → Access controls → Policies. Reuse dsh's *Allow* policy for your own email, or add one the same way (session 24 hours, never a *Bypass*).
3. **Application.** Access controls → Applications → Create new application → Self-hosted and private → Add public hostname. Domain `<HOST>`, subdomain `memory-ui` (or your `HINDSIGHT_UI_SUBDOMAIN`), no path. Attach the policy, enable *One-time PIN*, Create.
4. **HTTPS.** Zone → SSL/TLS → Edge Certificates → *Always Use HTTPS* (zone-wide; already on if dsh is set up).
5. **Copy the Audience (AUD) tag.** Applications → *Configure* on the new application → *Additional settings*. It is an identifier, not a secret.
6. **Publish.** GitHub → Settings → Secrets and variables → Actions → *Variables*: set `HINDSIGHT_UI_ACCESS_AUD` to the tag (`CF_ACCESS_TEAM` is already set for dsh), then run *Deploy Infra - Hindsight*. Within about 30 seconds `cloudflared-sync.sh` adds the route and DNS record.
7. **Verify from outside.** An unauthenticated request must redirect to `cloudflareaccess.com`, never reach the UI:

```bash
curl -sI https://memory-ui.<HOST>/ | grep -i -E "^HTTP|^location"
```

The bearer key on the API hostname is separate: the Access policy does not apply to `memory.<HOST>`, so MCP clients and the hooks are unaffected.

Do not put Cloudflare Access's interactive login in front of it: MCP clients cannot complete the browser flow. If you want a second gate, use an Access *service token* policy and send its two headers from the client.

## Connecting a client

Claude Code (any machine), one bank per project via the URL, or one default bank:

```bash
claude mcp add --transport http hindsight https://memory.<HOST>/mcp/<bank-id>/ \
  --header "Authorization: Bearer <HINDSIGHT_TENANT_API_KEY>"
```

Any other harness: plain HTTP against `https://memory.<HOST>` with the same `Authorization` header (`retain` on the way out, `recall` before a prompt). Interactive API docs are at `/docs`.

## Claude Code memory (automatic)

Claude Code uses Hindsight's own package, [`@vectorize-io/hindsight-coding-agents`](https://hindsight.vectorize.io/sdks/integrations/coding-agents), which adds recall, write-back and `hindsight_*` tools through hooks and an MCP server. It replaces the hook script this repo used to carry. Install on each machine:

```bash
npx @vectorize-io/hindsight-coding-agents install claude-code --server self-hosted --api-url https://memory.<HOST>
```

then edit `~/.hindsight/coding-agent.json` (it holds the bearer key, so it stays out of the repo). The settings used here, chosen to keep extraction cost down and memory shared across harnesses:

```json
{ "apiUrl": "https://memory.<HOST>", "apiToken": "<HINDSIGHT_TENANT_API_KEY>", "bankId": "personal",
  "autoInject": "recall", "retainExtractionMode": "concise", "gitIngest": "none", "autoSeed": false,
  "codebaseSurvey": false, "pageTriggerCron": "0 4 * * *", "autoUpdate": false }
```

`bankId: "personal"` keeps one bank shared with other harnesses (the default is one bank per repo). `autoInject: "recall"` avoids the default low-budget reflect at the first prompt, `codebaseSurvey: false` keeps it from spending Claude tokens, and `autoUpdate: false` pins the version. The installer also registers its own MCP server named `hindsight`, which replaces a direct HTTP entry of that name. Check a machine with the `hindsight_diagnose` tool, or `npx @vectorize-io/hindsight-coding-agents stats`. Verified on one machine only: recall injected at prompt time, and the whole conversation retained (a completed retain, 93 facts) at a size of about 280k characters, far larger than the old condensed transcript, so watch the extraction key's spend.

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
