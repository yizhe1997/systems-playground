# Scripts

Deployed to `$INFRA_BASE_DIR` on the host by `deploy-infra-scripts.yml`, along with an `.env` written from repo Variables/Secrets.

| Name | Type | Required? | Notes |
|---|---|---|---|
| `INFRA_BASE_DIR` | var | Yes | Real path, no safe default possible. |
| `CLOUDFLARED_LOG_DIR` | var | Yes | Has a script-level fallback (`$HOME/.cloudflared/cloudflared.log`) but kept explicit by choice. |
| `TUNNEL_NAME` | var | No | Falls back to `tunnel` — confirmed to match the actual tunnel name, safe to leave unset. |
| `DISCORD_WEBHOOK_INFRA_ALERTS` | secret | No | Leave empty to disable alerts entirely. |
| `BACKUP_DIR` | var | No | Falls back to `$SCRIPT_DIR/backups` (i.e. `$INFRA_BASE_DIR/backups`). Deliberately nested inside this layer's own directory, not a sibling of it — see the apps layer's `APP_BACKUP_DIR`, which uses a different GH var name specifically so the two layers' backups can never collide into the same folder. |
| `BACKUP_RETENTION_DAYS` | var | No | Falls back to `14`. |

There's no `INFRA_LOG_DIR` GitHub var wired here at all (same as `APP_LOG_DIR` on the apps side) — `wsl-startup.sh`/`wsl-backup.sh`'s own fallback (`$SCRIPT_DIR/logs`, which always equals `$INFRA_BASE_DIR/logs` once deployed) is the only value anyone would realistically want. This is purely where these scripts write their own log output (`wsl-startup.log`, `wsl-backup.log`) — not container or app logs.

| Script | Runs when | What it does |
|---|---|---|
| `wsl-startup.sh` | Windows Task Scheduler, on boot | Starts Docker, brings up every `self-host/infra/*/docker-compose.yml` (Infisical first, health-checked, since everything else depends on it), starts the Cloudflare tunnel. |
| `wsl-shutdown.sh` | Windows Task Scheduler, on shutdown | Stops every discovered infra service. |
| `wsl-backup.sh` | **Not yet scheduled — deployed only.** See below. | Backs up every Docker named volume belonging to an infra-layer service, plus known bind-mounted paths (Filebrowser's files, Infisical's `.env`). Scoped to this layer only — see "How volumes get scoped" below. The apps layer has its own independent `wsl-backup.sh` (`self-host/apps/scripts/`) for its own volumes. |

## How volumes get scoped to this layer

`wsl-backup.sh` discovers services the same way `wsl-startup.sh` does: any subdirectory of `$INFRA_BASE_DIR` with its own `docker-compose.yml` (see [`self-host/infra/README.md`](../README.md) for the current list — not repeated here, since it changes independently of this doc). Each discovered directory's basename doubles as its Docker Compose project name (nothing here ever overrides it with `-p`). Docker Compose auto-tags every volume it creates with `com.docker.compose.project=<project-name>`, so `wsl-backup.sh` filters `docker volume ls` by that label per discovered directory rather than backing up every volume on the host — that's what keeps this layer's backups from also scooping up the apps layer's volumes (portfolio's redis/rabbitmq/redpanda, etc.).

One exception: n8n's two volumes are declared `external: true` with fixed names, so they never carry the project label (Compose references external volumes, it doesn't create/tag them) — they're listed explicitly in the script instead.

## Scheduling the backup

`wsl-backup.sh` is deployed to `$INFRA_BASE_DIR/wsl-backup.sh` but nothing calls it automatically yet — add a Windows Task Scheduler entry (same mechanism already used for startup/shutdown) to run it on whatever cadence you want, e.g.:

```
wsl.exe -d <your-distro> -- /home/<user>/infra/wsl-backup.sh
```

Each run writes into a fresh timestamped folder under `$BACKUP_DIR` (default `$INFRA_BASE_DIR/backups`) and prunes anything older than `$BACKUP_RETENTION_DAYS` days (default 14).

