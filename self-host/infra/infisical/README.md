# Infisical

Platform-wide infrastructure service — shared across everything on the host, not scoped to a single showcase project. See [the monorepo guide](../../../docs/MONOREPO_GUIDE.md) for the infra vs apps distinction.

## What this runs

Self-hosted [Infisical](https://infisical.com) — a secrets manager. It replaces the current pattern of secrets living only in GitHub's encrypted store and getting written out as plaintext `.env` files on the runner host during every deploy (see [ADR 001](../../../docs/adrs/001-cicd-secrets-and-runner-trust-boundary.md) for the problem this creates). Once bootstrapped, deploy workflows fetch secrets from here at deploy time via `infisical run -- <command>`, which injects them directly into the deployed process's environment and never writes them to disk. See [ADR 002](../../../docs/adrs/002-infisical-secret-injection.md) for the full reasoning.

Runs three containers: `backend` (Infisical itself), `db` (dedicated Postgres — not shared with n8n's), `redis` (dedicated Redis — not shared with the portfolio app's). Dedicated datastores were a deliberate choice: this service ends up holding the keys to everything else running on the host, so it doesn't share a failure domain with anything else.

**Exposure:** recommended default is Cloudflare Tunnel + Cloudflare Access in front (not just Infisical's own login) so you can manage secrets remotely without putting your secrets manager's login page nakedly on the public internet. Add an ingress entry in `~/.cloudflared/config.yml` pointing at this container's local port (see [docker-compose.yml](./docker-compose.yml)), then create an Access application + policy for that hostname in the Cloudflare Zero Trust dashboard (account-level config, not part of this repo). If you'd rather not expose it at all, skip the tunnel entry and manage it via SSH tunnel / Tailscale into the WSL host instead — nothing here requires public exposure to function for CI.

## Bootstrap (one-time, manual — cannot be automated via CI since nothing else can authenticate to this yet)

1. Deploy this service (push to `main`, or run the workflow manually) and confirm `backend` is healthy.
2. Visit the instance (internal address or the Cloudflare-Access-gated hostname) and create the initial admin account + organization.
3. Create a project (e.g. `systems-playground`) with environments matching what you need (e.g. `prod`).
4. Re-enter the secrets currently sitting in GitHub Secrets/Variables and in the various infra services' `.env` files into the appropriate Infisical project/environment. Do this once per secret — this is the migration, not a duplication you maintain going forward.
5. Create a **Machine Identity** (Infisical's term for a service account) with Universal Auth, scoped to this project.
6. Add four values as GitHub repo Variables/Secrets — this is what every migrated workflow actually authenticates with (not a single static token):
   - `INFISICAL_SITE_URL` (var) — this instance's URL. Optional in practice: every workflow falls back to `localhost` on this container's own port (see [docker-compose.yml](./docker-compose.yml)) if unset, which is always correct for the self-hosted runner since it shares a host with this container. Only needs to be set explicitly if the runner ever reaches Infisical some other way (different host, tunnel, etc).
   - `INFISICAL_CLIENT_ID` (var) — the Machine Identity's client ID
   - `INFISICAL_CLIENT_SECRET` (secret) — the Machine Identity's client secret
   - `INFISICAL_PROJECT_ID` (var) — the project's ID
   Each workflow exchanges the client ID/secret for a short-lived token at the start of its run (`infisical login --method=universal-auth`), rather than shipping one long-lived token around.

### Secrets that must exist in the `prod` environment before each service's deploy workflow will succeed

Each was previously a plain GitHub Secret/Variable and is now fetched live via `infisical run`. Enter the current value from GitHub into Infisical under the same key name, then delete the GitHub Secret/Variable once a deploy has succeeded with it coming from here instead.

| Name | Service(s) | Required? | Falls back to |
|---|---|---|---|
| `REGISTRY_USERNAME` | shared: all 3 build workflows, `deploy-app-portfolio.yml`, `deploy-infra-n8n.yml`, `deploy-infra-registry.yml` | Yes | — |
| `REGISTRY_PASSWORD` | same as above | Yes | — |
| `REGISTRY_HOST` | same as above | No | `localhost:5000` |
| `ADMIN_API_KEY` | portfolio | Yes | — |
| `SMTP_EMAIL` | portfolio | Yes | — |
| `SMTP_PASSWORD` | portfolio | Yes | — |
| `RESUME_WEBHOOK_URL` | portfolio | Yes | — |
| `FILEBROWSER_PUBLIC_URL` | portfolio | Yes | — |
| `FILEBROWSER_ADMIN_USERNAME` | portfolio | Yes | — |
| `FILEBROWSER_ADMIN_PASSWORD` | portfolio | Yes | — |
| `NEXTAUTH_SECRET` | portfolio | Yes | — |
| `NEXTAUTH_URL` | portfolio | Yes | — |
| `GOOGLE_CLIENT_ID` | portfolio | Yes | — |
| `GOOGLE_CLIENT_SECRET` | portfolio | Yes | — |
| `ADMIN_EMAILS` | portfolio | Yes | — |
| `N8N_POSTGRES_PASSWORD` | n8n | Yes | — |
| `N8N_BASIC_AUTH_PASSWORD` | n8n | Yes | — |
| `N8N_POSTGRES_USER` | n8n | No | `n8n` |
| `N8N_BASIC_AUTH_USER` | n8n | No | `admin` |
| `N8N_HOST` | n8n | No | `http://localhost:5678` |
| `WATCHTOWER_DISCORD_URL` | watchtower | Yes | — |

A few things the table doesn't show:

- Docker Hub is gone — replaced by the self-hosted `registry:2` instance (`self-host/infra/registry/`), auth required for both push and pull. The old `DOCKER_USERNAME`/`DOCKER_PASSWORD` are unused now and can be deleted from Infisical/GitHub.
- `REGISTRY_HOST`'s `localhost:5000` default is always correct for CI, since every build/deploy workflow runs on the same host as the registry container (port hardcoded in its compose file) — only set it explicitly if you need these workflows to reach the registry through its public/tunnel hostname instead.
- n8n additionally depends on the shared `REGISTRY_*` secrets above, since it now pulls a prebuilt image instead of building locally.

### What stays on plain GitHub Secrets/Variables (deliberately not migrated)

| Name(s) | Why it stays put |
|---|---|
| `INFISICAL_POSTGRES_USER`, `INFISICAL_POSTGRES_DB`, `INFISICAL_POSTGRES_PASSWORD`, `INFISICAL_ENCRYPTION_KEY`, `INFISICAL_AUTH_SECRET`, `INFISICAL_SITE_URL` | Root-of-trust — Infisical can't hold the keys that create Infisical. |
| `LOGDIR`, `CLOUDFLARED_LOG_DIR`, `TUNNEL_NAME`, `DISCORD_WEBHOOK_INFRA_ALERTS`, `BACKUP_DIR`, `BACKUP_RETENTION_DAYS` ([`deploy-infra-scripts.yml`](../../../.github/workflows/deploy-infra-scripts.yml)) | Consumed by `wsl-startup.sh`/`wsl-shutdown.sh`/`wsl-backup.sh` at host boot via Windows Task Scheduler — no CI parent process for `infisical run` to inject into, and Infisical itself isn't running yet at that point anyway. Same chicken-and-egg problem as the row above. See [the scripts README](../scripts/README.md) for which of these are actually required vs. optional. |

Two fallback exceptions to the "no silent defaults" rule used everywhere else in this repo — don't remove either: `INFISICAL_POSTGRES_USER`/`INFISICAL_POSTGRES_DB` keep `|| 'infisical'` in [`deploy-infra-infisical.yml`](../../../.github/workflows/deploy-infra-infisical.yml) (YZ's explicit choice), and `INFISICAL_SITE_URL` keeps its `localhost` fallback everywhere it's read — matches this service's own [docker-compose.yml](./docker-compose.yml), so it's always correct, not a risky placeholder.

## Deploy

Deployed automatically by [`deploy-infra-infisical.yml`](../../../.github/workflows/deploy-infra-infisical.yml) whenever `self-host/infra/infisical/**` changes on `main`. Also started on host boot: [`wsl-startup.sh`](../scripts/wsl-startup.sh) auto-discovers any `self-host/infra/*/docker-compose.yml`, so no separate registration step is needed there.

Note the bootstrap order dependency: this must be deployed and manually configured (steps above) *before* other workflows are migrated to pull secrets from it (see task tracked for migrating `deploy-app-portfolio.yml` and the other `deploy-infra-*.yml` workflows to `infisical run`).
