#!/bin/bash

# Load .env from the same directory as this script (~/infra/.env on the live host)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/.env" ]; then
  source <(tr -d '\r' < "$SCRIPT_DIR/.env")
fi

echo "=== WSL Shutdown $(date) ==="

# Auto-discover infra services: any subdirectory of SCRIPT_DIR with a docker-compose.yml
APPS=()
for compose_file in "$SCRIPT_DIR"/*/docker-compose.yml; do
  [ -f "$compose_file" ] && APPS+=("$(dirname "$compose_file")")
done

for dir in "${APPS[@]}"; do
  echo "[*] Stopping $dir..."
  (cd "$dir" && docker compose down) || echo "    -> docker compose down failed in $dir"
done

echo "--- Shutdown complete ---"
