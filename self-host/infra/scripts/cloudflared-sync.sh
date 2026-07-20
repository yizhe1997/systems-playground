#!/bin/bash
# Watches every container on this host for two Docker labels - cloudflare.tunnel.hostname and
# cloudflare.tunnel.port - and keeps ~/.cloudflared/config.yml's managed ingress block, plus the
# matching Cloudflare DNS records, in sync automatically. Adding a new public-facing service
# becomes "add two labels to its docker-compose.yml" instead of hand-editing config.yml AND
# separately visiting Cloudflare's dashboard to add a DNS record.
#
# Polls rather than streams `docker events`, matching this repo's existing house style for
# retry/health-check loops (see wsl-startup.sh's Infisical/registry polling) - simpler, and
# self-healing if this script itself was briefly down or missed a moment.
#
# Runs as a native background process alongside cloudflared itself (launched by wsl-startup.sh,
# gated behind CLOUDFLARED_SYNC_ENABLED so existing hosts don't change behavior until it's
# deliberately turned on) rather than as a Docker container: cloudflared runs natively on this
# host, not containerized (see docs/DEPLOYMENT.md's "The host" section and ADR 003), and this
# script needs to signal that same native process to restart - doing that from inside a container
# would need `pid: host` plus a way to reach a process outside Docker's own namespace entirely,
# more fragile than just living where cloudflared already lives.

set -euo pipefail

CLOUDFLARED_DIR="${CLOUDFLARED_DIR:-$HOME/.cloudflared}"
CONFIG_FILE="$CLOUDFLARED_DIR/config.yml"
TUNNEL_NAME="${TUNNEL_NAME:-tunnel}"
SYNC_INTERVAL="${CLOUDFLARED_SYNC_INTERVAL:-30}"
CLOUDFLARED_LOG_DIR="${CLOUDFLARED_LOG_DIR:-$HOME/.cloudflared/cloudflared.log}"
LOGFILE="${CLOUDFLARED_SYNC_LOG:-$HOME/infra/logs/cloudflared-sync.log}"
mkdir -p "$(dirname "$LOGFILE")"

log() { printf '[*] %s\n' "$1" | tee -a "$LOGFILE"; }

BEGIN_MARKER="# BEGIN cloudflared-sync managed block - do not edit by hand, see self-host/infra/scripts/cloudflared-sync.sh"
END_MARKER="# END cloudflared-sync managed block"

# One tab-separated "hostname<TAB>port" line per running container that has BOTH labels set.
# A container missing either label is skipped entirely - never guess a port.
labelled_services() {
  docker ps -q | while read -r cid; do
    hostname=$(docker inspect -f '{{ index .Config.Labels "cloudflare.tunnel.hostname" }}' "$cid" 2>/dev/null || true)
    port=$(docker inspect -f '{{ index .Config.Labels "cloudflare.tunnel.port" }}' "$cid" 2>/dev/null || true)
    if [ -n "$hostname" ] && [ -n "$port" ]; then
      printf '%s\t%s\n' "$hostname" "$port"
    fi
  done
}

sync_once() {
  if [ ! -f "$CONFIG_FILE" ]; then
    log "No $CONFIG_FILE yet (has bootstrap.sh run and templated it?) - skipping this cycle."
    return
  fi

  local begin_line end_line
  begin_line=$(grep -nF "$BEGIN_MARKER" "$CONFIG_FILE" | head -1 | cut -d: -f1 || true)
  end_line=$(grep -nF "$END_MARKER" "$CONFIG_FILE" | head -1 | cut -d: -f1 || true)
  if [ -z "$begin_line" ] || [ -z "$end_line" ]; then
    log "config.yml has no managed block markers yet - skipping this cycle. Re-run bootstrap.sh to add them (hosts bootstrapped before this script existed won't have them), or add the two marker comment lines by hand right before the catch-all 'service: http_status:404' entry."
    return
  fi

  local new_block current_block
  new_block=$(labelled_services | while IFS=$'\t' read -r hostname port; do
    printf '  - hostname: %s\n    service: http://localhost:%s\n' "$hostname" "$port"
  done)
  current_block=$(sed -n "$((begin_line + 1)),$((end_line - 1))p" "$CONFIG_FILE")

  if [ "$current_block" = "$new_block" ]; then
    return
  fi

  log "Ingress config changed - regenerating managed block and restarting cloudflared..."
  {
    head -n "$begin_line" "$CONFIG_FILE"
    printf '%s\n' "$new_block"
    tail -n "+$end_line" "$CONFIG_FILE"
  } > "$CONFIG_FILE.tmp"
  mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"

  # DNS: safe to re-run for every managed hostname each cycle - `--overwrite-dns` makes this a
  # true no-op once the record already points at this tunnel. Only ever touches hostnames this
  # script was explicitly told about via a label - never an unrelated record.
  labelled_services | while IFS=$'\t' read -r hostname port; do
    cloudflared tunnel route dns --overwrite-dns "$TUNNEL_NAME" "$hostname" >>"$LOGFILE" 2>&1 || \
      log "  [!] Failed to create/confirm DNS route for $hostname - check $LOGFILE"
  done

  # Restart cloudflared to pick up the new config - the same pkill+relaunch pattern
  # wsl-startup.sh itself already uses to clear a stale previous instance before starting fresh.
  pkill -f "cloudflared tunnel run $TUNNEL_NAME" 2>/dev/null || true
  sleep 1
  nohup cloudflared tunnel run "$TUNNEL_NAME" > "$CLOUDFLARED_LOG_DIR" 2>&1 &
  log "cloudflared restarted with the updated config."
}

log "cloudflared-sync starting - polling every ${SYNC_INTERVAL}s for containers labelled cloudflare.tunnel.hostname / cloudflare.tunnel.port."
while true; do
  sync_once
  sleep "$SYNC_INTERVAL"
done
