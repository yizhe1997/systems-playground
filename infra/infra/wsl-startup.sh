#!/bin/bash

LOGFILE="/home/yizhe/infra/wsl-startup-logs/wsl-startup.log"
CFLOG="/home/yizhe/.cloudflared/cloudflared.log"
DISCORD_WEBHOOK=""   # <-- set to your webhook URL or leave empty

# --- Log rotation (keep last 5) ---
if [ -f "$LOGFILE.5" ]; then
  rm -f "$LOGFILE.5"
fi

for i in 4 3 2 1; do
  if [ -f "$LOGFILE.$i" ]; then
    mv "$LOGFILE.$i" "$LOGFILE.$((i+1))"
  fi
done

if [ -f "$LOGFILE" ]; then
  mv "$LOGFILE" "$LOGFILE.1"
fi

touch "$LOGFILE"
chown yizhe:yizhe "$LOGFILE"
chmod 664 "$LOGFILE"

exec > >(tee -a "$LOGFILE") 2>&1

echo "=== Startup $(date) ==="

# Start Docker daemon
echo "[*] Starting Docker..."
sudo service docker start
sleep 5

# Navigate to the uptime-kuma directory and start all services from docker compose
echo "[*] Starting docker compose services..."
cd /home/yizhe/infra/uptime-kuma/ || exit 1
docker compose pull && docker compose up --build -d

# Give the containers a few seconds to fully initialize
sleep 10

# Kill any old cloudflared tunnel if it exists
echo "[*] Killing old Cloudflare tunnels (if any)..."
pkill -f "cloudflared tunnel run tunnel" 2>/dev/null || true

# --- Function: try to start tunnel ---
try_start_tunnel() {
    echo "[*] Attempting to start Cloudflare tunnel (try $1)..."
    nohup cloudflared tunnel run tunnel > "$CFLOG" 2>&1 &
    pid=$!

    count=0
    while true; do
        if grep -q "Connection established" "$CFLOG" || grep -q "Registered tunnel connection" "$CFLOG"; then
			echo "[✔] Tunnel connected on attempt $1."
			return 0
		fi


        sleep 2
        count=$((count+2))

        if [ $count -ge 120 ]; then
            echo "[✖] Tunnel not connected after 2 minutes (attempt $1). Killing process..."
            kill $pid 2>/dev/null || true
            wait $pid 2>/dev/null
            return 1
        fi
    done
}

# --- Retry up to 3 times ---
max_retries=3
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
             -d "{\"content\": \":warning: Cloudflare tunnel failed after $max_retries attempts on $(hostname).\"}" \
             "$DISCORD_WEBHOOK"
    fi
    exit 1
fi

echo "[*] Startup complete."
