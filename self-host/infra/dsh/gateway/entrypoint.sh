#!/bin/sh
set -eu

# The upstream overrides exist so the gateway can be exercised against a local stand-in without a real key.
export OPENROUTER_UPSTREAM="${OPENROUTER_UPSTREAM:-https://openrouter.ai/api}"
export ANTHROPIC_UPSTREAM="${ANTHROPIC_UPSTREAM:-https://api.anthropic.com}"
export OPENROUTER_API_KEY="${OPENROUTER_API_KEY:-}"
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-}"

# Rendered onto tmpfs, so the keys exist only in this container's memory and environment.
envsubst '${OPENROUTER_UPSTREAM} ${ANTHROPIC_UPSTREAM} ${OPENROUTER_API_KEY} ${ANTHROPIC_API_KEY}' \
  < /etc/gateway/nginx.conf.template > /tmp/nginx.conf

exec nginx -c /tmp/nginx.conf -g 'daemon off;'
