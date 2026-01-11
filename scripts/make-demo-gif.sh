#!/usr/bin/env bash
set -euo pipefail

in="${1:-}"
out="${2:-}"
start="${3:-0}"
duration="${4:-8}"

fps="${DEMO_GIF_FPS:-12}"
width="${DEMO_GIF_WIDTH:-540}"

if [[ -z "$in" || -z "$out" ]]; then
  echo "Usage: $0 <input.mp4> <output.gif> [startSeconds] [durationSeconds]" >&2
  exit 2
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required. Install it and re-run." >&2
  exit 2
fi

mkdir -p "$(dirname "$out")"

# Make a small, README-friendly preview (palette-based for size/quality).
palette="$(mktemp -t cm-demo-palette-XXXXXX.png)"
trap 'rm -f "$palette"' EXIT

ffmpeg -y -ss "$start" -t "$duration" -i "$in" \
  -an -sn -vf "fps=${fps},scale=${width}:-2:flags=lanczos,palettegen=stats_mode=single" \
  -frames:v 1 "$palette" >/dev/null 2>&1

ffmpeg -y -ss "$start" -t "$duration" -i "$in" -i "$palette" \
  -lavfi "fps=${fps},scale=${width}:-2:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3" \
  "$out" >/dev/null 2>&1
