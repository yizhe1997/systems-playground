#!/usr/bin/env bash
# SC-008 and FR-020: a production start with the development session secret present is refused by both services,
# and the same start without it (or outside production) is not refused for that reason.
# Builds the two images from the working tree (cached layers make this quick after the first time), generates throwaway
# secrets for the run, prints none of them, and starts nothing that stays running.
# Usage: scripts/check-dev-secret-refused.sh
set -u
cd "$(dirname "$0")/.."
fail=0
gen() { node -e "process.stdout.write(require('crypto').randomBytes(36).toString('base64url'))"; }
SVC=$(gen); AUTH=$(gen); DEV=$(gen)

docker build -q -t tradecraft-refuse-check-backend backend >/dev/null || { echo "FAIL: could not build the backend image"; exit 1; }
docker build -q -t tradecraft-refuse-check-frontend frontend >/dev/null || { echo "FAIL: could not build the frontend image"; exit 1; }

# ---- API: the refusal comes before it touches the database, so no database is needed
run_api() { # $1 = TRADECRAFT_ENV ("" to leave it unset), $2 = DEV_SESSION_SECRET
  local envs=(-e DATABASE_URL=postgres://nobody@127.0.0.1:1/none -e SERVICE_TOKEN_SECRET="$SVC")
  [ -n "$1" ] && envs+=(-e TRADECRAFT_ENV="$1")
  [ -n "$2" ] && envs+=(-e DEV_SESSION_SECRET="$2")
  timeout 60 docker run --rm "${envs[@]}" tradecraft-refuse-check-backend 2>&1
}
out=$(run_api production "$DEV"); code=$?
if [ "$code" -ne 0 ] && echo "$out" | grep -q "DEV_SESSION_SECRET is set while TRADECRAFT_ENV is production"; then
  echo "ok: the API refuses to start in production with the development secret"
else echo "FAIL: the API did not refuse (exit $code)"; fail=1; fi
out=$(run_api "" "$DEV"); code=$?
if [ "$code" -ne 0 ] && echo "$out" | grep -q "refusing to start"; then
  echo "ok: the API refuses when TRADECRAFT_ENV is unset (production is the default)"
else echo "FAIL: the API did not refuse with TRADECRAFT_ENV unset (exit $code)"; fail=1; fi
out=$(run_api local "$DEV")
if echo "$out" | grep -q "refusing to start"; then
  echo "FAIL: the API refused outside production"; fail=1
else echo "ok: the API does not refuse in local mode (it goes on to the database, which this check does not provide)"; fi
if echo "$out$(run_api production "")" | grep -q "$DEV"; then echo "FAIL: a secret appeared in the output"; fail=1; fi

# ---- web tier: instrumentation.ts stops the server at start
web() { # $1 = TRADECRAFT_ENV, $2 = DEV_SESSION_SECRET ("" for none); prints the container id
  local envs=(-e NEXTAUTH_URL=http://127.0.0.1:3000 -e NEXTAUTH_SECRET="$AUTH" -e SERVICE_TOKEN_SECRET="$SVC")
  [ -n "$1" ] && envs+=(-e TRADECRAFT_ENV="$1")
  [ -n "$2" ] && envs+=(-e DEV_SESSION_SECRET="$2")
  docker run -d "${envs[@]}" tradecraft-refuse-check-frontend
}
id=$(web production "$DEV"); sleep 8
state=$(docker inspect -f '{{.State.Running}} {{.State.ExitCode}}' "$id"); logs=$(docker logs "$id" 2>&1); docker rm -f "$id" >/dev/null
if [ "${state%% *}" = "false" ] && [ "${state##* }" != "0" ] && echo "$logs" | grep -q "DEV_SESSION_SECRET is set while TRADECRAFT_ENV is production"; then
  echo "ok: the web tier refuses to start in production with the development secret"
else echo "FAIL: the web tier did not refuse (state: $state)"; fail=1; fi
if echo "$logs" | grep -q "$DEV"; then echo "FAIL: a secret appeared in the web tier's output"; fail=1; fi

id=$(web local "$DEV"); sleep 8
state=$(docker inspect -f '{{.State.Running}}' "$id"); docker rm -f "$id" >/dev/null
if [ "$state" = "true" ]; then echo "ok: the web tier starts in local mode with the development secret"
else echo "FAIL: the web tier did not start in local mode"; fail=1; fi

id=$(web production ""); sleep 8
state=$(docker inspect -f '{{.State.Running}}' "$id"); docker rm -f "$id" >/dev/null
if [ "$state" = "true" ]; then echo "ok: the web tier starts in production without it"
else echo "FAIL: the web tier did not start in production without the development secret"; fail=1; fi

exit $fail
