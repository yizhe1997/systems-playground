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
5. Create a **Machine Identity** (Infisical's term for a service account) scoped to read access on this project, and generate a token for it.
6. Add that single token as `INFISICAL_TOKEN` in GitHub repo Secrets. This becomes the *only* long-lived secret GitHub needs going forward — everything else is fetched live from here.

## Deploy

Deployed automatically by `.github/workflows/deploy-infra-infisical.yml` whenever `self-host/infra/infisical/**` changes on `main`. Also started on host boot: `self-host/infra/scripts/wsl-startup.sh` auto-discovers any `self-host/infra/*/docker-compose.yml`, so no separate registration step is needed there.

Note the bootstrap order dependency: this must be deployed and manually configured (steps above) *before* other workflows are migrated to pull secrets from it (see task tracked for migrating `deploy-app-portfolio.yml` and the other `deploy-infra-*.yml` workflows to `infisical run`).
