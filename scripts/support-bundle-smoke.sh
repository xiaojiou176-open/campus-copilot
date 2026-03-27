#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

RAW_OUTPUT_FILE="$(mktemp -t campus-copilot-support-bundle-smoke.XXXXXX)"
trap 'rm -f "$RAW_OUTPUT_FILE"' EXIT

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

print(json.dumps({
    "status": "ok",
    "outputPath": str(path),
    "head": payload["summary"]["head"],
    "branch": payload["summary"]["branch"],
    "diagnoseStatus": payload["summary"]["diagnoseStatus"],
}, indent=2))
PY
