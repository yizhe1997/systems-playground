#!/usr/bin/env bats
# Container-based test for self-host/infra/scripts/{wsl-startup,wsl-shutdown}.sh. Runs identically
# locally (`make test-infra`) and in CI (.github/workflows/test-scripts.yml) — this file is the
# single source of truth, the workflow just calls it via bats. Requires Docker and the bats-core
# submodule (scripts/tests/vendor/bats-core — run `git submodule update --init` once if missing).
#
# setup_file() runs the real scripts once, in sequence (start, snapshot, shutdown, snapshot)
# against a throwaway fake $INFRA_BASE_DIR: two fake generic services plus a fake "infisical"
# (directory name is what triggers the health-check special case, not the image) that answers its
# health check instantly, and a stubbed cloudflared binary that reports "Connection established"
# instantly, so the tunnel step succeeds in seconds instead of the real script's up-to-6-minute
# retry loop. Each @test below then makes its own independent assertion against the captured
# results, so one broken behavior doesn't hide the rest.

setup_file() {
  REPO_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"
  export REPO_ROOT
  cd "$REPO_ROOT"

  export TEST_DIR="$BATS_FILE_TMPDIR/infra"
  export STUB_DIR="$BATS_FILE_TMPDIR/stub-bin"
  mkdir -p "$TEST_DIR" "$STUB_DIR"

  cp self-host/infra/scripts/wsl-startup.sh self-host/infra/scripts/wsl-shutdown.sh "$TEST_DIR/"
  chmod +x "$TEST_DIR"/wsl-*.sh

  export TUNNEL_NAME=test-tunnel
  cat > "$TEST_DIR/.env" <<EOF
CLOUDFLARED_LOG_DIR=$TEST_DIR/cloudflared.log
TUNNEL_NAME=$TUNNEL_NAME
EOF

  # Fake infisical fixture, named "bats-infisical" rather than the real "infisical" -- Compose
  # infers a project's identity from directory basename alone, so a fixture literally named
  # "infisical" would target the SAME project as the real ~/infra/infisical if this test is ever
  # run directly on a host that's also running it for real (this bit a previous version of this
  # suite: docker compose down/ps here would have operated against the real Infisical containers,
  # not just this throwaway one). wsl-startup.sh's special case is pointed at this name via the
  # INFISICAL_DIR_NAME override below instead of relying on the literal directory name.
  #
  # Published on host port 18090, not the real Infisical's 8090 -- the real container already
  # binds 8090 on this host, so a same-port fixture would fail to start ("port is already
  # allocated") while the health check below silently passed against the *real* container's
  # /api/status instead, masking the fixture's own startup failure entirely. Paired with the
  # INFISICAL_HEALTH_URL override so wsl-startup.sh's health check polls the fixture, not prod.
  export INFISICAL_DIR_NAME=bats-infisical
  export INFISICAL_HEALTH_URL=http://localhost:18090/api/status
  mkdir -p "$TEST_DIR/bats-infisical"
  cat > "$TEST_DIR/bats-infisical/docker-compose.yml" <<'EOF'
services:
  infisical:
    image: python:3.12-alpine
    ports:
      - "18090:8090"
    command: sh -c "mkdir -p /www/api && touch /www/api/status && cd /www && python3 -m http.server 8090"
EOF

  # A plain generic service, to confirm auto-discovery + non-special-cased startup still works
  # alongside the infisical special case.
  mkdir -p "$TEST_DIR/widget"
  cat > "$TEST_DIR/widget/docker-compose.yml" <<'EOF'
services:
  widget:
    image: alpine:3.20
    command: sleep infinity
EOF

  cat > "$STUB_DIR/cloudflared" <<'EOF'
#!/bin/bash
# Test stub: immediately report a healthy tunnel connection and hang, standing in for a real
# `cloudflared tunnel run` process.
echo "Connection established"
sleep 3600
EOF
  chmod +x "$STUB_DIR/cloudflared"
  export PATH="$STUB_DIR:$PATH"

  cd "$TEST_DIR"

  set +e
  timeout 180 bash wsl-startup.sh > "$TEST_DIR/.startup.log" 2>&1
  echo $? > "$TEST_DIR/.startup.exit"
  set -e

  # Snapshot "while running" state before shutdown tears it down.
  docker compose -f bats-infisical/docker-compose.yml -p bats-infisical ps --status running > "$TEST_DIR/.infisical-running.txt" 2>/dev/null || true
  docker compose -f widget/docker-compose.yml -p widget ps --status running > "$TEST_DIR/.widget-running.txt" 2>/dev/null || true

  set +e
  bash wsl-shutdown.sh > "$TEST_DIR/.shutdown.log" 2>&1
  echo $? > "$TEST_DIR/.shutdown.exit"
  set -e

  docker compose -f bats-infisical/docker-compose.yml -p bats-infisical ps --status running -q > "$TEST_DIR/.infisical-after-shutdown.txt" 2>/dev/null || true
  docker compose -f widget/docker-compose.yml -p widget ps --status running -q > "$TEST_DIR/.widget-after-shutdown.txt" 2>/dev/null || true
}

