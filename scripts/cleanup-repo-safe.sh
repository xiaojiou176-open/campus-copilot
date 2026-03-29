#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TARGETS=(
  "apps/extension/node_modules/.vite/vitest"
  "apps/extension/.wxt"
  "apps/extension/test-results"
  "apps/extension/.output"
)

PRESERVED=(
  "apps/extension/dist/chrome-mv3"
  ".agents"
  ".runtime-cache/temp/asset-audit"
)

for target in "${TARGETS[@]}"; do
  if [[ -e "$target" ]]; then
    rm -rf "$target"
    echo "deleted:$target"
  else
    echo "missing:$target"
  fi
done

for preserved in "${PRESERVED[@]}"; do
  if [[ -e "$preserved" ]]; then
    echo "preserved:$preserved"
  else
    echo "preserved_missing:$preserved"
  fi
done

echo "cleanup_repo_safe_done"
