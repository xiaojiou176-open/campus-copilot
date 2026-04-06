#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

chmod +x \
  .githooks/pre-commit \
  .githooks/pre-push \
  scripts/install-hooks.sh \
  scripts/run-pre-commit-hooks.sh \
  scripts/run-pre-push-hooks.sh \
  scripts/scan-git-history-secrets.sh

git config core.hooksPath .githooks

if command -v pre-commit >/dev/null 2>&1; then
  pre-commit install-hooks --config .pre-commit-config.yaml
else
  echo "pre-commit not found; repo-local .githooks are installed, but managed hook environments were not pre-warmed." >&2
  echo "Optional: install pre-commit and rerun 'pnpm hooks:install' to prefetch hook environments." >&2
fi

echo "hooks_installed:core.hooksPath=.githooks"