teardown_file() {
  cd "$TEST_DIR" 2>/dev/null || true
  docker compose -f bats-infisical/docker-compose.yml -p bats-infisical down 2>/dev/null || true
  docker compose -f widget/docker-compose.yml -p widget down 2>/dev/null || true
  # wsl-startup.sh's `nohup cloudflared tunnel run "$TUNNEL_NAME" &` is meant to survive its
  # parent shell (correct for production - the tunnel outlives the script that started it) but
  # that means the stub process started here (a plain `sleep 3600`) is never reaped by anything in
  # this test file either - wsl-shutdown.sh doesn't touch the tunnel at all (it's host-level
  # connectivity, not a container). Left alone, that orphaned stub lingers for up to an hour,
  # holding this test run's process tree/output pipes open the whole time - the exact "make
  # test-infra just hangs at the end" symptom. wsl-startup.sh itself cleans up a stale previous
  # instance at its own startup via `pkill -f`, but `pkill` isn't installed in every environment
  # this test runs in (confirmed missing under Git Bash/MSYS2 on Windows - `pkill: command not
  # found`, which made an earlier version of this line silently no-op via its own `|| true`) - use
  # a plain ps/awk/kill pipeline instead, which needs nothing beyond POSIX ps and kill.
  # Two patterns, not one: killing the stub's own "cloudflared tunnel run ..." process does NOT
  # kill its "sleep 3600" child too (SIGKILL to a parent just reparents surviving children to
  # PID 1 on Linux) - confirmed by hand, an earlier version of this teardown that only matched the
  # first pattern still left the sleep behind as a live orphan. The stub script (defined above,
  # right in this file) is the only thing that would ever produce a literal "sleep 3600" here, so
  # matching that text directly is safe and specific to this test.
  ps -ef | grep -E "cloudflared tunnel run $TUNNEL_NAME|sleep 3600" | grep -v grep | awk '{print $2}' | while read -r pid; do
    kill -9 "$pid" 2>/dev/null || true
  done
}

@test "syntax: wsl-startup.sh" {
  bash -n "$REPO_ROOT/self-host/infra/scripts/wsl-startup.sh"
}

@test "syntax: wsl-shutdown.sh" {
  bash -n "$REPO_ROOT/self-host/infra/scripts/wsl-shutdown.sh"
}

@test "startup: exits 0" {
  [ "$(cat "$TEST_DIR/.startup.exit")" = "0" ]
}

@test "startup: infisical becomes healthy" {
  grep -qi "infisical is healthy" "$TEST_DIR/.startup.log"
}

@test "startup: cloudflare tunnel connects" {
  # "Connection established" is the stub's own output, written to CLOUDFLARED_LOG_DIR, not to
  # this log — what shows up here is the script's own confirmation after it reads that file back.
  grep -qi "Tunnel connected" "$TEST_DIR/.startup.log"
}

@test "startup: reports complete" {
  grep -qi "Startup complete" "$TEST_DIR/.startup.log"
}

@test "startup: infisical container was running" {
  grep -q infisical "$TEST_DIR/.infisical-running.txt"
}

@test "startup: widget container was running" {
  grep -q widget "$TEST_DIR/.widget-running.txt"
}

@test "shutdown: exits 0" {
  [ "$(cat "$TEST_DIR/.shutdown.exit")" = "0" ]
}

@test "shutdown: infisical is stopped" {
  [ ! -s "$TEST_DIR/.infisical-after-shutdown.txt" ]
}

@test "shutdown: widget is stopped" {
  [ ! -s "$TEST_DIR/.widget-after-shutdown.txt" ]
}
