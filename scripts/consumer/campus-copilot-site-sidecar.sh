#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "usage: $0 <canvas|gradescope|edstem|myuw> [args...]" >&2
  exit 64
fi

SITE="$1"
shift

case "$SITE" in
  canvas|gradescope|edstem|myuw)
    ;;
  *)
    echo "unsupported site: $SITE" >&2
    exit 64
    ;;
esac

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

exec pnpm --filter @campus-copilot/mcp-readonly "start:$SITE" "$@"
