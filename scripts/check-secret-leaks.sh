#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

node scripts/check-sensitive-surface.mjs
node scripts/check-sensitive-history.mjs

if command -v gitleaks >/dev/null 2>&1; then
  gitleaks git "$ROOT_DIR" --no-banner --redact
else
  echo "gitleaks not installed; skipped git-history leak scan." >&2
fi

if command -v trufflehog >/dev/null 2>&1; then
  trufflehog git "file://$ROOT_DIR" --no-update --only-verified
else
  echo "trufflehog not installed; skipped verified-history leak scan." >&2
fi

echo "secret_leaks_check_ok"
