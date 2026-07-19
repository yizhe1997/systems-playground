#!/usr/bin/env bats
# Container-based test for self-host/infra/scripts/wsl-backup.sh + the restore procedure
# documented in self-host/infra/scripts/README.md. Runs identically locally (`make test-infra`)
# and in CI (.github/workflows/test-scripts.yml) — this file is the single source of truth, the
# workflow just calls it via bats. Requires Docker and the bats-core submodule
# (scripts/tests/vendor/bats-core — run `git submodule update --init` once if missing).
#
# setup_file() does the full round trip once: seeds known content into fake volumes/paths, runs
# the real wsl-backup.sh, then follows the exact restore procedure from scripts/README.md. Each
# @test below then makes its own independent assertion against the captured results, so one
# broken behavior doesn't hide the rest.
#
# Exercises every distinct code path in the infra backup script: a generic Compose-labelled
# volume, the hardcoded n8n external-volume carve-out, a bind-mounted path, the
# Postgres-stop-around-snapshot special case (directory literally named "n8n" — the script keys
# off the name, not the image), and retention pruning.

setup_file() {
  # Git Bash/MSYS2 support: MSYS_NO_PATHCONV=1 stops MSYS from mangling the CONTAINER-side target
  # (e.g. "/backup", "/volume") of the `docker run -v host:/container` calls below - without it,
  # that target silently becomes a Windows path fragment and never exists inside the container.
  # But that alone breaks the HOST-side source instead: a bare POSIX path then reaches docker.exe
  # untranslated, which Docker Desktop resolves against its own WSL2 VM filesystem rather than the
  # real Windows host disk - the container write succeeds with no error, but nothing lands where
  # this test's own `[ -f ... ]` assertions look for it on the host. Fix: convert host-side paths
  # to native Windows form ourselves via `docker_host_path` (cygpath -w) at each `-v` call site
  # only - the variable itself stays POSIX for every other (non-docker) use below. Both `cygpath`
  # and this whole block are no-ops on native Linux/WSL - the real CI runner and a real WSL host
  # running this test by hand - where POSIX paths already work directly.
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

  export TEST_DIR="$BATS_FILE_TMPDIR/infra"
  export RESTORE_DIR="$BATS_FILE_TMPDIR/restored-filebrowser"
  mkdir -p "$TEST_DIR" "$RESTORE_DIR"

  cp self-host/infra/scripts/wsl-backup.sh "$TEST_DIR/"
  chmod +x "$TEST_DIR/wsl-backup.sh"

  cat > "$TEST_DIR/.env" <<EOF
BACKUP_DIR=$TEST_DIR/backups
BACKUP_RETENTION_DAYS=1
EOF

  # Fake n8n fixture, named "bats-n8n" rather than the real "n8n" -- Compose infers a project's
  # identity from directory basename alone, so a fixture literally named "n8n" would target the
  # SAME project as the real ~/infra/n8n if this test is ever run directly on a host that's also
  # running it for real (this bit a previous version of this suite: the label-filtered volume
  # queries below picked up an unrelated real volume and corrupted a variable with an embedded
  # newline). wsl-backup.sh's Postgres-quiesce special case is pointed at this name via the
  # POSTGRES_BACKED_SERVICES_OVERRIDE env var below instead of relying on the literal name.
  #
  # Volume key is deliberately not "n8n_data" — Compose would name the resulting volume
  # "bats-n8n_n8n_data" (<project>_<key>), colliding with the EXTERNAL_VOLUMES fixture created
  # below (which mimics the real script's hardcoded external-volume names).
  export POSTGRES_BACKED_SERVICES_OVERRIDE="bats-n8n"
  mkdir -p "$TEST_DIR/bats-n8n"
  cat > "$TEST_DIR/bats-n8n/docker-compose.yml" <<'EOF'
services:
  n8n:
    image: alpine:3.20
    command: sleep infinity
    volumes:
      - workdata:/data
volumes:
  workdata:
EOF

  mkdir -p "$TEST_DIR/widget"
  cat > "$TEST_DIR/widget/docker-compose.yml" <<'EOF'
services:
  widget:
    image: alpine:3.20
    command: sleep infinity
    volumes:
      - data:/data
volumes:
  data:
EOF

  # Filebrowser's bind-mounted path, per self-host/infra/scripts/README.md.
  mkdir -p "$TEST_DIR/filebrowser/data/files"
  echo "filebrowser-test-content" > "$TEST_DIR/filebrowser/data/files/resume.txt"

  cd "$TEST_DIR"
  docker compose -f widget/docker-compose.yml -p widget up -d
  docker compose -f bats-n8n/docker-compose.yml -p bats-n8n up -d

  # External volumes, named to match the EXTERNAL_VOLUMES_OVERRIDE below rather than the real
  # "n8n_postgres_data"/"n8n_n8n_data" -- those are real, populated production volumes on this
  # host, and this fixture writes test content directly into whatever volume these names resolve
  # to (n8n's real ones are declared `external: true`, so they never carry a Compose project
  # label — created and seeded directly here, matching that).
  export EXTERNAL_VOLUMES_OVERRIDE="bats-n8n_postgres_data bats-n8n_n8n_data"
  docker volume create bats-n8n_postgres_data >/dev/null
  docker volume create bats-n8n_n8n_data >/dev/null
  docker run --rm -v bats-n8n_postgres_data:/data alpine sh -c 'echo pg-test-content > /data/marker.txt'
  docker run --rm -v bats-n8n_n8n_data:/data alpine sh -c 'echo n8n-test-content > /data/marker.txt'

  export WIDGET_VOL
  WIDGET_VOL="$(docker volume ls -q --filter label=com.docker.compose.project=widget)"
  export N8N_VOL
  N8N_VOL="$(docker volume ls -q --filter label=com.docker.compose.project=bats-n8n)"
  docker run --rm -v "$WIDGET_VOL":/data alpine sh -c 'echo widget-test-content > /data/marker.txt'
  docker run --rm -v "$N8N_VOL":/data alpine sh -c 'echo n8n-vol-test-content > /data/marker.txt'

  # Backdated fake run, to verify retention pruning.
  OLD_RUN="$TEST_DIR/backups/20200101_000000"
  mkdir -p "$OLD_RUN"
  touch "$OLD_RUN/marker"
  find "$OLD_RUN" -exec touch -d '3 days ago' {} +

  set +e
  bash wsl-backup.sh > "$TEST_DIR/.backup.log" 2>&1
  echo $? > "$TEST_DIR/.backup.exit"
  set -e

  export RUN_DIR
  RUN_DIR="$(find "$TEST_DIR/backups" -maxdepth 1 -type d -name '2*' | sort | tail -1)"

  docker compose -f bats-n8n/docker-compose.yml -p bats-n8n ps --status running > "$TEST_DIR/.n8n-after-backup.txt" 2>/dev/null || true

  # Restore round trip: each volume into a fresh "restored_*" volume, content captured for the
  # @test blocks below to diff against the original.
  restore_volume() {
    local vol="$1"
    docker volume create "restored_${vol}" >/dev/null
    docker run --rm -v "restored_${vol}":/volume -v "$(docker_host_path "$RUN_DIR")":/backup alpine \
      sh -c "tar xzf /backup/volume_${vol}.tar.gz -C /volume"
    docker run --rm -v "restored_${vol}":/volume alpine cat /volume/marker.txt
  }

  restore_volume "$WIDGET_VOL" > "$TEST_DIR/.restored-widget.txt"
  restore_volume "$N8N_VOL" > "$TEST_DIR/.restored-n8n.txt"
  restore_volume "bats-n8n_postgres_data" > "$TEST_DIR/.restored-n8n-postgres.txt"
  restore_volume "bats-n8n_n8n_data" > "$TEST_DIR/.restored-n8n-n8n.txt"

  tar xzf "$RUN_DIR/bind_filebrowser_files.tar.gz" -C "$RESTORE_DIR"
}

