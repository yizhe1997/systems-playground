#!/usr/bin/env bats
# Test for self-host/infra/scripts/cloudflared-sync.sh, focused on the optional Cloudflare Access
# origin check (cloudflare.tunnel.access-aud / access-team labels) and the pre-flight validation
# that guards the live config. Runs identically locally (`make test-infra`) and in CI
# (.github/workflows/test-infra-scripts.yml). Needs only bash and the bats-core submodule: docker,
# cloudflared and pkill are stubs on PATH, and the script runs one sync cycle
# (CLOUDFLARED_SYNC_ONCE=true) against a throwaway config in $BATS_TEST_TMPDIR. The real
# cloudflared.service cgroup is never read (CLOUDFLARED_CGROUP points at a missing file), so the
# script's restart path falls through to the stubbed pkill and can't touch a real process.

AUD=5cdf9201f910f9ab5a8935257f90d0481fdb68c386bacfd0c411d36ea2bc41e1

setup() {
  REPO_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"
  T="$BATS_TEST_TMPDIR"
  mkdir -p "$T/bin" "$T/cf" "$T/containers"

  cat > "$T/cf/config.yml" <<'EOF'
tunnel: test-tunnel
credentials-file: /nonexistent.json

ingress:
  # BEGIN cloudflared-sync managed block - do not edit by hand, see self-host/infra/scripts/cloudflared-sync.sh
  # END cloudflared-sync managed block
  - service: http_status:404
EOF

  # docker stub: `ps -q` lists the fixture container ids; `inspect -f '{{ index .Config.Labels "k" }}' id`
  # prints the value of label k from $T/containers/<id> (lines of key=value), or nothing.
  cat > "$T/bin/docker" <<'EOF'
#!/bin/bash
case "$1" in
  ps) ls "$T_CONTAINERS" ;;
  inspect)
    key=$(printf '%s' "$3" | sed -E 's/.*Labels "([^"]+)".*/\1/')
    grep -h -F "$key=" "$T_CONTAINERS/$4" 2>/dev/null | head -1 | cut -d= -f2-
    ;;
esac
EOF
  # cloudflared stub: `ingress validate` passes or fails per $STUB_VALIDATE_RC; anything else
  # (route dns) is just recorded.
  cat > "$T/bin/cloudflared" <<'EOF'
#!/bin/bash
echo "$*" >> "$T_CALLS/cloudflared"
if [[ " $* " == *" ingress validate "* ]]; then
  [ "${STUB_VALIDATE_RC:-0}" = 0 ] && exit 0
  echo "error: invalid ingress" >&2; exit 1
fi
exit 0
EOF
  cat > "$T/bin/pkill" <<'EOF'
#!/bin/bash
echo "$*" >> "$T_CALLS/pkill"
EOF
  chmod +x "$T/bin/"*
  mkdir -p "$T/calls"

  export T_CONTAINERS="$T/containers" T_CALLS="$T/calls"
  export PATH="$T/bin:$PATH"
  export CLOUDFLARED_DIR="$T/cf" CLOUDFLARED_SYNC_LOG="$T/sync.log"
  export CLOUDFLARED_CGROUP="$T/no-such-cgroup" CLOUDFLARED_SYNC_ONCE=true
}

container() { # container <id> <label=value>...
  local id="$1"; shift
  printf '%s\n' "$@" > "$T_CONTAINERS/$id"
}

sync() { bash "$REPO_ROOT/self-host/infra/scripts/cloudflared-sync.sh"; }

@test "no access labels: plain hostname/service rule, no originRequest" {
  container c1 cloudflare.tunnel.hostname=a.example.test cloudflare.tunnel.port=8080
  run sync
  [ "$status" -eq 0 ]
  grep -q '  - hostname: a.example.test' "$T/cf/config.yml"
  grep -q 'service: http://localhost:8080' "$T/cf/config.yml"
  ! grep -q originRequest "$T/cf/config.yml"
}

