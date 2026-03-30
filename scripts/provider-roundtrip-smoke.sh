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

PORT="${PROVIDER_SMOKE_PORT:-8793}"
HOST="127.0.0.1"
BFF_URL="http://${HOST}:${PORT}"
RESPONSE_FILE="$(mktemp -t campus-copilot-provider-roundtrip.XXXXXX)"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi
  rm -f "$RESPONSE_FILE"
}

trap cleanup EXIT

if [[ -n "${OPENAI_API_KEY:-}" ]]; then
  PROVIDER="openai"
  MODEL="${OPENAI_MODEL:-gpt-4.1-mini}"
elif [[ -n "${GEMINI_API_KEY:-}" ]]; then
  PROVIDER="gemini"
  MODEL="${GEMINI_MODEL:-gemini-2.5-flash}"
else
  printf '{\n  "status": "blocked",\n  "reason": "missing_provider_api_key"\n}\n' >&2
  exit 2
fi

PORT="$PORT" pnpm start:api >/tmp/campus-copilot-provider-roundtrip.log 2>&1 &
SERVER_PID=$!

for _ in {1..30}; do
  if curl -fsS "${BFF_URL}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

curl -fsS \
  -H 'content-type: application/json' \
  -X POST \
  "${BFF_URL}/api/providers/${PROVIDER}/chat" \
  -d "{
    \"provider\": \"${PROVIDER}\",
    \"model\": \"${MODEL}\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Reply with the single word READY.\"}]
  }" >"$RESPONSE_FILE"

node --input-type=module <<EOF
import { readFileSync } from 'node:fs';

const payload = JSON.parse(readFileSync('${RESPONSE_FILE}', 'utf8'));
const answerText = typeof payload.answerText === 'string' ? payload.answerText.trim() : '';

if (!payload.ok) {
  console.error(JSON.stringify({
    status: 'failed',
    provider: '${PROVIDER}',
    model: '${MODEL}',
    reason: payload.error ?? 'provider_upstream_error',
    response: payload,
  }, null, 2));
  process.exit(1);
}

if (!answerText.toUpperCase().includes('READY')) {
  console.error(JSON.stringify({
    status: 'failed',
    provider: '${PROVIDER}',
    model: '${MODEL}',
    reason: 'answer_text_missing_ready',
    response: payload,
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'ok',
  provider: '${PROVIDER}',
  model: '${MODEL}',
  answerText,
  forwardedStatus: payload.forwardedStatus,
}, null, 2));
EOF
