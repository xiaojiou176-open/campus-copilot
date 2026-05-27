#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

bash scripts/check-disk-space.sh 196608 /tmp

pnpm verify:governance
pnpm typecheck
pnpm test
pnpm smoke:api
pnpm --filter @campus-copilot/web build
pnpm --filter @campus-copilot/extension build
