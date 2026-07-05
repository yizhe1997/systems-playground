#!/bin/bash

# Load .env from the same directory as this script (~/infra/.env on the live host)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
  source <(tr -d '\r' < "$SCRIPT_DIR/.env")
fi

LOGDIR="$(printf '%s' "${LOGDIR:-$SCRIPT_DIR/logs}" | tr -d '\r')"
mkdir -p "$LOGDIR"
LOGFILE="$LOGDIR/wsl-startup.log"
CFLOG="$(printf '%s' "${CFLOG:-$HOME/.cloudflared/cloudflared.log}" | tr -d '\r')"
TUNNEL_NAME="$(printf '%s' "${TUNNEL_NAME:-tunnel}" | tr -d '\r')"
DISCORD_WEBHOOK_INFRA_ALERTS="${DISCORD_WEBHOOK_INFRA_ALERTS:-}"

# --- Log rotation (keep last 5) ---
for i in 4 3 2 1; do
  [ -f "$LOGFILE.$i" ] && mv "$LOGFILE.$i" "$LOGFILE.$((i+1))"
done
[ -f "$LOGFILE" ] && mv "$LOGFILE" "$LOGFILE.1"
touch "$LOGFILE"
chmod 664 "$LOGFILE"

exec > >(tee -a "$LOGFILE") 2>&1
echo "=== Startup $(date) ==="

# Start Docker daemon
echo "[*] Starting Docker..."
sudo service docker start
sleep 5

# Auto-discover infra services: any subdirectory of SCRIPT_DIR with a docker-compose.yml
echo "[*] Discovering infra services in $SCRIPT_DIR..."
APPS=()
for compose_file in "$SCRIPT_DIR"/*/docker-compose.yml; do
  [ -f "$compose_file" ] && APPS+=("$(dirname "$compose_file")")
done

if [ ${#APPS[@]} -eq 0 ]; then
  echo "[!] No services found — nothing to start."
  exit 1
fi

echo "[*] Starting docker compose services..."
for APP_DIR in "${APPS[@]}"; do
  echo "    -> Starting $APP_DIR"
  cd "$APP_DIR" || continue
  docker compose pull
  docker compose up -d
done

sleep 10

# Start Cloudflare tunnel
echo "[*] Killing stale Cloudflare tunnels (if any)..."
pkill -f "cloudflared tunnel run $TUNNEL_NAME" 2>/dev/null || true

try_start_tunnel() {
  local attempt="$1"
  echo "[*] Attempting to start Cloudflare tunnel '$TUNNEL_NAME' (try $attempt)..."
  nohup cloudflared tunnel run "$TUNNEL_NAME" > "$CFLOG" 2>&1 &
  local pid=$!
  local count=0
  while true; do
    if grep -q "Connection established\|Registered tunnel connection" "$CFLOG" 2>/dev/null; then
      echo "[✔] Tunnel connected on attempt $attempt."
      return 0
    fi
    sleep 2
    count=$((count + 2))
    if [ $count -ge 120 ]; then
      echo "[✖] Tunnel not connected after 2 minutes (attempt $attempt). Killing process..."
      kill $pid 2>/dev/null || true
      wait $pid 2>/dev/null
      return 1
    fi
  done
}

connected=false
for attempt in $(seq 1 3); do
  if try_start_tunnel "$attempt"; then
    connected=true
    break
  fi
done

if [ "$connected" != true ]; then
  echo "[!] Tunnel '$TUNNEL_NAME' failed after 3 attempts."
  if [ -n "$DISCORD_WEBHOOK_INFRA_ALERTS" ]; then
    curl -s -H "Content-Type: application/json" \
         -d "{\"content\": \":warning: Cloudflare tunnel \`$TUNNEL_NAME\` failed after 3 attempts on \`$(hostname)\`.\"}" \
         "$DISCORD_WEBHOOK_INFRA_ALERTS"
  fi
  exit 1
fi

echo "[*] Startup complete."
