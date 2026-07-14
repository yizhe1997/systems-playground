#!/bin/bash

# Load .env from the same directory as this script (~/infra/.env on the live host)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
  source <(tr -d '\r' < "$SCRIPT_DIR/.env")
fi

LOGDIR="$(printf '%s' "${LOGDIR:-$SCRIPT_DIR/logs}" | tr -d '\r')"
mkdir -p "$LOGDIR"
LOGFILE="$LOGDIR/wsl-backup.log"
DISCORD_WEBHOOK_INFRA_ALERTS="${DISCORD_WEBHOOK_INFRA_ALERTS:-}"
BACKUP_DIR="$(printf '%s' "${BACKUP_DIR:-$SCRIPT_DIR/../backups}" | tr -d '\r')"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

# --- Log rotation (keep last 5) ---
for i in 4 3 2 1; do
  [ -f "$LOGFILE.$i" ] && mv "$LOGFILE.$i" "$LOGFILE.$((i+1))"
done
[ -f "$LOGFILE" ] && mv "$LOGFILE" "$LOGFILE.1"
touch "$LOGFILE"
chmod 664 "$LOGFILE"

exec > >(tee -a "$LOGFILE") 2>&1
echo "=== Backup $(date) ==="

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

# --- 1. Quiesce Postgres-backed services before snapshotting their volumes ---
# Tarring a live Postgres data directory is not crash-consistent — files can be mid-write. The
# other volumes on this host (Redis, RabbitMQ, Redpanda, Filebrowser's SQLite, uptime-kuma,
# the registry) are either not a real RDBMS or low enough stakes that a live snapshot is an
# acceptable risk; Postgres is not, since Infisical's DB holds every secret on the host and n8n's
# holds every workflow. This list is deliberately explicit (not auto-discovered) — add a service
# here only if it runs its own Postgres/MySQL-style database that needs quiescing.
POSTGRES_BACKED_SERVICES=("infisical" "n8n")

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

# --- 2. Every Docker named volume on the host ---
# Auto-discovered via `docker volume ls`, not a hardcoded list — same philosophy as
# wsl-startup.sh's directory auto-discovery. Adding a new service with its own named volume means
# it's picked up here automatically, no edit needed. Trade-off: this also backs up any unrelated
# volume that happens to exist on the host (leftover test volumes, etc.) — acceptable for a
# solo host, but worth a periodic sanity check on backup size if that ever becomes a problem.
echo "[*] Backing up Docker named volumes..."
for VOL in $(docker volume ls -q); do
  echo "    -> $VOL"
  if ! docker run --rm \
      -v "$VOL":/volume:ro \
      -v "$RUN_DIR":/backup \
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
