#!/bin/bash

# ==========================================================
# wsl-shutdown.sh
# Graceful WSL Shutdown script for Windows/WSL Environments
# ==========================================================

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

APPS=(
  "/home/user/apps/systems-playground"
  # Add other app directories here:
  # "/home/user/apps/n8n"
  # "/home/user/apps/aspire"
)

for dir in "${APPS[@]}"; do
  if [ -d "$dir" ]; then
    run_compose_down "$dir" || true
  else
    echo "[*] Directory '$dir' not found; skipping"
  fi
done

echo "--- Shutdown complete ---"