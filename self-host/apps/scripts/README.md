# Scripts

Deployed to `$APP_BASE_DIR` on the host by `deploy-app-scripts.yml`, along with an `.env` written from repo Variables/Secrets. Mirrors `self-host/infra/scripts/` for the apps layer.

| Name | Type | Required? | Notes |
|---|---|---|---|
| `APP_BASE_DIR` | var | Yes | Real path, no safe default possible. |
| `DISCORD_WEBHOOK_INFRA_ALERTS` | secret | No | Same webhook already used by the infra layer — leave empty to disable, no separate secret needed. |
| `APP_BACKUP_DIR` | var | No | Falls back to `$SCRIPT_DIR/backups` (i.e. `$APP_BASE_DIR/backups`). Deliberately a different GH var name than the infra layer's `BACKUP_DIR` — so the two can never collide into the same folder even if someone sets one without the other. |
| `APP_BACKUP_RETENTION_DAYS` | var | No | Falls back to `14`. |

There's no `APP_LOG_DIR` GitHub var wired here either (same as infra's `INFRA_LOG_DIR`) — `wsl-startup.sh`'s own fallback (`$SCRIPT_DIR/logs`, which always equals `$APP_BASE_DIR/logs` once deployed) is the only value anyone would realistically want. This is purely where this script writes its own log output (`wsl-startup.log`) — not container or app logs.

| Script | Runs when | What it does |
|---|---|---|
| `wsl-startup.sh` | `ExecStart` of the `systems-playground-apps.service` systemd oneshot (installed by `scripts/bootstrap.sh`), ordered after the infra layer's own oneshot — see [the infra scripts README](../../infra/scripts/README.md) | Auto-discovers every `self-host/apps/*/docker-compose.yml`, pulls and starts each. Compose auto-merges any co-located `docker-compose.override.yml` (e.g. the portfolio's prod override) — no special handling needed for that. |
| `wsl-shutdown.sh` | `ExecStop` of the same `systems-playground-apps.service` unit | Stops every discovered app service. |
| `wsl-backup.sh` | Daily, via `systems-playground-apps-backup.timer` (systemd, installed by `scripts/bootstrap.sh`). See below. | Backs up every Docker named volume belonging to an app-layer service. Independent from the infra layer's own `wsl-backup.sh` — each backs up only its own layer's volumes, into its own backup directory, so the two never mix. |

## How volumes get scoped to this layer

Same mechanism as the infra layer: each service directory discovered under `$APP_BASE_DIR` (currently `portfolio/`) doubles as a Docker Compose project name (the directory basename), and Compose auto-tags every volume it creates with `com.docker.compose.project=<project-name>`. `wsl-backup.sh` filters `docker volume ls` by that label per discovered directory, rather than backing up every volume on the host — that's what keeps this layer's backups from picking up infra's volumes (Infisical's Postgres, n8n's data, etc.).

No external-volume exceptions here today (unlike n8n's over in the infra layer) — every volume the portfolio declares (`redis_data`, `rabbitmq_data`, `redpanda_data`) is a normal Compose-managed volume, so it always carries the project label.

## Why it's a separate script from the infra layer's, not one shared one

The first version of this repo's backup work had a single `wsl-backup.sh` (in the infra layer) doing a blind `docker volume ls` across the *entire host*, which technically covered app volumes too. That got dropped in favor of two genuinely independent scripts because: the two layers' default backup directories would otherwise resolve to the exact same folder (`~/backups`), silently interleaving infra and app backups together — confusing to restore from, and easy to make worse later (e.g. wanting different retention policies per layer). Each layer backing up strictly its own volumes, into its own directory, avoids all of that.

## Scheduling the backup

`wsl-backup.sh` runs daily via `systems-playground-apps-backup.timer` (`self-host/apps/scripts/systemd/`), installed and enabled by `scripts/bootstrap.sh` alongside this layer's other systemd units — see `docs/DEPLOYMENT.md` section 2. `Persistent=true` on the timer means a missed run (host was off at the scheduled time) fires once the host is back, rather than silently skipping that day. Trigger one manually any time with `sudo systemctl start systems-playground-apps-backup.service`; check `systemctl list-timers systems-playground-apps-backup.timer` for when it last/next runs.

Each run writes into a fresh timestamped folder under `$APP_BACKUP_DIR` (default `$APP_BASE_DIR/backups`) and prunes anything older than `$APP_BACKUP_RETENTION_DAYS` days (default 14).

## What's in a backup

Everything from one run lives together under `$APP_BACKUP_DIR/<YYYYMMDD_HHMMSS>/` — treat that whole folder as one point-in-time snapshot, don't mix files from different runs when restoring.

| File pattern | What it is | Restore target |
|---|---|---|
| `volume_<name>.tar.gz` | A Docker named volume, contents tarred from its root. `<name>` is the exact Docker volume name at backup time (check `docker volume ls` or just read the filename). | Recreate/locate the Docker volume `<name>`, extract into it. |

No bind-mounted-path backups exist for this layer today (no app persists to a plain host path) — if one ever does, it'll show up here as `bind_<name>.tar.gz`, matching the infra layer's convention.

## Restoring

```bash
BACKUP_RUN="/path/to/backups/<timestamp>"   # the folder for the run you're restoring
VOLUME="<name>"                              # from the volume_<name>.tar.gz filename

# 1. Stop whatever container(s) use this volume
cd "$APP_BASE_DIR/<service>" && docker compose stop

# 2. Make sure the volume exists (harmless if it already does)
docker volume create "$VOLUME"

# 3. Extract the backup into it, wiping anything already there first
docker run --rm \
  -v "$VOLUME":/volume \
  -v "$BACKUP_RUN":/backup \
  alpine sh -c "rm -rf /volume/* && tar xzf /backup/volume_${VOLUME}.tar.gz -C /volume"

# 4. Restart
cd "$APP_BASE_DIR/<service>" && docker compose start   # or `up -d` if it was never running
```

Nothing here depends on restore ordering the way Infisical's `.env` does on the infra side — restore any app's volumes independently, in any order.

## Boot ordering

This layer depends on infra being up first (Infisical for secrets already baked into containers on ordinary reboots, Filebrowser for the portfolio backend, etc.). That ordering is now enforced by `systemd` directly — `self-host/apps/scripts/systemd/systems-playground-apps.service` declares `After=systems-playground-infra.service` (deliberately not `Requires=`, so a failed infra oneshot doesn't hard-block this layer from still attempting to start — `wsl-startup.sh` here does not itself wait on or verify infra's health either). See `docs/DEPLOYMENT.md` section 2 for the full picture.
