UPTIME_KUMA_DIR="/home/yizhe/infra/uptime-kuma"

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

for dir in "$UPTIME_KUMA_DIR"; do
  if [ -d "$dir" ]; then
    run_compose_down "$dir" || true
  else
    echo "[*] Directory '$dir' not found; skipping"
  fi
done

echo "--- Shutdown complete ---"
