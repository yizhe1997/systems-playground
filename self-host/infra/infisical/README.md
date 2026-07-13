# Infisical

Platform-wide infrastructure service — shared across everything on the host, not scoped to a single showcase project. See `docs/MONOREPO_GUIDE.md` for the infra vs apps distinction.

## What this runs

Self-hosted [Infisical](https://infisical.com) — a secrets manager. It replaces the current pattern of secrets living only in GitHub's encrypted store and getting written out as plaintext `.env` files on the runner host during every deploy (see `docs/adrs/001-cicd-secrets-and-runner-trust-boundary.md` for the problem this creates). Once bootstrapped, deploy workflows fetch secrets from here at deploy time via `infisical run -- <command>`, which injects them directly into the deployed process's environment and never writes them to disk. See `docs/adrs/002-infisical-secret-injection.md` for the full reasoning.

Runs three containers: `backend` (Infisical itself), `db` (dedicated Postgres — not shared with n8n's), `redis` (dedicated Redis — not shared with the portfolio app's). Dedicated datastores were a deliberate choice: this service ends up holding the keys to everything else running on the host, so it doesn't share a failure domain with anything else.

**Exposure:** recommended default is Cloudflare Tunnel + Cloudflare Access in front (not just Infisical's own login) so you can manage secrets remotely without putting your secrets manager's login page nakedly on the public internet. Add an ingress entry in `~/.cloudflared/config.yml` pointing at `localhost:8090`, then create an Access application + policy for that hostname in the Cloudflare Zero Trust dashboard (account-level config, not part of this repo). If you'd rather not expose it at all, skip the tunnel entry and manage it via SSH tunnel / Tailscale into the WSL host instead — nothing here requires public exposure to function for CI.

## Bootstrap (one-time, manual — cannot be automated via CI since nothing else can authenticate to this yet)

1. Deploy this service (push to `main`, or run the workflow manually) and confirm `backend` is healthy.
2. Visit the instance (internal address or the Cloudflare-Access-gated hostname) and create the initial admin account + organization.
3. Create a project (e.g. `systems-playground`) with environments matching what you need (e.g. `prod`).
4. Re-enter the secrets currently sitting in GitHub Secrets/Variables and in the various infra services' `.env` files into the appropriate Infisical project/environment. Do this once per secret — this is the migration, not a duplication you maintain going forward.
5. Create a **Machine Identity** (Infisical's term for a service account) with Universal Auth, scoped to this project.
6. Add four values as GitHub repo Variables/Secrets — this is what every migrated workflow actually authenticates with (not a single static token):
   - `INFISICAL_SITE_URL` (var) — this instance's URL. Optional in practice: every workflow falls back to `http://localhost:8090` if unset, which is always correct for the self-hosted runner since it lives on the same host as this container and the compose file hardcodes `8090:8080`. Only needs to be set explicitly if the runner ever reaches Infisical some other way (different host, tunnel, etc).
   - `INFISICAL_CLIENT_ID` (var) — the Machine Identity's client ID
   - `INFISICAL_CLIENT_SECRET` (secret) — the Machine Identity's client secret
   - `INFISICAL_PROJECT_ID` (var) — the project's ID
   Each workflow exchanges the client ID/secret for a short-lived token at the start of its run (`infisical login --method=universal-auth`), rather than shipping one long-lived token around.

### Secrets that must exist in the `prod` environment before each service's deploy workflow will succeed

Each of these was previously a plain GitHub Secret/Variable and is now fetched live via `infisical run`. Enter the current value from GitHub into Infisical under the same key name, then the corresponding GitHub Secret/Variable can be deleted once you've confirmed a successful deploy.

- **Portfolio app:** `ADMIN_API_KEY`, `SMTP_EMAIL`, `SMTP_PASSWORD`, `RESUME_WEBHOOK_URL`, `FILEBROWSER_PUBLIC_URL`, `FILEBROWSER_ADMIN_USERNAME`, `FILEBROWSER_ADMIN_PASSWORD`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS`
- **n8n:** `N8N_POSTGRES_PASSWORD`, `N8N_BASIC_AUTH_PASSWORD` — hard requirements, deploy fails if unset. `N8N_POSTGRES_USER`, `N8N_BASIC_AUTH_USER`, `N8N_HOST` are optional — if not set in Infisical, `deploy-infra-n8n.yml` falls back to `n8n` / `admin` / `http://localhost:5678` respectively (same defaults as before the Infisical migration; deliberately preserved, not every n8n value is a hard requirement).
- **uptime-kuma:** `UPTIME_KUMA_CLOUDFLARED_TOKEN`
- **watchtower:** `WATCHTOWER_DISCORD_URL`

### What stays on plain GitHub Secrets/Variables (deliberately not migrated)

- **This service's own bootstrap values** (`INFISICAL_POSTGRES_USER`, `INFISICAL_POSTGRES_DB`, `INFISICAL_POSTGRES_PASSWORD`, `INFISICAL_ENCRYPTION_KEY`, `INFISICAL_AUTH_SECRET`, `INFISICAL_SITE_URL`) — root-of-trust problem, Infisical can't hold the keys that create Infisical. `INFISICAL_POSTGRES_USER`/`INFISICAL_POSTGRES_DB` deliberately keep `|| 'infisical'` fallback defaults in `deploy-infra-infisical.yml`, unlike every other var in this repo's deploy workflows — YZ's explicit choice, don't remove. `INFISICAL_SITE_URL` deliberately keeps `|| 'http://localhost:8090'` everywhere it's read (`deploy-app-portfolio.yml`, all `deploy-infra-*.yml`) — matches the port hardcoded in this service's own `docker-compose.yml`, so the default is always correct for the self-hosted runner, not a risky placeholder. Don't remove this fallback either.
- **`deploy-infra-scripts.yml`'s values** (`LOGDIR`, `CFLOG`, `TUNNEL_NAME`, `DISCORD_WEBHOOK_INFRA_ALERTS`) — these get written to `$INFRA_BASE_DIR/.env` and sourced by `wsl-startup.sh`/`wsl-shutdown.sh` at host boot via Windows Task Scheduler, entirely outside any CI process. `infisical run` only injects into a process it directly launches; a script invoked independently at boot has no such parent, so there's no way for it to receive Infisical-sourced values without wsl-startup.sh itself calling out to Infisical — which would need Infisical already running before the script that starts Infisical's own container runs. Same category of chicken-and-egg problem as this service's own bootstrap secrets, so it stays as-is.

## Deploy

Deployed automatically by `.github/workflows/deploy-infra-infisical.yml` whenever `self-host/infra/infisical/**` changes on `main`. Also started on host boot: `self-host/infra/scripts/wsl-startup.sh` auto-discovers any `self-host/infra/*/docker-compose.yml`, so no separate registration step is needed there.

Note the bootstrap order dependency: this must be deployed and manually configured (steps above) *before* other workflows are migrated to pull secrets from it (see task tracked for migrating `deploy-app-portfolio.yml` and the other `deploy-infra-*.yml` workflows to `infisical run`).
