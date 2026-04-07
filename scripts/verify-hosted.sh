#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

bash scripts/verify.sh

EXTENSION_SMOKE_SKIP_BUILD=1 bash scripts/run-extension-smoke.sh
