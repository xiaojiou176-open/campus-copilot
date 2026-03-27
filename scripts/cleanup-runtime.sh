#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

find /tmp -maxdepth 1 -name 'campus-copilot-*' -exec rm -rf {} + 2>/dev/null || true
rm -rf apps/extension/.output apps/extension/.wxt apps/extension/test-results playwright-report test-results .pnpm-store 2>/dev/null || true
find . -name '.DS_Store' -delete 2>/dev/null || true

if [[ -d .runtime-cache ]]; then
  find .runtime-cache -maxdepth 1 -type f \( -name '*.ts' -o -name '*-debug.*' -o -name '*-probe.*' \) -delete 2>/dev/null || true

  python3 - <<'PY'
from pathlib import Path

root = Path(".runtime-cache")
support_bundles = sorted(root.glob("campus-copilot-support-bundle-*.json"))
for stale in support_bundles[:-1]:
    stale.unlink(missing_ok=True)
PY
fi

echo "runtime_cleanup_done"
