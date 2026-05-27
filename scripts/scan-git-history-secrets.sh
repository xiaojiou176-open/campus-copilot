#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v gitleaks >/dev/null 2>&1; then
  echo "gitleaks is required for pre-push secret scanning." >&2
  echo "Install it before pushing, or rely on the CI security workflow." >&2
  exit 1
fi

if ! command -v trufflehog >/dev/null 2>&1; then
  echo "trufflehog is required for pre-push secret scanning." >&2
  echo "Install it before pushing, or rely on the CI security workflow." >&2
  exit 1
fi

gitleaks git "$ROOT_DIR" --no-banner --redact
trufflehog git "file://$ROOT_DIR" --no-update --only-verified
