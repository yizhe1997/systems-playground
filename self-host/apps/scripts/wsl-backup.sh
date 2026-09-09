#!/bin/bash

# Git Bash/MSYS2 support for the `docker run -v host:/container` calls below: MSYS_NO_PATHCONV=1
# stops MSYS from mangling the CONTAINER-side target (e.g. "/backup" silently becoming a Windows
# path fragment, so the mount point never exists inside the container). But that alone breaks the
# HOST-side source instead: a bare POSIX path like "/tmp/xyz" then reaches docker.exe untranslated,
# which Docker Desktop resolves against its own WSL2 VM filesystem rather than the real Windows
# host disk - the container write succeeds with no error, but nothing lands where the host-side
# script expects to find it. Fix: convert host-side paths to native Windows form ourselves via
# `cygpath -w` before handing them to `-v`, so MSYS has nothing left to (mis)convert on that side
# either. Both `cygpath` and this whole block are no-ops on native Linux/WSL - the real target
# environment - where POSIX paths already work directly.
export MSYS_NO_PATHCONV=1
docker_host_path() {
  if command -v cygpath >/dev/null 2>&1; then
    cygpath -w "$1"
  else
    printf '%s' "$1"
  fi
}

# Load .env from the same directory as this script (~/apps/.env on the live host)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
  source <(tr -d '\r' < "$SCRIPT_DIR/.env")
fi

APP_LOG_DIR="$(printf '%s' "${APP_LOG_DIR:-$SCRIPT_DIR/logs}" | tr -d '\r')"
mkdir -p "$APP_LOG_DIR"
LOGFILE="$APP_LOG_DIR/wsl-backup.log"
DISCORD_WEBHOOK_INFRA_ALERTS="${DISCORD_WEBHOOK_INFRA_ALERTS:-}"
# Nested inside $SCRIPT_DIR (i.e. $APP_BASE_DIR/backups), not a sibling of it. A sibling default
# here and in the infra layer's wsl-backup.sh would both resolve to the exact same directory
# (~/backups), silently mixing infra and app backups together in one folder — same convention as
# logs (nested, not shared) avoids that collision entirely.
BACKUP_DIR="$(printf '%s' "${APP_BACKUP_DIR:-$SCRIPT_DIR/backups}" | tr -d '\r')"
BACKUP_RETENTION_DAYS="${APP_BACKUP_RETENTION_DAYS:-14}"

# --- Log rotation (keep last 5) ---
for i in 4 3 2 1; do
  [ -f "$LOGFILE.$i" ] && mv "$LOGFILE.$i" "$LOGFILE.$((i+1))"
done
[ -f "$LOGFILE" ] && mv "$LOGFILE" "$LOGFILE.1"
touch "$LOGFILE"
chmod 664 "$LOGFILE"

exec > >(tee -a "$LOGFILE") 2>&1
echo "=== App Backup $(date) ==="

alert() {
  echo "[!] $1"
  if [ -n "$DISCORD_WEBHOOK_INFRA_ALERTS" ]; then
    curl -s -H "Content-Type: application/json" \
         -d "{\"content\": \":warning: $1 on \`$(hostname)\`.\"}" \
         "$DISCORD_WEBHOOK_INFRA_ALERTS" >/dev/null
  fi
}

FAILED=0
RUN_DIR="$BACKUP_DIR/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RUN_DIR"

