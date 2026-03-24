#!/bin/bash

# ==========================================================
# wsl-startup.sh
# Global WSL Startup script for Windows/WSL Environments
# ==========================================================

LOGDIR="/home/user/infra/logs"
mkdir -p "$LOGDIR"
LOGFILE="$LOGDIR/wsl-startup.log"
CFLOG="/home/user/.cloudflared/cloudflared.log"
DISCORD_WEBHOOK=""   # <-- set to your webhook URL or leave empty

# --- Log rotation (keep last 5) ---
for i in 4 3 2 1; do
  [ -f "$LOGFILE.$i" ] && mv "$LOGFILE.$i" "$LOGFILE.$((i+1))"
done
[ -f "$LOGFILE" ] && mv "$LOGFILE" "$LOGFILE.1"
touch "$LOGFILE"
chmod 664 "$LOGFILE"

exec > >(tee -a "$LOGFILE") 2>&1

echo "=== WSL Startup $(date) ==="

# 1. Start Docker Daemon
echo "[*] Starting Docker..."
sudo service docker start
sleep 5

# 2. Define all applications managed by this host
APPS=(
  "/home/user/apps/systems-playground"
  # Add other app directories here:
  # "/home/user/apps/n8n"
  # "/home/user/apps/aspire"
)

# 3. Start all applications automatically
echo "[*] Booting containerized applications..."
for APP_DIR in "${APPS[@]}"; do
  if [ -d "$APP_DIR" ]; then
    echo "    -> Starting $APP_DIR"
    cd "$APP_DIR" || continue
    
    # Pull images (useful if using Watchtower/external registry)
    docker compose pull || true 
    
    # Check if a custom env file is required
    if [ -f ".env" ]; then
      docker compose --env-file .env up -d
    else
      docker compose up -d
    fi
  else
    echo "    -> ⚠️ Directory $APP_DIR not found, skipping."
  fi
done

# Give the containers a few seconds to fully initialize
sleep 5

# 4. Cloudflare Tunnel Initialization
echo "[*] Initializing Cloudflare Tunnel routing..."
pkill -f "cloudflared tunnel run tunnel" 2>/dev/null || true

try_start_tunnel() {
    echo "    -> Attempting to start tunnel (Try $1)..."
    nohup cloudflared tunnel run tunnel > "$CFLOG" 2>&1 &
    pid=$!

    count=0
    while true; do
        if grep -q "Connection established" "$CFLOG" || grep -q "Registered tunnel connection" "$CFLOG"; then
			echo "    -> [✔] Tunnel connected."
			return 0
		fi

        sleep 2
        count=$((count+2))

        if [ $count -ge 120 ]; then
            echo "    -> [✖] Tunnel timeout after 2 minutes. Killing process..."
            kill $pid 2>/dev/null || true
            wait $pid 2>/dev/null
            return 1
        fi
    done
}

max_retries=3
connected=false
for attempt in $(seq 1 $max_retries); do
    if try_start_tunnel "$attempt"; then
        connected=true
        break
    fi
done

if [ "$connected" != true ]; then
    echo "[!] Tunnel failed after $max_retries attempts."
    if [ -n "$DISCORD_WEBHOOK" ]; then
        curl -s -H "Content-Type: application/json" \
             -d "{\"content\": \":warning: Cloudflare tunnel failed on $(hostname) after $max_retries attempts.\"}" \
             "$DISCORD_WEBHOOK"
    fi
    exit 1
fi

echo "=== Startup sequence complete! ==="