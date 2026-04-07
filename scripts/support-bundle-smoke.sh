#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

TEMP_DIR="$ROOT_DIR/.runtime-cache/temp"
mkdir -p "$TEMP_DIR"

# This smoke harness pins the canonical local live profile so that
# support-bundle generation can exercise the explicit-profile contract
# without requiring the caller to export the vars manually every time.
# Keep attach mode pinned to the explicit page lane because the repo-owned
# browser context can surface stronger current-page truth than stale CDP target
# summaries when SSO redirect tabs linger in the same profile.
# Use a support-bundle-specific override key instead of inheriting ambient
# `CHROME_ATTACH_MODE`, which may still point at weaker diagnostic lanes.
: "${CAMPUS_COPILOT_BROWSER_ROOT:=$HOME/.cache/campus-copilot/browser/chrome-user-data}"
: "${CHROME_USER_DATA_DIR:=$CAMPUS_COPILOT_BROWSER_ROOT}"
: "${CHROME_PROFILE_NAME:=Profile 1}"
: "${CAMPUS_COPILOT_BROWSER_CDP_PORT:=9334}"
: "${CHROME_CDP_URL:=http://127.0.0.1:$CAMPUS_COPILOT_BROWSER_CDP_PORT}"
: "${SUPPORT_BUNDLE_ATTACH_MODE:=page}"
CHROME_ATTACH_MODE="$SUPPORT_BUNDLE_ATTACH_MODE"
export CAMPUS_COPILOT_BROWSER_ROOT CAMPUS_COPILOT_BROWSER_CDP_PORT
export CHROME_USER_DATA_DIR CHROME_PROFILE_NAME CHROME_CDP_URL CHROME_ATTACH_MODE SUPPORT_BUNDLE_ATTACH_MODE

RAW_OUTPUT_FILE="$(mktemp "$TEMP_DIR/support-bundle-smoke.XXXXXX")"
trap 'rm -f "$RAW_OUTPUT_FILE"' EXIT

# `support:bundle` only needs the aggregated coverage summary, so reuse the latest
# successful coverage lane when it already exists instead of re-running a flaky temp-dir write.
if [ ! -f ".runtime-cache/coverage/coverage-summary.json" ]; then
  pnpm test:coverage >/dev/null
fi
pnpm support:bundle >"$RAW_OUTPUT_FILE"
OUTPUT_PATH="$(python3 - "$RAW_OUTPUT_FILE" <<'PY'
import json,sys,pathlib
raw=pathlib.Path(sys.argv[1]).read_text()
start=raw.find('{')
if start == -1:
    raise SystemExit("support_bundle_output_missing_json")
payload=json.loads(raw[start:])
print(payload["outputPath"])
PY
)"

python3 - <<PY
import json, pathlib
path = pathlib.Path(r"""$OUTPUT_PATH""")
payload = json.loads(path.read_text())

assert payload["summary"]["head"], "missing summary.head"
assert payload["summary"]["branch"], "missing summary.branch"
assert "diagnose" in payload, "missing diagnose block"
assert "git" in payload, "missing git block"
assert "runtime" in payload, "missing runtime block"
assert payload.get("readableSummary"), "missing readableSummary"
assert "coverage" in payload, "missing coverage block"
assert payload["coverage"]["outputPath"], "missing coverage.outputPath"
assert payload["coverage"]["total"], "missing coverage.total"
assert payload["coverage"]["testPyramid"], "missing coverage.testPyramid"
assert payload["summary"]["requestedProfileLabel"] == "Profile 1", "missing requested profile label"
assert payload["summary"]["profileConfirmationStatus"], "missing profile confirmation status"

print(json.dumps({
    "status": "ok",
    "outputPath": str(path),
    "head": payload["summary"]["head"],
    "branch": payload["summary"]["branch"],
    "diagnoseStatus": payload["summary"]["diagnoseStatus"],
    "readableSummary": payload["readableSummary"],
    "coverageIncluded": True,
}, indent=2))
PY
