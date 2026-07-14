#!/bin/bash

# Load .env from the same directory as this script (~/infra/.env on the live host)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
  source <(tr -d '\r' < "$SCRIPT_DIR/.env")
fi

INFRA_LOG_DIR="$(printf '%s' "${INFRA_LOG_DIR:-$SCRIPT_DIR/logs}" | tr -d '\r')"
mkdir -p "$INFRA_LOG_DIR"
LOGFILE="$INFRA_LOG_DIR/wsl-startup.log"
CLOUDFLARED_LOG_DIR="$(printf '%s' "${CLOUDFLARED_LOG_DIR:-$HOME/.cloudflared/cloudflared.log}" | tr -d '\r')"
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

# infisical is a dependency of every other service (they fetch secrets from it), so it must be
# started — and actually ready, not just "container created" — before anything else. This is not
# guaranteed by directory ordering alone, so it's special-cased here rather than relied on
# alphabetically. On an ordinary reboot every other container already has its secrets baked into
# its own Docker-persisted config from the last CI deploy and would technically survive infisical
# being briefly unreachable, but on a fresh host (disaster recovery / new NUC) or for any future
# service whose entrypoint fetches secrets at container-start time rather than at deploy time,
# this ordering is load-bearing. Treat it as a hard dependency, not an optimization.
INFISICAL_DIR="$SCRIPT_DIR/infisical"
if [ -f "$INFISICAL_DIR/docker-compose.yml" ]; then
  echo "[*] Starting infisical first (dependency of other infra services)..."
  cd "$INFISICAL_DIR" || { echo "[!] Could not cd into $INFISICAL_DIR"; exit 1; }
  docker compose pull
  docker compose up -d

  echo "[*] Waiting for infisical to report healthy..."
  INFISICAL_READY=false
  for i in $(seq 1 30); do
    if curl -sf "http://localhost:8090/api/status" >/dev/null 2>&1; then
      echo "[✔] infisical is healthy (after ${i}0s)."
      INFISICAL_READY=true
      break
    fi
    sleep 10
  done
  if [ "$INFISICAL_READY" != true ]; then
    echo "[!] infisical did not become healthy after 5 minutes. Continuing anyway — other services"
    echo "    may fail to start if their secrets aren't already baked into existing containers."
    if [ -n "$DISCORD_WEBHOOK_INFRA_ALERTS" ]; then
      curl -s -H "Content-Type: application/json" \
           -d "{\"content\": \":warning: infisical did not become healthy during startup on \`$(hostname)\` — dependent services may fail.\"}" \
           "$DISCORD_WEBHOOK_INFRA_ALERTS"
    fi
  fi
  cd "$SCRIPT_DIR" || exit 1
fi

echo "[*] Starting remaining docker compose services..."
for APP_DIR in "${APPS[@]}"; do
  [ "$APP_DIR" = "$INFISICAL_DIR" ] && continue
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
  nohup cloudflared tunnel run "$TUNNEL_NAME" > "$CLOUDFLARED_LOG_DIR" 2>&1 &
  local pid=$!
  local count=0
  while true; do
    if grep -q "Connection established\|Registered tunnel connection" "$CLOUDFLARED_LOG_DIR" 2>/dev/null; then
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
