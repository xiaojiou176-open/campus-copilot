#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
source_svg="$repo_root/docs/assets/social-preview-source.svg"
output_png="$repo_root/docs/assets/social-preview.png"

if ! command -v sips >/dev/null 2>&1; then
  echo "render_social_preview_error:sips_missing" >&2
  exit 1
fi

sips -s format png "$source_svg" --out "$output_png" >/dev/null

width="$(sips -g pixelWidth "$output_png" | awk '/pixelWidth/ {print $2}')"
height="$(sips -g pixelHeight "$output_png" | awk '/pixelHeight/ {print $2}')"
bytes="$(stat -f '%z' "$output_png")"

if [[ "$width" != "1280" || "$height" != "640" ]]; then
  echo "render_social_preview_error:unexpected_dimensions:${width}x${height}" >&2
  exit 1
fi

if (( bytes >= 1048576 )); then
  echo "render_social_preview_error:file_too_large:${bytes}" >&2
  exit 1
fi

echo "render_social_preview_ok:${output_png}:${width}x${height}:${bytes}bytes"
