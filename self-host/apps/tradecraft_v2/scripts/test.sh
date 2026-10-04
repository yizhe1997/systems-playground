#!/usr/bin/env bash
# Runs the whole check on a throwaway database: the Go tests against a real Postgres, then the Playwright
# run against the composed stack, and tears everything down. Only Docker (and Node for Playwright) is needed.
# Usage: POSTGRES_PASSWORD=<anything> ./scripts/test.sh
set -u
cd "$(dirname "$0")/.."
: "${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD (any value; the database is thrown away)}"
export POSTGRES_PASSWORD
# a separate compose project, so this never touches the running app's data volume
compose=(docker compose -p tradecraft-v2-test)
status=0
"${compose[@]}" --profile tests run --rm tests || status=$?
if [ "$status" -eq 0 ]; then
  BACKEND_HOST_PORT=18081 FRONTEND_HOST_PORT=13100 POSTGRES_HOST_PORT=15435 "${compose[@]}" up --build -d --wait || status=$?
  if [ "$status" -eq 0 ]; then
    (cd frontend && E2E_BASE_URL=http://127.0.0.1:13100 E2E_API_URL=http://127.0.0.1:18081 npx playwright test) || status=$?
  fi
fi
"${compose[@]}" down -v >/dev/null 2>&1
exit $status
