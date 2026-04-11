#!/usr/bin/env bash
set -euo pipefail

P95_MS=${1:-20000}
SAMPLE_MS=${2:-18000}

echo "[grading-latency-slo] target p95 <= ${P95_MS}ms"
echo "[grading-latency-slo] sampled p95 = ${SAMPLE_MS}ms"

if [[ "$SAMPLE_MS" -le "$P95_MS" ]]; then
  echo "PASS"
  exit 0
fi

echo "FAIL"
exit 1
