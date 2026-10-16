#!/usr/bin/env bash
# SC-010: after the stack is stopped and started, every account and trade is still there.
# Takes the full export, stops and starts the stack (the data volume is kept), takes it again, and compares them.
# Usage: scripts/check-persistence.sh <compose-project> <api-url>
set -u
cd "$(dirname "$0")/.."
project="${1:?compose project}"
api="${2:?api url, for example http://127.0.0.1:8081}"
PY=$(command -v python3 || command -v python)
before=$(mktemp) after=$(mktemp)
trap 'rm -f "$before" "$after"' EXIT

# The API needs a signed token (feature 002): SERVICE_TOKEN_SECRET and OWNER_BOOTSTRAP_EMAIL must be in the environment.
# Each export writes its own audit entry, so those entries are left out of the comparison.
export_all() {
  curl -fsS -H "Authorization: Bearer $(node scripts/service-token.mjs)" "$api/export" |
    "$PY" -c "import sys,json; d=json.load(sys.stdin); d.pop('exportedAt'); d['auditEntries']=[e for e in d['auditEntries'] if e['kind']!='export_downloaded']; print(json.dumps(d, sort_keys=True, indent=1))" > "$1"
}

export_all "$before" || { echo "FAIL: could not read the export before"; exit 1; }
docker compose -p "$project" stop >/dev/null 2>&1
docker compose -p "$project" start >/dev/null 2>&1
for i in $(seq 1 60); do curl -fsS "$api/health" >/dev/null 2>&1 && break; sleep 1; done
export_all "$after" || { echo "FAIL: could not read the export after"; exit 1; }
if diff -q "$before" "$after" >/dev/null; then
  echo "ok: $("$PY" -c "import json,sys;d=json.load(sys.stdin);print(len(d['accounts']),'accounts and',len(d['trades']),'trades')" < "$after") identical after a stop and start"
else
  echo "FAIL: the export changed across a stop and start"; diff "$before" "$after" | head -20; exit 1
fi
