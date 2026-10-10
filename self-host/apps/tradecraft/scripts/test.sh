#!/usr/bin/env bash
# Runs the whole check on a throwaway database: the Go tests against a real Postgres, then the Playwright
# run against the composed stack, and tears everything down. Only Docker (and Node for Playwright) is needed.
# Usage: POSTGRES_PASSWORD=<anything> ./scripts/test.sh
set -u
cd "$(dirname "$0")/.."
: "${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD (any value; the database is thrown away)}"
export POSTGRES_PASSWORD
# a separate compose project and other host ports, so this never touches the running app or its data volume
export POSTGRES_HOST_PORT=15435 BACKEND_HOST_PORT=18081 FRONTEND_HOST_PORT=13100
# Fresh random secrets for every run (feature 002): they are exported to the compose stack and to Playwright, never
# written to a file and never printed. DEV_SESSION_SECRET lets the browser tests sign in without Google, which the
# stack accepts only because TRADECRAFT_ENV is test.
gen() { node -e "process.stdout.write(require('crypto').randomBytes(36).toString('base64url'))"; }
NEXTAUTH_SECRET=$(gen); SERVICE_TOKEN_SECRET=$(gen); DEV_SESSION_SECRET=$(gen)
export NEXTAUTH_SECRET SERVICE_TOKEN_SECRET DEV_SESSION_SECRET
export OWNER_BOOTSTRAP_EMAIL=owner@example.com NEXTAUTH_URL=http://127.0.0.1:13100 TRADECRAFT_ENV=test
# not real credentials: enough for the sign-in screen to start the Google flow, which the browser tests intercept
GOOGLE_CLIENT_ID=tradecraft-test-client.apps.googleusercontent.com; GOOGLE_CLIENT_SECRET=$(gen)
export GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET
compose=(docker compose -p tradecraft-v2-test)
status=0
"${compose[@]}" --profile tests run --rm tests || status=$?
if [ "$status" -eq 0 ]; then
  "${compose[@]}" up --build -d --wait || status=$?
  if [ "$status" -eq 0 ]; then
    (cd frontend && E2E_BASE_URL=http://127.0.0.1:13100 E2E_API_URL=http://127.0.0.1:18081 npx playwright test) || status=$?
    # SC-009 (loopback only, no secret in the repository or a log) and SC-010 (data survives a stop and start)
    bash scripts/check-loopback.sh tradecraft-v2-test || status=$?
    bash scripts/check-persistence.sh tradecraft-v2-test http://127.0.0.1:18081 || status=$?
  fi
fi
"${compose[@]}" down -v >/dev/null 2>&1
exit $status
