#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

bash scripts/check-disk-space.sh 131072 /tmp >/dev/null

PORT="${API_SMOKE_PORT:-8792}"
HOST="127.0.0.1"
HEALTH_URL="http://${HOST}:${PORT}/health"
STATUS_URL="http://${HOST}:${PORT}/api/providers/status"
LOG_FILE="$(mktemp -t campus-copilot-api-log.XXXXXX)"
RESPONSE_FILE="$(mktemp -t campus-copilot-api-response.XXXXXX)"
STATUS_FILE="$(mktemp -t campus-copilot-api-status.XXXXXX)"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi
  rm -f "$LOG_FILE" "$RESPONSE_FILE" "$STATUS_FILE"
}

trap cleanup EXIT

PORT="$PORT" pnpm start:api >"$LOG_FILE" 2>&1 &
SERVER_PID=$!

for _ in {1..30}; do
  if curl -fsS "$HEALTH_URL" >"$RESPONSE_FILE" 2>/dev/null && curl -fsS "$STATUS_URL" >"$STATUS_FILE" 2>/dev/null; then
    printf '{\n  "health": %s,\n  "providerStatus": %s\n}\n' \
      "$(cat "$RESPONSE_FILE")" \
      "$(cat "$STATUS_FILE")"
    exit 0
  fi
  sleep 0.5
done

echo "API health check failed. Recent server log:" >&2
cat "$LOG_FILE" >&2 || true
exit 1
