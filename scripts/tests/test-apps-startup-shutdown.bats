#!/usr/bin/env bats
# Container-based test for self-host/apps/scripts/{wsl-startup,wsl-shutdown}.sh. Runs identically
# locally (`make test-apps`) and in CI (.github/workflows/test-apps-scripts.yml) — this file is the
# single source of truth, the workflow just calls it via bats. Requires Docker and the bats-core
# submodule (scripts/tests/vendor/bats-core — run `git submodule update --init` once if missing).
#
# Simpler than the infra layer's: no Postgres/infisical special case, no cloudflared tunnel step.
# Just auto-discovery + docker compose up/down, run once in setup_file(), asserted independently
# by each @test below.

setup_file() {
  REPO_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"
  export REPO_ROOT
  cd "$REPO_ROOT"

  export TEST_DIR="$BATS_FILE_TMPDIR/apps"
  mkdir -p "$TEST_DIR"

  cp self-host/apps/scripts/wsl-startup.sh self-host/apps/scripts/wsl-shutdown.sh "$TEST_DIR/"
  chmod +x "$TEST_DIR"/wsl-*.sh

  mkdir -p "$TEST_DIR/widget"
  cat > "$TEST_DIR/widget/docker-compose.yml" <<'EOF'
services:
  widget:
    image: alpine:3.20
    command: sleep infinity
EOF

  cd "$TEST_DIR"

  set +e
  bash wsl-startup.sh > "$TEST_DIR/.startup.log" 2>&1
  echo $? > "$TEST_DIR/.startup.exit"
  set -e

  docker compose -f widget/docker-compose.yml -p widget ps --status running > "$TEST_DIR/.widget-running.txt" 2>/dev/null || true

  set +e
  bash wsl-shutdown.sh > "$TEST_DIR/.shutdown.log" 2>&1
  echo $? > "$TEST_DIR/.shutdown.exit"
  set -e

  docker compose -f widget/docker-compose.yml -p widget ps --status running -q > "$TEST_DIR/.widget-after-shutdown.txt" 2>/dev/null || true
}

teardown_file() {
  cd "$TEST_DIR" 2>/dev/null || true
  docker compose -f widget/docker-compose.yml -p widget down 2>/dev/null || true
}

@test "syntax: wsl-startup.sh" {
  bash -n "$REPO_ROOT/self-host/apps/scripts/wsl-startup.sh"
}

@test "syntax: wsl-shutdown.sh" {
  bash -n "$REPO_ROOT/self-host/apps/scripts/wsl-shutdown.sh"
}

@test "startup: exits 0" {
  [ "$(cat "$TEST_DIR/.startup.exit")" = "0" ]
}

@test "startup: reports complete" {
  grep -qi "Startup complete" "$TEST_DIR/.startup.log"
}

@test "startup: widget container was running" {
  grep -q widget "$TEST_DIR/.widget-running.txt"
}

@test "shutdown: exits 0" {
  [ "$(cat "$TEST_DIR/.shutdown.exit")" = "0" ]
}

@test "shutdown: widget is stopped" {
  [ ! -s "$TEST_DIR/.widget-after-shutdown.txt" ]
}
