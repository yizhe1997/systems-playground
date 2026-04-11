#!/usr/bin/env bash
set -euo pipefail

echo "[gold-futures-copilot] backend go tests"
cd projects/gold-futures-copilot/backend
go test ./...

cd ../../..
echo "[gold-futures-copilot] SLO checks"
bash projects/gold-futures-copilot/tests/perf/grading_latency_slo.sh
bash projects/gold-futures-copilot/tests/perf/alert_dispatch_slo.sh
