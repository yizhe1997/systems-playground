#!/usr/bin/env bats
# Container-based test for self-host/apps/scripts/wsl-backup.sh + the restore procedure
# documented in self-host/apps/scripts/README.md. Runs identically locally (`make test-apps`) and
# in CI (.github/workflows/test-apps-scripts.yml) — this file is the single source of truth, the
# workflow just calls it via bats. Requires Docker and the bats-core submodule
# (scripts/tests/vendor/bats-core — run `git submodule update --init` once if missing).
#
# No external volumes or bind paths on this layer today — the generic Compose-labelled-volume
# backup/restore round trip, a Postgres dump with pg-restore.sh (real Postgres container), plus
# retention, run once in setup_file() and asserted independently by each @test below.

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

  export TEST_DIR="$BATS_FILE_TMPDIR/apps"
  mkdir -p "$TEST_DIR"

  cp self-host/apps/scripts/wsl-backup.sh "$TEST_DIR/"
  chmod +x "$TEST_DIR/wsl-backup.sh"

  cat > "$TEST_DIR/.env" <<EOF
APP_BACKUP_DIR=$TEST_DIR/backups
APP_BACKUP_RETENTION_DAYS=1
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

  # Named "bats-pg", not like a real app: Compose keys a project on the directory name alone.
  export PG_DATABASES_OVERRIDE="bats-pg:db"
  mkdir -p "$TEST_DIR/bats-pg"
  cat > "$TEST_DIR/bats-pg/docker-compose.yml" <<'EOF'
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: tester
      POSTGRES_PASSWORD: tester
      POSTGRES_DB: testdb
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pgdata:
EOF

  cd "$TEST_DIR"
  docker compose -f widget/docker-compose.yml -p widget up -d
  docker compose -f bats-pg/docker-compose.yml -p bats-pg up -d
  export PG_CID
  PG_CID="$(docker ps -q --filter label=com.docker.compose.project=bats-pg --filter label=com.docker.compose.service=db)"
  until docker exec "$PG_CID" pg_isready -U tester -d testdb -h 127.0.0.1 >/dev/null 2>&1; do sleep 1; done
  docker exec "$PG_CID" psql -U tester -d testdb -c "create table t(v text); insert into t values ('pg-test-content');" >/dev/null
  PG_STARTED="$(docker inspect -f '{{.State.StartedAt}}' "$PG_CID")"
  export PG_VOL
  PG_VOL="$(docker volume ls -q --filter label=com.docker.compose.project=bats-pg)"
  export WIDGET_VOL
  WIDGET_VOL="$(docker volume ls -q --filter label=com.docker.compose.project=widget)"
  docker run --rm -v "$WIDGET_VOL":/data alpine sh -c 'echo widget-test-content > /data/marker.txt'

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

  [ "$(docker inspect -f '{{.State.StartedAt}}' "$PG_CID")" = "$PG_STARTED" ] && echo unchanged > "$TEST_DIR/.pg-uptime.txt"
  docker exec "$PG_CID" psql -U tester -d testdb -c "delete from t;" >/dev/null
  bash "$REPO_ROOT/self-host/apps/scripts/pg-restore.sh" bats-pg:db "$RUN_DIR/pg_bats-pg_db.dump" > "$TEST_DIR/.pg-restore.log" 2>&1
  docker exec "$PG_CID" psql -U tester -d testdb -Atc "select v from t;" > "$TEST_DIR/.restored-pg.txt"

  docker volume create "restored_${WIDGET_VOL}" >/dev/null
  docker run --rm -v "restored_${WIDGET_VOL}":/volume -v "$(docker_host_path "$RUN_DIR")":/backup alpine \
    sh -c "tar xzf /backup/volume_${WIDGET_VOL}.tar.gz -C /volume"
  docker run --rm -v "restored_${WIDGET_VOL}":/volume alpine cat /volume/marker.txt > "$TEST_DIR/.restored-widget.txt"
}

teardown_file() {
  cd "$TEST_DIR" 2>/dev/null || true
  docker compose -f widget/docker-compose.yml -p widget down -v 2>/dev/null || true
  docker compose -f bats-pg/docker-compose.yml -p bats-pg down -v 2>/dev/null || true
  docker volume rm "restored_${WIDGET_VOL:-__none__}" 2>/dev/null || true
}

@test "syntax check" {
  bash -n "$REPO_ROOT/self-host/apps/scripts/wsl-backup.sh" && bash -n "$REPO_ROOT/self-host/apps/scripts/pg-restore.sh"
}

@test "backup: exits 0" {
  [ "$(cat "$TEST_DIR/.backup.exit")" = "0" ]
}

@test "backup: produces the widget volume tarball" {
  [ -f "$RUN_DIR/volume_${WIDGET_VOL}.tar.gz" ]
}

@test "backup: dumps the Postgres database" {
  [ -s "$RUN_DIR/pg_bats-pg_db.dump" ]
}

@test "backup: Postgres container was not restarted" {
  [ "$(cat "$TEST_DIR/.pg-uptime.txt")" = "unchanged" ]
}

@test "backup: Postgres data volume is not also tarred" {
  [ ! -f "$RUN_DIR/volume_${PG_VOL}.tar.gz" ]
}

@test "restore: pg-restore.sh brings the deleted row back" {
  [ "$(cat "$TEST_DIR/.restored-pg.txt")" = "pg-test-content" ]
}

@test "retention: prunes the backdated run" {
  [ ! -d "$TEST_DIR/backups/20200101_000000" ]
}

@test "restore: widget volume content matches the original" {
  [ "$(cat "$TEST_DIR/.restored-widget.txt")" = "widget-test-content" ]
}
