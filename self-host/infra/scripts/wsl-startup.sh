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
# Overridable so the test suite can point the health check at a fixture container published on a
# different host port (see scripts/tests/test-infra-startup-shutdown.bats) -- the real Infisical
# already binds host port 8090, so a same-port fixture's health check would silently pass against
# the real container instead of the fixture, masking a fixture startup failure.
INFISICAL_HEALTH_URL="$(printf '%s' "${INFISICAL_HEALTH_URL:-http://localhost:8090/api/status}" | tr -d '\r')"

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
# Directory name overridable via env (see scripts/tests/test-infra-startup-shutdown.bats) so the
# test suite can exercise this special case with a fixture name that can never collide with the
# real ~/infra/infisical -- Compose infers a project's identity from directory basename alone.
INFISICAL_DIR="$SCRIPT_DIR/${INFISICAL_DIR_NAME:-infisical}"
if [ -f "$INFISICAL_DIR/docker-compose.yml" ]; then
  echo "[*] Starting infisical first (dependency of other infra services)..."
  cd "$INFISICAL_DIR" || { echo "[!] Could not cd into $INFISICAL_DIR"; exit 1; }
  docker compose pull
  docker compose up -d

  echo "[*] Waiting for infisical to report healthy..."
  INFISICAL_READY=false
  for i in $(seq 1 30); do
    if curl -sf "$INFISICAL_HEALTH_URL" >/dev/null 2>&1; then
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

# The self-hosted registry is a dependency of any service that pulls a prebuilt image from it
# instead of a public registry (n8n today, and any future built-and-pushed service) — it has to
# be up and reachable before those services' `docker compose pull` runs, not just started
# alongside them in whatever order the directory glob happens to return (alphabetically, "n8n"
# sorts before "registry", which is exactly backwards). Special-cased second, right after
# infisical, for the same reason infisical is special-cased first.
# Same override reasoning as INFISICAL_DIR_NAME above (no test exercises this special case yet,
# but the hook is here for when one does).
REGISTRY_DIR="$SCRIPT_DIR/${REGISTRY_DIR_NAME:-registry}"
if [ -f "$REGISTRY_DIR/docker-compose.yml" ]; then
  echo "[*] Starting registry second (dependency for services that pull their image from here)..."
  cd "$REGISTRY_DIR" || { echo "[!] Could not cd into $REGISTRY_DIR"; exit 1; }
  docker compose pull
  docker compose up -d

  echo "[*] Waiting for registry to accept connections..."
  REGISTRY_READY=false
  for i in $(seq 1 30); do
    # No -f: registry requires auth on /v2/ (REGISTRY_AUTH=htpasswd), so a 401 is still a sign
    # of life. Only a real connection failure (refused/timeout) should count as "not ready yet".
    if curl -s -o /dev/null "http://localhost:5000/v2/"; then
      echo "[✔] registry is reachable (after ${i}0s)."
      REGISTRY_READY=true
      break
    fi
    sleep 10
  done
  if [ "$REGISTRY_READY" != true ]; then
    echo "[!] registry did not become reachable after 5 minutes. Continuing anyway — services"
    echo "    that pull their image from here may fail to start."
  fi
  cd "$SCRIPT_DIR" || exit 1
fi

echo "[*] Starting remaining docker compose services..."
for APP_DIR in "${APPS[@]}"; do
  [ "$APP_DIR" = "$INFISICAL_DIR" ] && continue
  [ "$APP_DIR" = "$REGISTRY_DIR" ] && continue
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
