#!/bin/sh
# Links dsh to the LiteLLM MCP hub. Creates a virtual key that can only use MCP tools (no server or key management),
# optionally limited to some servers, and writes the matching MCP entry into dsh's own config. The master key is read
# from the environment, so run it through Infisical:
#   infisical run --env=prod -- sh mcp-link.sh [server ...]
# With no server names the key may use every server that exists now and later. Run it again to rotate: the previous
# key is revoked once the new one is in place. This replaces dsh's whole MCP patch layer with the single hub entry.
set -eu
: "${LITELLM_MASTER_KEY:?LITELLM_MASTER_KEY must be set (run through infisical run)}"
PORT="${LITELLM_PORT:-4010}"
DSH="${DSH_CONTAINER:-dsh-dsh-1}"
PATCH=/home/node/.dsh/profiles/web/cordis.patch.yml
API="http://127.0.0.1:$PORT"

# The key this script wrote last time, if any, so it can be revoked after the swap.
OLD=$(docker exec "$DSH" sh -c "cat $PATCH 2>/dev/null" | sed -n "s/.*x-litellm-api-key: 'Bearer \(.*\)'.*/\1/p" | head -1)

if [ "$#" -gt 0 ]; then
  SERVERS=$(printf '"%s",' "$@"); SERVERS="[${SERVERS%,}]"
  PERM="\"mcp_servers\":$SERVERS,\"mcp_tool_search_enabled\":true"
else
  PERM="\"mcp_tool_search_enabled\":true"
fi

KEY=$(curl -sS --fail -X POST "$API/key/generate" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" -H 'Content-Type: application/json' \
  -d "{\"key_alias\":\"dsh-$(date +%Y%m%d%H%M%S)\",\"object_permission\":{$PERM}}" | sed -n 's/.*"key":"\([^"]*\)".*/\1/p')
[ -n "$KEY" ] || { echo "❌ Could not create a key. Is litellm up on 127.0.0.1:$PORT, and is a server name misspelt?"; exit 1; }

docker exec -i "$DSH" sh -c "cat > $PATCH" <<YAML
- id: mcp-hub
  name: '@deepseek-ai/dsh-mcp-client'
  config:
    serverName: hub
    transport: streamable-http
    url: http://litellm:4000/mcp/
    headers:
      x-litellm-api-key: 'Bearer $KEY'
YAML

[ -z "$OLD" ] || curl -sS -o /dev/null -X POST "$API/key/delete" \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" -H 'Content-Type: application/json' -d "{\"keys\":[\"$OLD\"]}" || true
echo "✅ dsh linked. Restart it to load the new MCP entry: docker restart $DSH"
