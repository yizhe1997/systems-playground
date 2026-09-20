#!/bin/bash
# Watches every container on this host for two Docker labels - cloudflare.tunnel.hostname and
# cloudflare.tunnel.port - and keeps ~/.cloudflared/config.yml's managed ingress block, plus the
# matching Cloudflare DNS records, in sync automatically. Adding a new public-facing service
# becomes "add two labels to its docker-compose.yml" instead of hand-editing config.yml AND
# separately visiting Cloudflare's dashboard to add a DNS record.
#
# Optional origin check: a container that ALSO carries cloudflare.tunnel.access-aud (the Access
# application's Audience tag) and cloudflare.tunnel.access-team (the team name, the <team> in
# <team>.cloudflareaccess.com) gets an originRequest.access block, so cloudflared itself rejects
# any request that lacks a valid Cloudflare Access token instead of relying on Access alone. Both
# labels or neither: a half-set or malformed pair is refused (the hostname is left unrouted and a
# warning logged), never silently published without the check the owner asked for. Every regenerated
# config is checked with `cloudflared tunnel ingress validate` before it replaces the live one, so a
# bad block can't take every published site down with it.
#
# Polls rather than streams `docker events`, matching this repo's existing house style for
# retry/health-check loops (see wsl-startup.sh's Infisical/registry polling) - simpler, and
# self-healing if this script itself was briefly down or missed a moment.
#
# Runs as a systemd user unit (self-host/infra/scripts/systemd/cloudflared-sync.service,
# installed by scripts/bootstrap.sh, opt-in behind CLOUDFLARED_SYNC_ENABLED so existing hosts
# don't change behavior until it's deliberately turned on) rather than as a Docker container:
# cloudflared runs natively on this host, not containerized (see docs/DEPLOYMENT.md's "The host"
# section and ADR 003), and this script needs to signal that same native process to restart -
# doing that from inside a container would need `pid: host` plus a way to reach a process outside
# Docker's own namespace entirely, more fragile than just living where cloudflared already lives.

set -euo pipefail

CLOUDFLARED_DIR="${CLOUDFLARED_DIR:-$HOME/.cloudflared}"
CONFIG_FILE="$CLOUDFLARED_DIR/config.yml"
TUNNEL_NAME="${TUNNEL_NAME:-tunnel}"
SYNC_INTERVAL="${CLOUDFLARED_SYNC_INTERVAL:-30}"
LOGFILE="${CLOUDFLARED_SYNC_LOG:-$HOME/infra/logs/cloudflared-sync.log}"
mkdir -p "$(dirname "$LOGFILE")"
# Overridable so tests can point this at a fixture instead of the real cloudflared.service cgroup.
CLOUDFLARED_CGROUP="${CLOUDFLARED_CGROUP:-/sys/fs/cgroup/user.slice/user-$(id -u).slice/user@$(id -u).service/app.slice/cloudflared.service/cgroup.procs}"

log() { printf '[*] %s\n' "$1" | tee -a "$LOGFILE"; }

BEGIN_MARKER="# BEGIN cloudflared-sync managed block - do not edit by hand, see self-host/infra/scripts/cloudflared-sync.sh"
END_MARKER="# END cloudflared-sync managed block"

