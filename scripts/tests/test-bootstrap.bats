#!/usr/bin/env bats
# Container-based test for scripts/bootstrap.sh. Runs identically locally (`make test-bootstrap`)
# and in CI (.github/workflows/test-scripts.yml) — this file is the single source of truth, the
# workflow just calls it via bats. Requires Docker and the bats-core submodule
# (scripts/tests/vendor/bats-core — run `git submodule update --init` once if missing).
#
# setup_file() runs bootstrap.sh twice inside a clean ubuntu:22.04 container (once — it's
# expensive: apt installs, image pulls). Each @test below then makes its own independent
# assertion against the captured logs/filesystem, so one broken behavior doesn't hide the rest.
#
# Coverage: syntax, base-package install, native Docker-install apt sequence (packages only — a
# plain container can't run a nested Docker daemon, so "docker info" succeeding post-install isn't
# checked), cloudflared install, repo self-clone, directory scaffolding, clean stop-and-exit-0 at
# the first manual step (cloudflared login), and idempotency (second run recognizes everything
# from the first run as already done, except Docker — see the note on that test below).
#
# Not covered, and not realistically coverable in a container: real cloudflared tunnel
# login/create, real GitHub runner registration (both need live credentials). Review those by eye
# instead. (bootstrap.sh no longer has a separate WSL branch to not-cover — WSL2 runs a real Linux
# kernel, so Docker Engine installs the same way there as on a native host; see ADR 003.)

setup_file() {
  # Git Bash/MSYS2 support: MSYS_NO_PATHCONV=1 stops MSYS from mangling the CONTAINER-side targets
  # (e.g. "/repo", "/logs") of the `docker run -v host:/container` call below - without it, those
  # targets silently become Windows path fragments and never exist inside the container. But that
  # alone breaks the HOST-side sources instead: a bare POSIX path then reaches docker.exe
  # untranslated, which Docker Desktop resolves against its own WSL2 VM filesystem rather than the
  # real Windows host disk - the container write succeeds with no error, but nothing lands where
  # this test's own assertions look for it on the host. Fix: convert host-side paths to native
  # Windows form ourselves via `docker_host_path` (cygpath -w) at the `-v` call site only - each
  # variable itself stays POSIX for every other (non-docker) use below. Both `cygpath` and this
  # whole block are no-ops on native Linux/WSL - the real CI runner and a real WSL host running
  # this test by hand - where POSIX paths already work directly.
  export MSYS_NO_PATHCONV=1
  docker_host_path() {
    if command -v cygpath >/dev/null 2>&1; then
      cygpath -w "$1"
    else
      printf '%s' "$1"
    fi
  }

  REPO_ROOT="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"
  export REPO_ROOT
  cd "$REPO_ROOT"

  export HOME_DIR="$BATS_FILE_TMPDIR/tester-home"
  export LOG_DIR="$BATS_FILE_TMPDIR/logs"
  mkdir -p "$HOME_DIR" "$LOG_DIR"

  # HOME_DIR and LOG_DIR are bind-mounted so their contents survive after the --rm container
  # exits, letting each @test below inspect the result independently instead of asserting
  # everything inside one giant nested script.
  docker run --rm \
    -v "$(docker_host_path "$REPO_ROOT")":/repo:ro \
    -v "$(docker_host_path "$HOME_DIR")":/home/tester \
    -v "$(docker_host_path "$LOG_DIR")":/logs \
    ubuntu:22.04 bash -c '
    set -e
    apt-get update -y >/dev/null
    # gnupg is needed for the Docker/cloudflared repo-key steps below. It ships on a real
    # installed Ubuntu host (WSL2 distros included) but not on this minimized Docker base image,
    # so it is pre-installed here to make the container a fair stand-in for "a fresh Ubuntu-like
    # host" (the scenario bootstrap.sh is actually written for) rather than testing something
    # more stripped-down than any real target.
    apt-get install -y sudo gnupg >/dev/null
    useradd -m -d /home/tester tester
    echo "tester ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/tester
    chmod 440 /etc/sudoers.d/tester
    chown -R tester:tester /home/tester

    # The bind-mounted /repo (this repo checkout, used as REPO_URL=file:///repo so the clone step
    # below has no dependency on real network access to GitHub) shows up owned by a different
    # UID than "tester" once mounted into the container - tripping Git dubious-ownership
    # protection (CVE-2022-24765) on the very first clone attempt, with no relation to anything
    # bootstrap.sh itself does. Real usage clones over HTTPS from GitHub, where this never applies
    # - this is purely a test-fixture artifact of simulating a local, network-free clone source.
    # Written as a plain file, not via "git config", since git itself is not installed yet at
    # this point - that happens later, inside the "Installing base packages" step of bootstrap.sh.
    printf "[safe]\n\tdirectory = /repo/.git\n" > /home/tester/.gitconfig
    chown tester:tester /home/tester/.gitconfig

    set +e
    su tester -c "REPO_URL=file:///repo REPO_DIR=/home/tester/systems-playground bash /repo/scripts/bootstrap.sh" \
      > /logs/run1.log 2>&1
    echo $? > /logs/run1.exit

    su tester -c "REPO_URL=file:///repo REPO_DIR=/home/tester/systems-playground bash /repo/scripts/bootstrap.sh" \
      > /logs/run2.log 2>&1
    echo $? > /logs/run2.exit
  '
}

@test "syntax check" {
  bash -n "$REPO_ROOT/scripts/bootstrap.sh"
}

@test "run 1: exits 0 (stops cleanly at cloudflared login, does not error)" {
  [ "$(cat "$LOG_DIR/run1.exit")" = "0" ]
}

@test "run 1: installs base packages" {
  grep -q "Installing base packages" "$LOG_DIR/run1.log"
}

@test "run 1: installs Docker Engine (native-host branch)" {
  grep -q "Installing Docker Engine" "$LOG_DIR/run1.log"
}

@test "run 1: installs cloudflared" {
  grep -q "Installing cloudflared" "$LOG_DIR/run1.log"
}

@test "run 1: clones the repo" {
  grep -q "Cloned\." "$LOG_DIR/run1.log"
  [ -d "$HOME_DIR/systems-playground/.git" ]
}

@test "run 1: scaffolds infra/apps directories" {
  grep -q "ready (populated later" "$LOG_DIR/run1.log"
  [ -d "$HOME_DIR/infra" ]
  [ -d "$HOME_DIR/apps" ]
}

@test "run 1: stops cleanly at cloudflared tunnel login" {
  grep -q "Run 'cloudflared tunnel login'" "$LOG_DIR/run1.log"
}

@test "run 2: recognizes base packages already present (idempotent)" {
  grep -q "Base packages already present" "$LOG_DIR/run2.log"
}

# Docker's own idempotency check is `docker info` succeeding, which needs a live daemon — not
# available in this non-privileged nested container on either run, so the script harmlessly
# re-runs the (idempotent-at-the-apt-level) install commands both times instead of reporting
# "already working." Real target hosts have a live daemon, so the intended skip only shows there.
@test "run 2: Docker step re-runs (known container limitation, not a script bug)" {
  grep -q "Installing Docker Engine" "$LOG_DIR/run2.log"
}

@test "run 2: recognizes cloudflared already installed (idempotent)" {
  grep -q "cloudflared already installed" "$LOG_DIR/run2.log"
}

@test "run 2: recognizes repo already present (idempotent)" {
  grep -q "Repo already present" "$LOG_DIR/run2.log"
}

@test "run 2: still exits 0" {
  [ "$(cat "$LOG_DIR/run2.exit")" = "0" ]
}
