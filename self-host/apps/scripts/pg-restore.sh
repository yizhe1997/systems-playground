#!/bin/bash
# Restore a pg_dump -Fc file made by wsl-backup.sh into a RUNNING Postgres container, replacing
# what is there. Usage: pg-restore.sh <directory:service> <path/to/pg_<directory>_<service>.dump>
# e.g.  pg-restore.sh n8n:db ~/infra/backups/20261101_030000/pg_n8n_db.dump
# <directory:service> is the same entry wsl-backup.sh lists in PG_DATABASES. Stop whatever uses the
# database first (the app container, not the Postgres one). It is one transaction: if the restore
# fails, the existing data is left as it was.
set -euo pipefail
export MSYS_NO_PATHCONV=1

ENTRY="${1:?usage: pg-restore.sh <directory:service> <dump file>}"
DUMP="${2:?usage: pg-restore.sh <directory:service> <dump file>}"
[ -f "$DUMP" ] || { echo "[!] $DUMP not found" >&2; exit 1; }

CID="$(docker ps -q --filter "label=com.docker.compose.project=${ENTRY%%:*}" \
                    --filter "label=com.docker.compose.service=${ENTRY##*:}" | head -n1)"
[ -n "$CID" ] || { echo "[!] $ENTRY is not running" >&2; exit 1; }

docker exec -i "$CID" sh -c \
  'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --single-transaction --clean --if-exists --no-owner' < "$DUMP"
echo "[✔] Restored $DUMP into $ENTRY"
