#!/usr/bin/env bash
# SC-009 and constitution IV: every published port is a loopback address, and no secret is in the repository or a log.
# Usage: scripts/check-loopback.sh [compose-project]   (the stack must be running; POSTGRES_PASSWORD in the environment
# or in .env lets it also look for the password itself)
set -u
cd "$(dirname "$0")/.."
project="${1:-tradecraft-v2}"
fail=0

ports=$(docker ps --filter "label=com.docker.compose.project=$project" --format '{{.Names}} {{.Ports}}')
if [ -z "$ports" ]; then echo "FAIL: no running containers for project $project"; exit 1; fi
echo "$ports"
if echo "$ports" | grep -E '0\.0\.0\.0:|\[::\]:' >/dev/null; then
  echo "FAIL: a port is published beyond the loopback address"; fail=1
else
  echo "ok: only loopback addresses are published"
fi
if ! echo "$ports" | grep -q '127.0.0.1:'; then echo "FAIL: nothing is published on 127.0.0.1 at all"; fail=1; fi

# No secret is in a tracked file or a container log: the database password and, feature 002, every sign-in secret that
# is in the environment (never printed here, only found or not found).
check_secret() { # $1 = name, $2 = value
  local name="$1" value="$2"
  if [ -z "$value" ]; then echo "skipped: no $name to look for"; return; fi
  if git ls-files -z | xargs -0 grep -I -l -F -- "$value" 2>/dev/null | grep -q .; then
    echo "FAIL: $name appears in a tracked file"; fail=1
  else
    echo "ok: $name is in no tracked file"
  fi
  if docker compose -p "$project" logs --no-color 2>&1 | grep -F -q -- "$value"; then
    echo "FAIL: $name appears in a container log"; fail=1
  else
    echo "ok: $name is in no container log"
  fi
}
pw="${POSTGRES_PASSWORD:-}"
if [ -z "$pw" ] && [ -f .env ]; then pw=$(grep -E '^POSTGRES_PASSWORD=' .env | cut -d= -f2-); fi
check_secret "the database password" "$pw"
check_secret "NEXTAUTH_SECRET" "${NEXTAUTH_SECRET:-}"
check_secret "SERVICE_TOKEN_SECRET" "${SERVICE_TOKEN_SECRET:-}"
check_secret "DEV_SESSION_SECRET" "${DEV_SESSION_SECRET:-}"
check_secret "GOOGLE_CLIENT_SECRET" "${GOOGLE_CLIENT_SECRET:-}"
exit $fail
