# Simple helper to stop docker compose stacks for n8n and aspire
N8N_COMPOSE_DIR="/home/yizhe/apps/n8n"
ASPIRE_COMPOSE_DIR="/home/yizhe/apps/aspire"

run_compose_down() {
  local dir="$1"
  echo "[*] Attempting to stop docker compose in $dir"
  if command -v docker compose >/dev/null 2>&1; then
    (cd "$dir" && docker compose down) || { echo "    -> docker compose down failed in $dir"; return 1; }
  elif command -v docker >/dev/null 2>&1; then
    (cd "$dir" && docker compose down) || { echo "    -> docker compose down failed in $dir"; return 1; }
  else
    echo "    -> No docker compose or docker binary found on PATH"
    return 2
  fi
}

for dir in "$N8N_COMPOSE_DIR" "$ASPIRE_COMPOSE_DIR"; do
  if [ -d "$dir" ]; then
    run_compose_down "$dir" || true
  else
    echo "[*] Directory '$dir' not found; skipping"
  fi
done

echo "--- Shutdown complete ---"
