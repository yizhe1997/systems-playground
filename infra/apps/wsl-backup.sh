#!/bin/bash

# --- N8N backup configuration ---
# Directory where n8n's docker-compose.yml is located
N8N_COMPOSE_DIR="/home/yizhe/apps/n8n"

# Directory to store n8n backups on your host machine
N8N_BACKUP_DIR="/home/yizhe/apps/n8n_backups"

# List of n8n volume names to back up
N8N_VOLUMES_TO_BACKUP=("n8n_postgres_data" "n8n_n8n_data")

# Number of days to keep backups
RETENTION_DAYS=7

# --- Aspire backup configuration ---
# Directory where aspire's docker-compose.yml is located
ASPIRE_COMPOSE_DIR="/home/yizhe/apps/aspire"

# Directory to store aspire backups
ASPIRE_BACKUP_DIR="/home/yizhe/apps/aspire_backups"

# List of aspire volume names to back up (leave empty if none / set manually)
ASPIRE_VOLUMES_TO_BACKUP=()

# --- Script Logic ---
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
echo "--- Starting backup for $DATE ---"

# Ensure the n8n backup directory exists
mkdir -p "$N8N_BACKUP_DIR"

# Navigate to the n8n docker-compose directory
cd "$N8N_COMPOSE_DIR" || { echo "Error: Could not navigate to $N8N_COMPOSE_DIR"; exit 1; }

# Stop the services for a consistent backup
echo "[*] Stopping services..."
docker compose down

echo "[*] Backing up volumes..."
for volume in "${VOLUMES_TO_BACKUP[@]}"; do
    backup_file_path="$N8N_BACKUP_DIR/${volume}_${DATE}.tar.gz"
    echo "    -> Backing up '$volume' to '$backup_file_path'"
    docker run --rm -v "${volume}:/data" -v "$N8N_BACKUP_DIR:/backup" busybox \
        tar -czf "/backup/${volume}_${DATE}.tar.gz" -C /data .
done

# If aspire volumes configured, back them up and restart services, otherwise skip aspire backups
if [ ${#ASPIRE_VOLUMES_TO_BACKUP[@]} -gt 0 ]; then
    # Stop aspire services for consistent backup (if compose exists)
    if [ -d "$ASPIRE_COMPOSE_DIR" ]; then
        echo "[*] Stopping aspire services for consistent backup..."
        cd "$ASPIRE_COMPOSE_DIR" || { echo "Warning: Could not cd to $ASPIRE_COMPOSE_DIR"; }
        docker compose down || echo "    -> Warning: docker compose down failed (maybe services not running)"
    else
        echo "[*] Aspire compose dir '$ASPIRE_COMPOSE_DIR' not found; will still attempt to back up named volumes."
    fi

    echo "[*] Backing up aspire volumes..."
    mkdir -p "$ASPIRE_BACKUP_DIR"
    for volume in "${ASPIRE_VOLUMES_TO_BACKUP[@]}"; do
        echo "    -> Backing up aspire volume '$volume' to '$ASPIRE_BACKUP_DIR/${volume}_${DATE}.tar.gz'"
        docker run --rm -v "${volume}:/data" -v "$ASPIRE_BACKUP_DIR:/backup" busybox \
            tar -czf "/backup/${volume}_${DATE}.tar.gz" -C /data .
    done

    # Restart all services via wsl-startup.sh
    echo "[*] Restarting services via wsl-startup.sh..."
    /home/yizhe/wsl-startup.sh

    # Ensure aspire services are up (try docker compose up -d)
    if [ -d "$ASPIRE_COMPOSE_DIR" ]; then
        echo "[*] Starting aspire services..."
        cd "$ASPIRE_COMPOSE_DIR" && docker compose up -d || echo "    -> Could not start aspire via docker compose; ensure wsl-startup.sh handles it"
    fi
else
    echo "    -> No aspire volumes configured; skipping aspire volume backups and service restarts."
fi

# Clean up old backups
echo "[*] Cleaning up n8n backups older than $RETENTION_DAYS days..."
find "$N8N_BACKUP_DIR" -type f -name "*.tar.gz" -mtime +"$RETENTION_DAYS" -exec rm -f {} \;
if [ -d "$ASPIRE_BACKUP_DIR" ]; then
    echo "[*] Cleaning up aspire backups older than $RETENTION_DAYS days..."
    find "$ASPIRE_BACKUP_DIR" -type f -name "*.tar.gz" -mtime +"$RETENTION_DAYS" -exec rm -f {} \;
fi

echo "--- Backup complete ---"