#!/bin/sh
# Prints a launch URL for the running dsh stack: the public HTTPS one when the stack is
# published through the tunnel, otherwise the loopback one. Pass "local" to force the loopback URL.
set -eu
cd "$(dirname "$0")"

url=$(docker compose logs --no-log-prefix dsh 2>&1 | grep -o 'http://127.0.0.1:3080/?token=[A-Za-z0-9_-]*' | tail -1 || true)
[ -n "$url" ] || { echo "no launch URL yet - is the stack up and healthy? (docker compose ps)" >&2; exit 1; }
token="${url#*token=}"

public=""
if [ "${1:-}" != "local" ]; then
  public=$(docker inspect -f '{{ index .Config.Labels "cloudflare.tunnel.hostname" }}' "$(docker compose ps -q gateway)" 2>/dev/null || true)
fi

if [ -n "$public" ]; then
  echo "https://${public}/?token=${token}"
else
  port=$(docker compose port gateway 3081 2>/dev/null | sed 's/.*://' || true)
  echo "http://127.0.0.1:${port:-3080}/?token=${token}"
fi