# One tab-separated "hostname<TAB>port<TAB>aud<TAB>team" line per running container that has BOTH
# hostname and port labels set. A container missing either is skipped entirely - never guess a port.
# aud/team are "-" when the container asks for no origin check. A container that sets only one of
# them, or a value of the wrong shape (the AUD tag is 64 lowercase hex characters, the team name a
# DNS-style label), is skipped with a warning on stderr: label values end up in config.yml, so they
# are checked here rather than trusted, and fail closed rather than dropping the requested check.
labelled_services() {
  docker ps -q | while read -r cid; do
    label() { docker inspect -f "{{ index .Config.Labels \"$1\" }}" "$cid" 2>/dev/null || true; }
    hostname=$(label cloudflare.tunnel.hostname)
    port=$(label cloudflare.tunnel.port)
    aud=$(label cloudflare.tunnel.access-aud)
    team=$(label cloudflare.tunnel.access-team)
    [ -n "$hostname" ] && [ -n "$port" ] || continue
    if [ -n "$aud" ] || [ -n "$team" ]; then
      if ! [[ "$aud" =~ ^[0-9a-f]{64}$ ]] || ! [[ "$team" =~ ^[a-z0-9]([a-z0-9-]*[a-z0-9])?$ ]]; then
        printf '[!] %s: cloudflare.tunnel.access-aud / access-team must BOTH be set (64-char hex AUD tag, team name); not routing this hostname until fixed.\n' "$hostname" >&2
        continue
      fi
    else
      aud="-"; team="-"
    fi
    printf '%s\t%s\t%s\t%s\n' "$hostname" "$port" "$aud" "$team"
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

  if [ -z "$begin_line" ]; then
    log "config.yml has no BEGIN marker yet - skipping this cycle. Re-run bootstrap.sh to add it (hosts bootstrapped before this script existed won't have it), or add the two marker comment lines by hand right before the catch-all 'service: http_status:404' entry."
    return
  fi

  # The END marker (and the catch-all rule after it) has gone missing at least twice on this
  # host with no clear cause - cloudflared then refuses to start at all ("the last ingress rule
  # must match all URLs"), a silent full outage since this loop just skipped forever without ever
  # fixing or even flagging it. Self-heal by re-appending both rather than staying down until
  # someone happens to notice and hand-edit the file again.
  local self_healed=false
  if [ -z "$end_line" ]; then
    log "  [!] config.yml is missing its END marker and catch-all rule - self-healing by appending them now. cloudflared cannot start without this; investigate what's removing them if this keeps recurring."
    printf '  %s\n  - service: http_status:404\n' "$END_MARKER" >>"$CONFIG_FILE"
    end_line=$(grep -nF "$END_MARKER" "$CONFIG_FILE" | head -1 | cut -d: -f1 || true)
    self_healed=true
  fi

  local new_block current_block
  new_block=$(labelled_services | while IFS=$'\t' read -r hostname port aud team; do
    printf '  - hostname: %s\n    service: http://localhost:%s\n' "$hostname" "$port"
    if [ "$aud" != "-" ]; then
      printf '    originRequest:\n      access:\n        required: true\n        teamName: %s\n        audTag:\n          - %s\n' "$team" "$aud"
    fi
  done)
  current_block=$(sed -n "$((begin_line + 1)),$((end_line - 1))p" "$CONFIG_FILE")

  # Even if the labelled-services block itself is unchanged, a self-heal just now means
  # cloudflared was very likely down (invalid config, refused to start) and still needs a
  # restart to pick up the fix - don't rely on systemd's own crash-restart backoff for that.
  if [ "$current_block" = "$new_block" ] && [ "$self_healed" = false ]; then
    return
  fi

  log "Ingress config changed - regenerating managed block and restarting cloudflared..."
  {
    head -n "$begin_line" "$CONFIG_FILE"
    printf '%s\n' "$new_block"
    tail -n "+$end_line" "$CONFIG_FILE"
  } > "$CONFIG_FILE.tmp"

  # Refuse to install a config cloudflared itself would reject: a bad block would otherwise be
  # written and cloudflared restarted into a crash loop, taking every published site down. The
  # previous, working config stays in place and this is retried next cycle.
  if command -v cloudflared >/dev/null 2>&1; then
    if ! validate_out=$(cloudflared tunnel --config "$CONFIG_FILE.tmp" ingress validate 2>&1); then
      log "  [!] The regenerated ingress config failed 'cloudflared tunnel ingress validate' - keeping the current config. Output: $(printf '%s' "$validate_out" | tail -n 3 | tr '\n' ' ')"
      rm -f "$CONFIG_FILE.tmp"
      return
    fi
  fi
  mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"

  # DNS: safe to re-run for every managed hostname each cycle - `--overwrite-dns` makes this a
  # true no-op once the record already points at this tunnel. Only ever touches hostnames this
  # script was explicitly told about via a label - never an unrelated record.
  labelled_services 2>/dev/null | while IFS=$'\t' read -r hostname _; do
    cloudflared tunnel route dns --overwrite-dns "$TUNNEL_NAME" "$hostname" >>"$LOGFILE" 2>&1 || \
      log "  [!] Failed to create/confirm DNS route for $hostname - check $LOGFILE"
  done

  # Restart cloudflared to pick up the new config - cloudflared runs as its own systemd user unit
  # (self-host/infra/scripts/systemd/cloudflared.service, Restart=always), so a signal is enough:
  # systemd notices the process exit and relaunches it itself, giving the same "exactly one
  # supervisor in charge" guarantee a `systemctl --user restart` call was meant to provide (a
  # manual nohup restart racing systemd's own Restart=always is what produced two simultaneous
  # tunnel connector "replicas" once before - signalling the process and letting systemd relaunch
  # it avoids that the same way, just without going through systemd's own CLI to do it).
  #
  # Deliberately NOT `systemctl --user restart cloudflared.service` (what this used to do):
  # that talks to systemd over a D-Bus *session* bus, and WSL2 doesn't reliably create one for a
  # lingering user session (PAM/logind session registration can silently not run - confirmed live
  # 2026-09-08, see the Obsidian board). When that bus is missing, `systemctl --user` fails
  # outright, and under `set -e` that crashed this whole script every time a real config change
  # needed a restart - the exact silent-failure shape this script exists to prevent, just one
  # layer deeper. Signalling the process directly has no D-Bus dependency at all, so it can't be
  # broken by that class of environment gap again. Scoped via cloudflared.service's own cgroup so
  # this can never touch some other, unrelated cloudflared process that happens to be running on
  # the host (one is known to exist - see the Obsidian board).
  if [ -r "$CLOUDFLARED_CGROUP" ] && [ -s "$CLOUDFLARED_CGROUP" ]; then
    while read -r pid; do
      kill "$pid" 2>/dev/null || true
    done <"$CLOUDFLARED_CGROUP"
    log "cloudflared signalled to restart (systemd will relaunch it via Restart=always)."
  else
    log "  [!] Could not find cloudflared.service's cgroup at $CLOUDFLARED_CGROUP - falling back to matching by process name, scoped to this user (cannot touch any other cloudflared process on the host)."
    pkill -u "$(id -u)" -x cloudflared 2>/dev/null || \
      log "  [!] No cloudflared process found to restart - it may already be down; systemd's Restart=always / the next sync cycle should recover it."
  fi
}

if [ "${CLOUDFLARED_SYNC_ONCE:-false}" = true ]; then  # one cycle then exit; used by the tests
  sync_once
  exit 0
fi

log "cloudflared-sync starting - polling every ${SYNC_INTERVAL}s for containers labelled cloudflare.tunnel.hostname / cloudflare.tunnel.port."
while true; do
  sync_once
  sleep "$SYNC_INTERVAL"
done
