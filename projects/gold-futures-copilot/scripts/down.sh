#!/usr/bin/env bash
set -euo pipefail

echo "[gold-futures-copilot] stopping project stack"
docker compose -f projects/gold-futures-copilot/docker-compose.project.yml down -v --remove-orphans

echo "[gold-futures-copilot] stack stopped"
