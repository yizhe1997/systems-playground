#!/bin/sh
# Prints the one-time launch URL for the running dsh stack.
# Set DSH_PUBLIC_HOST (e.g. dsh.example.com) to print the public HTTPS form instead of the loopback one.
set -eu
cd "$(dirname "$0")"

url=$(docker compose logs --no-log-prefix dsh 2>&1 | grep -o 'http://127.0.0.1:3080/?token=[A-Za-z0-9_-]*' | tail -1 || true)
[ -n "$url" ] || { echo "no launch URL yet - is the stack up and healthy? (docker compose ps)" >&2; exit 1; }

token="${url#*token=}"
if [ -n "${DSH_PUBLIC_HOST:-}" ]; then
  echo "https://${DSH_PUBLIC_HOST}/?token=${token}"
else
  port=$(docker compose port gateway 3081 2>/dev/null | sed 's/.*://' || true)
  echo "http://127.0.0.1:${port:-3080}/?token=${token}"
fi
