#!/bin/sh
# Keeps dsh linked to the LiteLLM MCP hub. Safe to run on every deploy: it changes nothing while dsh already holds a
# working hub key, and otherwise creates a key limited to MCP tools and writes dsh's hub entry.
#   sh mcp-link.sh [--rotate] [--restart] [server ...]
# Needs LITELLM_MASTER_KEY in the environment. The deploy has it; by hand: infisical run --env=prod -- sh mcp-link.sh
#   --rotate   replace the key even if the current one works (also how to change which servers it may use)
#   --restart  restart dsh after a change so it loads the entry
# With no server names the key may use every server, now and later.
# It only manages dsh's MCP file while that holds nothing or just the hub entry; anything else is left alone.
# Exit status: 0 linked or already linked, 1 could not link (the deploy treats that as a warning, not a failure).
set -eu

ROTATE=0; RESTART=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --rotate) ROTATE=1 ;;
    --restart) RESTART=1 ;;
    -*) echo "unknown option: $1" >&2; exit 1 ;;
    *) break ;;
  esac
  shift
done

: "${LITELLM_MASTER_KEY:?LITELLM_MASTER_KEY must be set}"
PORT="${LITELLM_PORT:-4010}"
DSH="${DSH_CONTAINER:-dsh-dsh-1}"
PATCH=/home/node/.dsh/profiles/web/cordis.patch.yml
API="http://127.0.0.1:$PORT"
warn() { echo "⚠️  $1"; exit 1; }

CUR=$(docker exec "$DSH" sh -c "cat $PATCH" 2>/dev/null) || warn "dsh has no MCP config file yet (is $DSH running, and has it started once?). Run again after it has."

# Ours to manage only if empty (the shipped [] with comments) or exactly the hub entry.
BODY=$(printf '%s\n' "$CUR" | grep -v -E '^[[:space:]]*(#|$)' | tr -d '[:space:]' || true)
ENTRIES=$(printf '%s\n' "$CUR" | grep -c -E '^- id:' || true)
if [ "$BODY" != '[]' ] && { [ "$ENTRIES" != 1 ] || ! printf '%s\n' "$CUR" | grep -q -E '^- id: mcp-hub'; }; then
  warn "dsh's MCP config holds entries this script does not manage; add the hub entry by hand or empty the file."
fi

OLD=$(printf '%s\n' "$CUR" | sed -n "s/.*x-litellm-api-key: 'Bearer \(.*\)'.*/\1/p" | head -1)
works() {
  [ -n "$1" ] && [ "$(curl -s -m 10 -o /dev/null -w '%{http_code}' -X POST "$API/mcp/" \
    -H "x-litellm-api-key: Bearer $1" -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}')" = 200 ]
}

if [ "$ROTATE" = 0 ] && works "$OLD"; then
  echo "✅ dsh is already linked to the MCP hub."
  exit 0
fi

if [ "$#" -gt 0 ]; then
  SERVERS=$(printf '"%s",' "$@"); SERVERS="[${SERVERS%,}]"
  PERM="\"mcp_servers\":$SERVERS,\"mcp_tool_search_enabled\":true"
else
  PERM="\"mcp_tool_search_enabled\":true"
fi
KEY=$(curl -sS -m 20 --fail -X POST "$API/key/generate" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" -H 'Content-Type: application/json' \
  -d "{\"key_alias\":\"dsh-$(date +%Y%m%d%H%M%S)\",\"object_permission\":{$PERM}}" 2>/dev/null | sed -n 's/.*"key":"\([^"]*\)".*/\1/p') || true
[ -n "$KEY" ] || warn "could not create a key. Is litellm up on 127.0.0.1:$PORT, is the master key right, and is every server name spelt as in the hub?"

docker exec -i "$DSH" sh -c "cat > $PATCH" <<YAML || warn "could not write dsh's MCP config."
- id: mcp-hub
  name: '@deepseek-ai/dsh-mcp-client'
  config:
    serverName: hub
    transport: streamable-http
    url: http://litellm:4000/mcp/
    headers:
      x-litellm-api-key: 'Bearer $KEY'
YAML

[ -z "$OLD" ] || curl -s -m 10 -o /dev/null -X POST "$API/key/delete" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" -H 'Content-Type: application/json' -d "{\"keys\":[\"$OLD\"]}" || true

if [ "$RESTART" = 1 ]; then
  docker restart "$DSH" >/dev/null && echo "✅ dsh linked to the MCP hub and restarted."
else
  echo "✅ dsh linked to the MCP hub. Restart it to load the entry: docker restart $DSH"
fi
