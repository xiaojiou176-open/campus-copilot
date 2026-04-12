#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXTENSION_DIR="$ROOT_DIR/apps/extension"

if [[ -z "${EXTENSION_SMOKE_PORT:-}" ]]; then
  EXTENSION_SMOKE_PORT="$(
    node --input-type=module <<'EOF'
import { createServer } from 'node:net';

const server = createServer();
server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 4174;
  process.stdout.write(String(port));
  server.close();
});
EOF
  )"
  echo "extension_smoke_port_selected:${EXTENSION_SMOKE_PORT}"
fi

cd "$EXTENSION_DIR"
if [[ "${EXTENSION_SMOKE_SKIP_BUILD:-0}" != "1" ]]; then
  EXTENSION_SMOKE_PORT="${EXTENSION_SMOKE_PORT}" pnpm build
fi
EXTENSION_SMOKE_PORT="${EXTENSION_SMOKE_PORT}" pnpm exec playwright test
