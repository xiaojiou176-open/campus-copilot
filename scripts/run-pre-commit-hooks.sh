#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if command -v pre-commit >/dev/null 2>&1; then
  exec pre-commit run --config .pre-commit-config.yaml --hook-stage pre-commit --all-files
fi

if ! command -v actionlint >/dev/null 2>&1; then
  echo "actionlint is required when pre-commit is unavailable." >&2
  echo "Install actionlint, or install pre-commit and rerun: pnpm hooks:install" >&2
  exit 1
fi

pnpm verify:governance
actionlint .github/workflows/*.yml
