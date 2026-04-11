#!/usr/bin/env bash
set -euo pipefail

echo "[gold-futures-copilot] start dependencies"
docker compose -f projects/gold-futures-copilot/docker-compose.project.yml up --build -d

echo "[gold-futures-copilot] services"
docker compose -f projects/gold-futures-copilot/docker-compose.project.yml ps

echo "[gold-futures-copilot] health checks"
echo "- backend:  http://localhost:8091/healthz"
echo "- frontend: http://localhost:3000"

echo "[gold-futures-copilot] logs"
echo "docker compose -f projects/gold-futures-copilot/docker-compose.project.yml logs -f --tail=100"