# --- Discover app services: any subdirectory of SCRIPT_DIR with a docker-compose.yml ---
# Same auto-discovery as wsl-startup.sh. This is also how volumes get scoped to THIS layer only
# (see step 2 below) — an infra-layer volume should never end up in an app backup, or vice versa.
SERVICE_DIRS=()
for compose_file in "$SCRIPT_DIR"/*/docker-compose.yml; do
  [ -f "$compose_file" ] && SERVICE_DIRS+=("$(dirname "$compose_file")")
done

# --- 1. Stop database-backed services before snapshotting their volumes ---
# Tarring a live database file while its owning process is still writing to it is not
# crash-consistent - files can be mid-write. The portfolio's SQLite `resume_requests` table is
# exactly this kind of source of truth (not a cache or queue - losing an in-flight write to it
# during a snapshot would be real data loss), so its backend service is stopped first, same as the
# infra layer's wsl-backup.sh already does for its real Postgres-backed services (see there for the
# full reasoning). This used to be empty, Postgres-specific scaffolding - no app ran its own
# database yet; the portfolio's SQLite DB is the first real case, which is also why this list isn't
# named "Postgres" anymore. Redis is handled separately below (SAVE, not a stop) since a database
# needs a clean stop to be consistent but a cache-store snapshot doesn't.
STOP_BEFORE_SNAPSHOT=("portfolio:backend")

echo "[*] Stopping database-backed services for a consistent snapshot..."
for ENTRY in "${STOP_BEFORE_SNAPSHOT[@]}"; do
  SVC_DIR="$SCRIPT_DIR/${ENTRY%%:*}"
  SVC_NAME="${ENTRY##*:}"
  if [ -f "$SVC_DIR/docker-compose.yml" ]; then
    echo "    -> Stopping $ENTRY"
    if ! (cd "$SVC_DIR" && docker compose stop "$SVC_NAME"); then
      alert "Failed to stop $ENTRY before backup — its volume snapshot may be inconsistent"
      FAILED=1
    fi
  fi
done

# --- 1b. Flush Redis's own snapshot to disk before capturing its volume ---
# The portfolio's Redis holds CMS config (admin-edited page content), not just disposable/derived
# cache data - worth protecting properly, not "fine to lose." Redis only writes dump.rdb to disk on
# its own schedule (or never, on an unclean shutdown), so tarring redis_data live can capture a
# dump.rdb that's stale relative to what's actually in memory. `SAVE` is Redis's own blocking
# snapshot-to-disk primitive - fast at this dataset's size, and unlike the database above, doesn't
# need the service stopped first to produce a consistent file.
REDIS_SNAPSHOT_SERVICES=("portfolio:redis")

echo "[*] Flushing Redis snapshots to disk before backing up their volumes..."
for ENTRY in "${REDIS_SNAPSHOT_SERVICES[@]}"; do
  SVC_DIR="$SCRIPT_DIR/${ENTRY%%:*}"
  SVC_NAME="${ENTRY##*:}"
  if [ -f "$SVC_DIR/docker-compose.yml" ]; then
    echo "    -> SAVE on $ENTRY"
    (cd "$SVC_DIR" && docker compose exec -T "$SVC_NAME" redis-cli SAVE) || \
      alert "Redis SAVE failed for $ENTRY before backup — its volume snapshot may be stale"
  fi
done

# --- 2. Docker named volumes belonging to THIS layer's services ---
# Scoped via each service's Docker Compose project label — same mechanism as the infra layer's
# wsl-backup.sh, see there for the full reasoning. This is what keeps app backups from picking up
# infra volumes (or vice versa) instead of a blind `docker volume ls` across the whole host.
#
# No external volumes to special-case here today (unlike n8n's over in the infra layer) — every
# volume any app currently declares is a normal Compose-managed one, so it always carries the
# project label. Add an entry here if a future app ever declares `external: true` volumes.
EXTERNAL_VOLUMES=()

echo "[*] Backing up Docker named volumes for this layer's services..."
VOLS_TO_BACKUP=()
for SVC_DIR in "${SERVICE_DIRS[@]}"; do
  PROJECT="$(basename "$SVC_DIR")"
  while IFS= read -r VOL; do
    [ -n "$VOL" ] && VOLS_TO_BACKUP+=("$VOL")
  done < <(docker volume ls -q --filter "label=com.docker.compose.project=$PROJECT")
done
VOLS_TO_BACKUP+=("${EXTERNAL_VOLUMES[@]}")

for VOL in "${VOLS_TO_BACKUP[@]}"; do
  if ! docker volume inspect "$VOL" >/dev/null 2>&1; then
    echo "    -> $VOL not found, skipping (not created yet?)"
    continue
  fi
  echo "    -> $VOL"
  if ! docker run --rm \
      -v "$VOL":/volume:ro \
      -v "$(docker_host_path "$RUN_DIR")":/backup \
      alpine sh -c "tar czf /backup/volume_${VOL}.tar.gz -C /volume ." ; then
    alert "Backup of Docker volume '$VOL' failed"
    FAILED=1
  fi
done

# --- 3. Restart database-backed services now that their volumes are captured ---
echo "[*] Restarting database-backed services..."
for ENTRY in "${STOP_BEFORE_SNAPSHOT[@]}"; do
  SVC_DIR="$SCRIPT_DIR/${ENTRY%%:*}"
  SVC_NAME="${ENTRY##*:}"
  if [ -f "$SVC_DIR/docker-compose.yml" ]; then
    echo "    -> Starting $ENTRY"
    if ! (cd "$SVC_DIR" && docker compose start "$SVC_NAME"); then
      alert "Failed to restart $ENTRY after backup — it is still down, check it manually"
      FAILED=1
    fi
  fi
done

# --- 4. Known bind-mounted host paths that hold real state, not covered by a Docker volume ---
# Empty today — no app persists anything to a plain host path instead of a named volume. Add a
# line here the day one does, matching the infra layer's Filebrowser/Infisical entries.
declare -A BIND_PATHS=()
echo "[*] Backing up known bind-mounted paths..."
for NAME in "${!BIND_PATHS[@]}"; do
  SRC="${BIND_PATHS[$NAME]}"
  if [ -e "$SRC" ]; then
    echo "    -> $NAME ($SRC)"
    if ! tar czf "$RUN_DIR/bind_${NAME}.tar.gz" -C "$(dirname "$SRC")" "$(basename "$SRC")"; then
      alert "Backup of bind-mounted path '$NAME' ($SRC) failed"
      FAILED=1
    fi
  fi
done

# --- 5. Prune backup runs older than BACKUP_RETENTION_DAYS ---
echo "[*] Pruning backups older than $BACKUP_RETENTION_DAYS days..."
find "$BACKUP_DIR" -maxdepth 1 -mindepth 1 -type d -mtime "+$BACKUP_RETENTION_DAYS" -print -exec rm -rf {} \;

if [ "$FAILED" -eq 1 ]; then
  alert "Backup run completed with at least one failure — check $LOGFILE"
  echo "[!] Backup completed with errors."
  exit 1
fi

echo "[✔] Backup complete: $RUN_DIR"
