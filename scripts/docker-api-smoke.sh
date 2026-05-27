#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

pick_port() {
  python3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
}

PORT="${CAMPUS_COPILOT_DOCKER_API_PORT:-$(pick_port)}"
PROJECT_NAME="campus-copilot-smoke-$$"
HEALTH_URL="http://127.0.0.1:${PORT}/health"
STATUS_URL="http://127.0.0.1:${PORT}/api/providers/status"

cleanup() {
  CAMPUS_COPILOT_DOCKER_API_PORT="$PORT" docker compose -f compose.yaml -p "$PROJECT_NAME" down --remove-orphans >/dev/null 2>&1 || true
}

trap cleanup EXIT

# Canonical compose path: docker compose -f compose.yaml up -d --build campus-copilot-api
CAMPUS_COPILOT_DOCKER_API_PORT="$PORT" docker compose -f compose.yaml -p "$PROJECT_NAME" up -d --build campus-copilot-api

for _ in $(seq 1 30); do
  if curl -fsS "$HEALTH_URL" >/dev/null; then
    break
  fi
  sleep 1
done

health_payload="$(curl -fsS "$HEALTH_URL")"
status_payload="$(curl -fsS "$STATUS_URL")"

printf '%s\n' "$health_payload" | jq -e '.ok == true' >/dev/null
printf '%s\n' "$status_payload" | jq -e '.ok == true and (.providers | type == "object")' >/dev/null

printf 'docker_api_smoke_ok\n'
