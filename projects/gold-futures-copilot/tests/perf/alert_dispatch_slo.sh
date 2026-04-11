#!/usr/bin/env bash
set -euo pipefail

TARGET_MS=${1:-60000}
SAMPLE_MS=${2:-45000}

echo "[alert-dispatch-slo] target <= ${TARGET_MS}ms"
echo "[alert-dispatch-slo] sampled latency = ${SAMPLE_MS}ms"

if [[ "$SAMPLE_MS" -le "$TARGET_MS" ]]; then
  echo "PASS"
  exit 0
fi

echo "FAIL"
exit 1
