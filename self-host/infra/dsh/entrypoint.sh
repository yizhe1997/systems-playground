#!/bin/sh
set -eu

[ -f "$DSH_HOME/settings.yaml" ] || cp /opt/dsh/settings.seed.yaml "$DSH_HOME/settings.yaml"

# dsh binds loopback only (the CLI rejects --host 0.0.0.0), so a forwarder exposes it on the container interface.
socat TCP-LISTEN:3081,fork,reuseaddr TCP:127.0.0.1:3080 &

set --
for h in $(printf '%s' "${DSH_TRUSTED_HOSTS:-}" | tr ',' ' '); do
  set -- "$@" --trusted-host "$h"
done

# The default profile's live patch reload loads an HMR plugin that requires this flag in process.execArgv (NODE_OPTIONS does not count).
exec node --expose-internals "$(command -v dsh)" web --no-open --port 3080 "$@"