## What's in a backup

Everything from one run lives together under `$BACKUP_DIR/<YYYYMMDD_HHMMSS>/` — treat that whole folder as one point-in-time snapshot, don't mix files from different runs when restoring.

| File pattern | What it is | Restore target |
|---|---|---|
| `volume_<name>.tar.gz` | A Docker named volume, contents tarred from its root. `<name>` is the exact Docker volume name at backup time (check `docker volume ls` or just read the filename). | Recreate/locate the Docker volume `<name>`, extract into it. |
| `bind_filebrowser_files.tar.gz` | Filebrowser's `data/files` directory (the actual resume/CMS files — not covered by any Docker volume). | `$INFRA_BASE_DIR/filebrowser/data/` |
| `bind_infisical_env.tar.gz` | Infisical's own `.env` — its bootstrap `INFISICAL_ENCRYPTION_KEY`/`INFISICAL_AUTH_SECRET`, not stored anywhere else. | `$INFRA_BASE_DIR/infisical/` |

## Restoring

**Read this part first, don't skip straight to the commands:** if you're restoring Infisical from scratch (new host, or its volume got wiped), the `.env` file must go back *before* you touch its Postgres volume or start the container. Everything in Infisical's database is encrypted with the key in that `.env` — restore the database without it and every secret in there is permanently unreadable, backup or not. There's no recovery path if you get this order wrong.

Recommended order for a full disaster-recovery restore (fresh host):

1. Deploy this repo's compose files to the host as usual (via the deploy workflows, or manually) — you need the directory structure in place before restoring into it.
2. Restore `bind_infisical_env.tar.gz` into `$INFRA_BASE_DIR/infisical/` first.
3. Restore `volume_<infisical pg_data>.tar.gz` and `volume_<infisical redis_data>.tar.gz` (see the generic recipe below).
4. Start Infisical, confirm it's healthy (`curl http://localhost:8090/api/status` — port comes from [its docker-compose.yml](../infisical/docker-compose.yml), check there if this ever changes) before doing anything else.
5. Restore every other infra service's volumes and bind-mounted paths in any order — n8n, Filebrowser (needs both its volumes *and* `bind_filebrowser_files.tar.gz` to get files back, not just one), uptime-kuma, registry. Watchtower needs nothing restored — it only mounts the Docker socket, no persistent state. Portfolio and other apps are backed up separately — see [the apps-layer scripts README](../../apps/scripts/README.md).

### Restoring a Docker volume

```bash
BACKUP_RUN="/path/to/backups/<timestamp>"   # the folder for the run you're restoring
VOLUME="<name>"                              # from the volume_<name>.tar.gz filename

# 1. Stop whatever container(s) use this volume
cd "$INFRA_BASE_DIR/<service>" && docker compose stop

# 2. Make sure the volume exists (harmless if it already does)
docker volume create "$VOLUME"

# 3. Extract the backup into it, wiping anything already there first
docker run --rm \
  -v "$VOLUME":/volume \
  -v "$BACKUP_RUN":/backup \
  alpine sh -c "rm -rf /volume/* && tar xzf /backup/volume_${VOLUME}.tar.gz -C /volume"

# 4. Restart
cd "$INFRA_BASE_DIR/<service>" && docker compose start   # or `up -d` if it was never running
```

### Restoring a bind-mounted path

```bash
tar xzf bind_filebrowser_files.tar.gz -C "$INFRA_BASE_DIR/filebrowser/data/"
tar xzf bind_infisical_env.tar.gz -C "$INFRA_BASE_DIR/infisical/"
```

## Note on ADR 003

[ADR 003](../../apps/portfolio/adrs/003-secure-resume-storage.md) previously stated Filebrowser's files were already "backing up via our existing `wsl-backup.sh` cron job" — that was inaccurate (no schedule ever existed) and has been corrected in the ADR (2026-07-16) to say the script is deployed but not yet scheduled, matching this doc.
