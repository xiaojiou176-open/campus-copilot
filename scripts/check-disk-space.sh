#!/usr/bin/env bash
set -euo pipefail

MIN_KB="${1:-524288}"
TARGET_PATH="${2:-/tmp}"

AVAILABLE_KB="$(df -Pk "$TARGET_PATH" | awk 'NR==2 {print $4}')"

if [[ -z "${AVAILABLE_KB:-}" ]]; then
  echo "disk_space_check_failed: unable to determine free space for $TARGET_PATH" >&2
  exit 3
fi

if (( AVAILABLE_KB < MIN_KB )); then
  echo "disk_space_blocked: target=$TARGET_PATH available_kb=$AVAILABLE_KB required_kb=$MIN_KB" >&2
  exit 2
fi

echo "disk_space_ok: target=$TARGET_PATH available_kb=$AVAILABLE_KB required_kb=$MIN_KB"
