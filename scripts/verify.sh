#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

bash scripts/check-disk-space.sh 196608 /tmp

pnpm verify:governance
pnpm typecheck
pnpm test
pnpm smoke:api
pnpm --filter @campus-copilot/extension build

EXTENSION_SMOKE_PORT="${EXTENSION_SMOKE_PORT:-4174}"
if lsof -nP -iTCP:"${EXTENSION_SMOKE_PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  EXTENSION_SMOKE_PORT="$(
    node --input-type=module <<'EOF'
import { createServer } from 'node:net';

const server = createServer();
server.listen(0, '127.0.0.1', () => {
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : undefined;
  process.stdout.write(String(port ?? '4174'));
  server.close();
});
EOF
  )"
  echo "verify_playwright_port_remapped:${EXTENSION_SMOKE_PORT}"
fi

EXTENSION_SMOKE_PORT="${EXTENSION_SMOKE_PORT}" pnpm --filter @campus-copilot/extension exec playwright test
