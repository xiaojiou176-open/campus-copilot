#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$ROOT_DIR/apps/extension/.output/chrome-mv3"
TARGET_DIR="$ROOT_DIR/apps/extension/dist/chrome-mv3"

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "extension_build_export_failed: missing $SOURCE_DIR" >&2
  exit 1
fi

rm -rf "$TARGET_DIR"
mkdir -p "$(dirname "$TARGET_DIR")"
cp -R "$SOURCE_DIR" "$TARGET_DIR"

echo "extension_build_exported:apps/extension/dist/chrome-mv3"
