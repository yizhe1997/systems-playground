#!/usr/bin/env bats
# Container-based test for self-host/infra/scripts/{wsl-startup,wsl-shutdown}.sh. Runs identically
# locally (`make test-infra`) and in CI (.github/workflows/test-infra-scripts.yml) — this file is the
# single source of truth, the workflow just calls it via bats. Requires Docker and the bats-core
# submodule (scripts/tests/vendor/bats-core — run `git submodule update --init` once if missing).
#
# setup_file() runs the real scripts once, in sequence (start, snapshot, shutdown, snapshot)
# against a throwaway fake $INFRA_BASE_DIR: two fake generic services plus a fake "infisical"
# (directory name is what triggers the health-check special case, not the image) that answers its
# health check instantly. Each @test below then makes its own independent assertion against the
# captured results, so one broken behavior doesn't hide the rest.
#
# No cloudflared stub here anymore - wsl-startup.sh/wsl-shutdown.sh no longer touch cloudflared at
# all (it runs as its own systemd user unit now, see self-host/infra/scripts/systemd/ and
# docs/DEPLOYMENT.md section 2), so there's nothing left in these two scripts for a cloudflared
# stub to exercise. That mechanism has no equivalent container-based coverage in this suite - it
# depends on a real systemd instance, which these bats fixtures don't run.

setup_file() {
  REPO_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"
  export REPO_ROOT
  cd "$REPO_ROOT"

  export TEST_DIR="$BATS_FILE_TMPDIR/infra"
  mkdir -p "$TEST_DIR"

  cp self-host/infra/scripts/wsl-startup.sh self-host/infra/scripts/wsl-shutdown.sh "$TEST_DIR/"
  chmod +x "$TEST_DIR"/wsl-*.sh

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
  # No lingering-process cleanup needed anymore - wsl-startup.sh no longer spawns anything that
  # outlives its own script process (that used to be the cloudflared tunnel stub, which was the
  # exact cause of a previous "make test-infra just hangs at the end" bug). docker compose down
  # above is enough on its own now.
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
