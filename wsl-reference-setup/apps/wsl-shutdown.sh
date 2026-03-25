#!/bin/bash

# ==========================================================
# wsl-shutdown.sh
# Graceful WSL Shutdown script for Windows/WSL Environments
# ==========================================================

# Load optional config.env file if present in the same directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$SCRIPT_DIR/config.env" ] && source "$SCRIPT_DIR/config.env"

echo "=== WSL Shutdown $(date) ==="

run_compose_down() {
  local dir="$1"
  echo "[*] Stopping services in $dir"
  if command -v docker compose >/dev/null 2>&1; then
    (cd "$dir" && docker compose down) || { echo "    -> ❌ Failed in $dir"; return 1; }
  else
    echo "    -> ⚠️ Docker compose binary not found on PATH"
    return 2
  fi
}

if [ -n "$APPS_LIST" ]; then
  read -r -a APPS <<< "$APPS_LIST"
else
  APPS=(
    "/home/user/apps/systems-playground"
    # Add other app directories here:
    # "/home/user/apps/n8n"
    # "/home/user/apps/aspire"
  )
fi

for dir in "${APPS[@]}"; do
  if [ -d "$dir" ]; then
    run_compose_down "$dir" || true
  else
    echo "[*] Directory '$dir' not found; skipping"
  fi
done

echo "--- Shutdown complete ---"