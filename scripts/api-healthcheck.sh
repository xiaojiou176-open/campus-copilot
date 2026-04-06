#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TEMP_DIR="$ROOT_DIR/.runtime-cache/temp"
mkdir -p "$TEMP_DIR"

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
LOG_FILE="$(mktemp "$TEMP_DIR/api-log.XXXXXX")"
RESPONSE_FILE="$(mktemp "$TEMP_DIR/api-response.XXXXXX")"
STATUS_FILE="$(mktemp "$TEMP_DIR/api-status.XXXXXX")"
STARTED_SERVER=0
SERVER_PID=""

cleanup() {
  if [[ "${STARTED_SERVER:-0}" == "1" && -n "${SERVER_PID:-}" ]]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi
  rm -f "$LOG_FILE" "$RESPONSE_FILE" "$STATUS_FILE"
}

trap cleanup EXIT

is_healthy() {
  curl -fsS "$HEALTH_URL" >"$RESPONSE_FILE" 2>/dev/null && curl -fsS "$STATUS_URL" >"$STATUS_FILE" 2>/dev/null
}

pick_fallback_port() {
  python3 - <<'PY'
import socket
s = socket.socket()
s.bind(("127.0.0.1", 0))
print(s.getsockname()[1])
s.close()
PY
}

start_server() {
  : >"$LOG_FILE"
  PORT="$PORT" pnpm start:api >"$LOG_FILE" 2>&1 &
  SERVER_PID=$!
  STARTED_SERVER=1
}

stop_server() {
  if [[ "${STARTED_SERVER:-0}" == "1" && -n "${SERVER_PID:-}" ]]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi
  SERVER_PID=""
  STARTED_SERVER=0
}

if is_healthy; then
  printf '{\n  "health": %s,\n  "providerStatus": %s\n}\n' \
    "$(cat "$RESPONSE_FILE")" \
    "$(cat "$STATUS_FILE")"
  exit 0
fi

for _attempt in 1 2 3; do
  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    PORT="$(pick_fallback_port)"
    HEALTH_URL="http://${HOST}:${PORT}/health"
    STATUS_URL="http://${HOST}:${PORT}/api/providers/status"
  fi

  start_server

  for _ in {1..30}; do
    if is_healthy; then
      printf '{\n  "health": %s,\n  "providerStatus": %s\n}\n' \
        "$(cat "$RESPONSE_FILE")" \
        "$(cat "$STATUS_FILE")"
      exit 0
    fi
    sleep 0.5
  done

  if grep -q 'EADDRINUSE' "$LOG_FILE"; then
    stop_server
    PORT="$(pick_fallback_port)"
    HEALTH_URL="http://${HOST}:${PORT}/health"
    STATUS_URL="http://${HOST}:${PORT}/api/providers/status"
    continue
  fi

  break
done

echo "API health check failed. Recent server log:" >&2
cat "$LOG_FILE" >&2 || true
exit 1