@test "both access labels: originRequest.access block with team and AUD" {
  container c1 cloudflare.tunnel.hostname=dsh.example.test cloudflare.tunnel.port=3080 \
    cloudflare.tunnel.access-aud=$AUD cloudflare.tunnel.access-team=yizhechin
  run sync
  [ "$status" -eq 0 ]
  run cat "$T/cf/config.yml"
  [[ "$output" == *"  - hostname: dsh.example.test
    service: http://localhost:3080
    originRequest:
      access:
        required: true
        teamName: yizhechin
        audTag:
          - $AUD
"* ]]
  # the catch-all rule must still be last
  [[ "$output" == *"  - service: http_status:404" ]]
}

@test "the check applies only to the labelled container, not its neighbours" {
  container c1 cloudflare.tunnel.hostname=a.example.test cloudflare.tunnel.port=8080
  container c2 cloudflare.tunnel.hostname=dsh.example.test cloudflare.tunnel.port=3080 \
    cloudflare.tunnel.access-aud=$AUD cloudflare.tunnel.access-team=yizhechin
  run sync
  [ "$status" -eq 0 ]
  [ "$(grep -c originRequest "$T/cf/config.yml")" -eq 1 ]
  [ "$(grep -c 'hostname:' "$T/cf/config.yml")" -eq 2 ]
}

@test "only one access label: hostname is not routed and a warning is emitted" {
  container c1 cloudflare.tunnel.hostname=dsh.example.test cloudflare.tunnel.port=3080 \
    cloudflare.tunnel.access-aud=$AUD
  run sync
  [ "$status" -eq 0 ]
  [[ "$output" == *"must BOTH be set"* ]]
  ! grep -q 'dsh.example.test' "$T/cf/config.yml"
}

@test "malformed values (wrong AUD length, injection attempt) are refused, not written to config" {
  container c1 cloudflare.tunnel.hostname=dsh.example.test cloudflare.tunnel.port=3080 \
    cloudflare.tunnel.access-aud=abc123 cloudflare.tunnel.access-team=yizhechin
  container c2 cloudflare.tunnel.hostname=b.example.test cloudflare.tunnel.port=3081 \
    cloudflare.tunnel.access-aud=$AUD 'cloudflare.tunnel.access-team=x; rm -rf /'
  run sync
  [ "$status" -eq 0 ]
  ! grep -q -E 'dsh.example.test|b.example.test|rm -rf' "$T/cf/config.yml"
}

@test "a config that fails cloudflared's validation is not installed and cloudflared is not restarted" {
  container c1 cloudflare.tunnel.hostname=a.example.test cloudflare.tunnel.port=8080
  cp "$T/cf/config.yml" "$T/before.yml"
  STUB_VALIDATE_RC=1 run sync
  [ "$status" -eq 0 ]
  [[ "$output" == *"failed 'cloudflared tunnel ingress validate'"* ]]
  cmp "$T/cf/config.yml" "$T/before.yml"
  [ ! -e "$T/cf/config.yml.tmp" ]
  [ ! -e "$T/calls/pkill" ]
}

@test "a valid change is installed, DNS is routed, and cloudflared is signalled to restart" {
  container c1 cloudflare.tunnel.hostname=a.example.test cloudflare.tunnel.port=8080
  run sync
  [ "$status" -eq 0 ]
  grep -q 'tunnel route dns --overwrite-dns tunnel a.example.test' "$T/calls/cloudflared"
  [ -s "$T/calls/pkill" ]
}

@test "an unchanged config is left alone (no restart on a repeat cycle)" {
  container c1 cloudflare.tunnel.hostname=a.example.test cloudflare.tunnel.port=8080
  run sync
  rm -f "$T/calls/pkill"
  run sync
  [ "$status" -eq 0 ]
  [ ! -e "$T/calls/pkill" ]
}