teardown_file() {
  cd "$TEST_DIR" 2>/dev/null || true
  docker compose -f widget/docker-compose.yml -p widget down -v 2>/dev/null || true
  docker compose -f bats-n8n/docker-compose.yml -p bats-n8n down -v 2>/dev/null || true
  docker volume rm bats-n8n_postgres_data bats-n8n_n8n_data 2>/dev/null || true
  docker volume rm "restored_${WIDGET_VOL:-__none__}" 2>/dev/null || true
  docker volume rm "restored_${N8N_VOL:-__none__}" 2>/dev/null || true
  docker volume rm restored_bats-n8n_postgres_data restored_bats-n8n_n8n_data 2>/dev/null || true
}

@test "syntax check" {
  bash -n "$REPO_ROOT/self-host/infra/scripts/wsl-backup.sh"
}

@test "backup: exits 0" {
  [ "$(cat "$TEST_DIR/.backup.exit")" = "0" ]
}

@test "backup: stops n8n before snapshotting" {
  grep -qi "Stopping bats-n8n" "$TEST_DIR/.backup.log"
}

@test "backup: restarts n8n after snapshotting" {
  grep -qi "Starting bats-n8n" "$TEST_DIR/.backup.log"
}

@test "backup: n8n container is running again" {
  grep -q n8n "$TEST_DIR/.n8n-after-backup.txt"
}

@test "backup: produces the widget volume tarball" {
  [ -f "$RUN_DIR/volume_${WIDGET_VOL}.tar.gz" ]
}

@test "backup: produces the n8n volume tarball" {
  [ -f "$RUN_DIR/volume_${N8N_VOL}.tar.gz" ]
}

@test "backup: produces the n8n external postgres_data tarball" {
  [ -f "$RUN_DIR/volume_bats-n8n_postgres_data.tar.gz" ]
}

@test "backup: produces the n8n external n8n_data tarball" {
  [ -f "$RUN_DIR/volume_bats-n8n_n8n_data.tar.gz" ]
}

@test "backup: produces the filebrowser bind-mount tarball" {
  [ -f "$RUN_DIR/bind_filebrowser_files.tar.gz" ]
}

@test "retention: prunes the backdated run" {
  [ ! -d "$TEST_DIR/backups/20200101_000000" ]
}

@test "restore: widget volume content matches the original" {
  [ "$(cat "$TEST_DIR/.restored-widget.txt")" = "widget-test-content" ]
}

@test "restore: n8n volume content matches the original" {
  [ "$(cat "$TEST_DIR/.restored-n8n.txt")" = "n8n-vol-test-content" ]
}

@test "restore: n8n external postgres_data content matches the original" {
  [ "$(cat "$TEST_DIR/.restored-n8n-postgres.txt")" = "pg-test-content" ]
}

@test "restore: n8n external n8n_data content matches the original" {
  [ "$(cat "$TEST_DIR/.restored-n8n-n8n.txt")" = "n8n-test-content" ]
}

@test "restore: filebrowser bind-mounted files match the original" {
  # wsl-backup.sh tars with `-C "$(dirname "$SRC")" "$(basename "$SRC")"`, so the archive's
  # top-level entry is "files/", not the file itself -- matches the README's documented restore
  # target ($INFRA_BASE_DIR/filebrowser/data/), which $RESTORE_DIR stands in for here.
  diff "$RESTORE_DIR/files/resume.txt" "$TEST_DIR/filebrowser/data/files/resume.txt"
}
