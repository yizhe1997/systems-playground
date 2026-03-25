#!/bin/bash
# ==========================================================
# wsl-backup.sh
# Graceful Docker Volume Backup script for Windows/WSL Environments
# ==========================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$SCRIPT_DIR/config.env" ] && source "$SCRIPT_DIR/config.env"

BACKUP_BASE_DIR="${BACKUP_BASE_DIR:-/home/user/apps/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")

echo "=== Backup started at $(date) ==="
mkdir -p "$BACKUP_BASE_DIR"

# 1. Stop all apps to ensure data consistency
echo "[*] Stopping applications for consistent backup state..."
"$SCRIPT_DIR/wsl-shutdown.sh"

# 2. Backup specified volumes
if [ -n "$VOLUMES_TO_BACKUP" ]; then
  read -r -a VOLUMES <<< "$VOLUMES_TO_BACKUP"
  echo "[*] Backing up volumes..."
  for volume in "${VOLUMES[@]}"; do
    backup_file="$BACKUP_BASE_DIR/${volume}_${DATE}.tar.gz"
    echo "    -> Backing up '$volume' to '$backup_file'"
    docker run --rm -v "${volume}:/data" -v "$BACKUP_BASE_DIR:/backup" busybox \
        tar -czf "/backup/${volume}_${DATE}.tar.gz" -C /data .
  done
else
  echo "[*] ⚠️ No VOLUMES_TO_BACKUP defined in config.env. Skipping volume backup."
fi

# 3. Start apps back up
echo "[*] Restarting applications..."
"$SCRIPT_DIR/wsl-startup.sh"

# 4. Clean up old backups
echo "[*] Cleaning up backups older than $BACKUP_RETENTION_DAYS days..."
find "$BACKUP_BASE_DIR" -type f -name "*.tar.gz" -mtime +"$BACKUP_RETENTION_DAYS" -exec rm -f {} \;

echo "=== Backup complete at $(date) ==="