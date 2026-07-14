#!/bin/bash

# Load .env from the same directory as this script (~/apps/.env on the live host)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
  source <(tr -d '\r' < "$SCRIPT_DIR/.env")
fi

APP_LOG_DIR="$(printf '%s' "${APP_LOG_DIR:-$SCRIPT_DIR/logs}" | tr -d '\r')"
mkdir -p "$APP_LOG_DIR"
LOGFILE="$APP_LOG_DIR/wsl-startup.log"
DISCORD_WEBHOOK_INFRA_ALERTS="${DISCORD_WEBHOOK_INFRA_ALERTS:-}"

# --- Log rotation (keep last 5) ---
for i in 4 3 2 1; do
  [ -f "$LOGFILE.$i" ] && mv "$LOGFILE.$i" "$LOGFILE.$((i+1))"
done
[ -f "$LOGFILE" ] && mv "$LOGFILE" "$LOGFILE.1"
touch "$LOGFILE"
chmod 664 "$LOGFILE"

exec > >(tee -a "$LOGFILE") 2>&1
echo "=== App Startup $(date) ==="

# Defensive, not load-bearing: the infra layer's own wsl-startup.sh already starts Docker and
# runs first per the Windows Task Scheduler boot chain ("WSL2 Infra Startup" then "WSL2 Apps
# Startup"). This is just here so the script still works if it's ever run standalone
# (workflow_dispatch, manual testing, or boot ordering changes).
echo "[*] Ensuring Docker is running..."
sudo service docker start
sleep 5

# Auto-discover app services: any subdirectory of SCRIPT_DIR with a docker-compose.yml. Compose
# auto-merges a co-located docker-compose.override.yml (e.g. the portfolio's prod override) —
# no special-casing needed here for that, `docker compose up -d` picks it up on its own.
echo "[*] Discovering app services in $SCRIPT_DIR..."
APPS=()
for compose_file in "$SCRIPT_DIR"/*/docker-compose.yml; do
  [ -f "$compose_file" ] && APPS+=("$(dirname "$compose_file")")
done

if [ ${#APPS[@]} -eq 0 ]; then
  echo "[!] No app services found — nothing to start."
  exit 0
fi

FAILED=0
for APP_DIR in "${APPS[@]}"; do
  echo "    -> Starting $APP_DIR"
  if ! (cd "$APP_DIR" && docker compose pull && docker compose up -d); then
    echo "[!] Failed to start $APP_DIR"
    FAILED=1
    if [ -n "$DISCORD_WEBHOOK_INFRA_ALERTS" ]; then
      curl -s -H "Content-Type: application/json" \
           -d "{\"content\": \":warning: App service \`$(basename "$APP_DIR")\` failed to start on \`$(hostname)\`.\"}" \
           "$DISCORD_WEBHOOK_INFRA_ALERTS" >/dev/null
    fi
  fi
done

if [ "$FAILED" -eq 1 ]; then
  echo "[!] App startup completed with errors."
  exit 1
fi

echo "[✔] App startup complete."
