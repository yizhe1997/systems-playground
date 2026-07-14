# Scripts

Deployed to `$INFRA_BASE_DIR` on the host by `deploy-infra-scripts.yml`, along with an `.env` written from repo Variables/Secrets (`LOGDIR`, `CFLOG`, `TUNNEL_NAME`, `DISCORD_WEBHOOK_INFRA_ALERTS`, `BACKUP_DIR`, `BACKUP_RETENTION_DAYS`).

| Script | Runs when | What it does |
|---|---|---|
| `wsl-startup.sh` | Windows Task Scheduler, on boot | Starts Docker, brings up every `self-host/infra/*/docker-compose.yml` (Infisical first, health-checked, since everything else depends on it), starts the Cloudflare tunnel. |
| `wsl-shutdown.sh` | Windows Task Scheduler, on shutdown | Stops every discovered infra service. |
| `wsl-backup.sh` | **Not yet scheduled — deployed only.** See below. | Backs up every Docker named volume on the host plus known bind-mounted paths (Filebrowser's files, Infisical's `.env`). |

## Scheduling the backup

`wsl-backup.sh` is deployed to `$INFRA_BASE_DIR/wsl-backup.sh` but nothing calls it automatically yet — add a Windows Task Scheduler entry (same mechanism already used for startup/shutdown) to run it on whatever cadence you want, e.g.:

```
wsl.exe -d <your-distro> -- /home/<user>/infra/wsl-backup.sh
```

Each run writes into a fresh timestamped folder under `$BACKUP_DIR` (default `$INFRA_BASE_DIR/../backups`) and prunes anything older than `$BACKUP_RETENTION_DAYS` days (default 14).

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
4. Start Infisical, confirm it's healthy (`curl http://localhost:8090/api/status`) before doing anything else.
5. Restore every other service's volumes and bind-mounted paths in any order — n8n, Filebrowser (needs both its volumes *and* `bind_filebrowser_files.tar.gz` to get files back, not just one), uptime-kuma, registry, portfolio.

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

## Known gap

`self-host/apps/portfolio/adrs/003-secure-resume-storage.md` currently states Filebrowser's files are already "backing up via our existing `wsl-backup.sh` cron job." That predates this rewrite and the premise of this whole backlog item was that no backup was ever actually scheduled — worth checking whether that line was ever true, and updating the ADR once a real schedule exists.
