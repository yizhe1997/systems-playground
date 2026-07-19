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

# Load .env from the same directory as this script (~/infra/.env on the live host)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
  source <(tr -d '\r' < "$SCRIPT_DIR/.env")
fi

INFRA_LOG_DIR="$(printf '%s' "${INFRA_LOG_DIR:-$SCRIPT_DIR/logs}" | tr -d '\r')"
mkdir -p "$INFRA_LOG_DIR"
LOGFILE="$INFRA_LOG_DIR/wsl-backup.log"
DISCORD_WEBHOOK_INFRA_ALERTS="${DISCORD_WEBHOOK_INFRA_ALERTS:-}"
# Nested inside $SCRIPT_DIR (i.e. $INFRA_BASE_DIR/backups), not a sibling of it. A sibling default
# here and in the apps layer's wsl-backup.sh would both resolve to the exact same directory
# (~/backups), silently mixing infra and app backups together in one folder — same convention as
# logs (nested, not shared) avoids that collision entirely.
BACKUP_DIR="$(printf '%s' "${BACKUP_DIR:-$SCRIPT_DIR/backups}" | tr -d '\r')"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

# --- Log rotation (keep last 5) ---
for i in 4 3 2 1; do
  [ -f "$LOGFILE.$i" ] && mv "$LOGFILE.$i" "$LOGFILE.$((i+1))"
done
[ -f "$LOGFILE" ] && mv "$LOGFILE" "$LOGFILE.1"
touch "$LOGFILE"
chmod 664 "$LOGFILE"

exec > >(tee -a "$LOGFILE") 2>&1
echo "=== Infra Backup $(date) ==="

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

# --- Discover infra services: any subdirectory of SCRIPT_DIR with a docker-compose.yml ---
# Same auto-discovery as wsl-startup.sh. This is also how volumes get scoped to THIS layer only
# (see step 2 below) — an apps-layer volume should never end up in an infra backup, or vice versa.
SERVICE_DIRS=()
for compose_file in "$SCRIPT_DIR"/*/docker-compose.yml; do
  [ -f "$compose_file" ] && SERVICE_DIRS+=("$(dirname "$compose_file")")
done

# --- 1. Quiesce Postgres-backed services before snapshotting their volumes ---
# Tarring a live Postgres data directory is not crash-consistent — files can be mid-write. The
# other volumes on this host (Redis, RabbitMQ, Redpanda, Filebrowser's SQLite, uptime-kuma,
# the registry) are either not a real RDBMS or low enough stakes that a live snapshot is an
# acceptable risk; Postgres is not, since Infisical's DB holds every secret on the host and n8n's
# holds every workflow. This list is deliberately explicit (not auto-discovered) — add a service
# here only if it runs its own Postgres/MySQL-style database that needs quiescing.
# Overridable via env (see scripts/tests/test-infra-backup-restore.bats) so the test suite can
# exercise this exact logic with fixture names that can never collide with the real ~/infra/
# directories of the same name -- Compose infers a project's identity from directory basename
# alone, so a same-named fixture anywhere on the same Docker daemon targets the real project too.
# shellcheck disable=SC2206
POSTGRES_BACKED_SERVICES=(${POSTGRES_BACKED_SERVICES_OVERRIDE:-infisical n8n})

echo "[*] Stopping Postgres-backed services for a consistent snapshot..."
for SVC in "${POSTGRES_BACKED_SERVICES[@]}"; do
  SVC_DIR="$SCRIPT_DIR/$SVC"
  if [ -f "$SVC_DIR/docker-compose.yml" ]; then
    echo "    -> Stopping $SVC"
    (cd "$SVC_DIR" && docker compose stop) || alert "Failed to stop $SVC before backup — its volume snapshot may be inconsistent"
  else
    echo "    -> $SVC_DIR not found, skipping (not deployed here?)"
  fi
done

# --- 2. Docker named volumes belonging to THIS layer's services ---
# Scoped via each service's Docker Compose project label — `docker compose` auto-tags every
# volume it creates with `com.docker.compose.project=<project-name>`, where <project-name>
# defaults to the directory basename (exactly what none of these deploy workflows ever override
# with -p/--project-name, so the basename is what's actually in effect). This replaces a blind
# `docker volume ls` across the whole host — that would also catch every app-layer volume, mixing
# infra and app backups together, which is exactly what YZ flagged as confusing (2026-07-14).
#
# Exception: n8n's two volumes (postgres_data, n8n_data) are declared `external: true` with fixed
# names in its docker-compose.yml. External volumes are referenced, not created, by Compose, so
# they never get the project label and would be invisible to the filter below — listed explicitly
# instead. If a future infra service adds its own external volume, add it here too.
# Overridable via env, same reason as POSTGRES_BACKED_SERVICES_OVERRIDE above.
# shellcheck disable=SC2206
EXTERNAL_VOLUMES=(${EXTERNAL_VOLUMES_OVERRIDE:-n8n_postgres_data n8n_n8n_data})

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

# --- 3. Restart the Postgres-backed services now that their volumes are captured ---
echo "[*] Restarting Postgres-backed services..."
for SVC in "${POSTGRES_BACKED_SERVICES[@]}"; do
  SVC_DIR="$SCRIPT_DIR/$SVC"
  if [ -f "$SVC_DIR/docker-compose.yml" ]; then
    echo "    -> Starting $SVC"
    (cd "$SVC_DIR" && docker compose start) || alert "Failed to restart $SVC after backup — check it manually"
  fi
done

# --- 4. Known bind-mounted host paths that hold real state, not covered by a Docker volume ---
# Not auto-discoverable like volumes are — add a line here any time a service starts persisting
# something to a plain host path instead of a named volume.
declare -A BIND_PATHS=(
  ["filebrowser_files"]="$SCRIPT_DIR/filebrowser/data/files"
  ["infisical_env"]="$SCRIPT_DIR/infisical/.env"
)
echo "[*] Backing up known bind-mounted paths..."
for NAME in "${!BIND_PATHS[@]}"; do
  SRC="${BIND_PATHS[$NAME]}"
  if [ -e "$SRC" ]; then
    echo "    -> $NAME ($SRC)"
    if ! tar czf "$RUN_DIR/bind_${NAME}.tar.gz" -C "$(dirname "$SRC")" "$(basename "$SRC")"; then
      alert "Backup of bind-mounted path '$NAME' ($SRC) failed"
      FAILED=1
    fi
  else
    echo "    -> $NAME not found at $SRC, skipping (not deployed here?)"
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
