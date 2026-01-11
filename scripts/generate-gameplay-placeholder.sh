#!/usr/bin/env bash
set -euo pipefail

# Generates a non-copyrighted, gameplay-like vertical clip you can use for demos.
# This is intentionally synthetic (no ripped footage).

usage() {
  cat <<'EOF' >&2
Usage:
  ./scripts/generate-gameplay-placeholder.sh [--out <path>] [--duration <seconds>] [--fps <fps>]

Defaults:
  --out      ~/.cm/assets/gameplay/subway-surfers/subway-placeholder.mp4
  --duration 20
  --fps      30
EOF
}

out="${HOME}/.cm/assets/gameplay/subway-surfers/subway-placeholder.mp4"
duration="20"
fps="30"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out) out="${2:-}"; shift 2;;
    --duration) duration="${2:-}"; shift 2;;
    --fps) fps="${2:-}"; shift 2;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown arg: $1" >&2; usage; exit 2;;
  esac
done

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required." >&2
  exit 2
fi

mkdir -p "$(dirname "$out")"

# 1080x1920 runner-style clip with moving "coins" and "obstacles".
# drawbox supports time-based expressions, so we can animate without external assets.
ffmpeg -y \
  -f lavfi -i "color=c=#0b0f19:s=1080x1920:r=${fps}:d=${duration}" \
  -vf "\
drawbox=x=0:y=0:w=iw:h=ih:color=#111827@1:t=fill,\
drawbox=x=60:y=260:w=960:h=1500:color=#0f172a@1:t=fill,\
drawbox=x=350:y=260:w=20:h=1500:color=#1f2937@1:t=fill,\
drawbox=x=710:y=260:w=20:h=1500:color=#1f2937@1:t=fill,\
drawbox=x=120:y=mod(t*900\,1500)+260:w=60:h=60:color=#fbbf24@0.95:t=fill,\
drawbox=x=500:y=mod(t*900+500\,1500)+260:w=60:h=60:color=#fbbf24@0.95:t=fill,\
drawbox=x=860:y=mod(t*900+900\,1500)+260:w=60:h=60:color=#fbbf24@0.95:t=fill,\
drawbox=x=160:y=mod(t*700+300\,1500)+260:w=120:h=120:color=#ef4444@0.9:t=fill,\
drawbox=x=520:y=mod(t*700+900\,1500)+260:w=120:h=120:color=#ef4444@0.9:t=fill,\
drawbox=x=880:y=mod(t*700+1200\,1500)+260:w=120:h=120:color=#ef4444@0.9:t=fill,\
drawtext=fontcolor=#e5e7eb:fontsize=52:text='GAMEPLAY PLACEHOLDER':x=(w-text_w)/2:y=90:box=1:boxcolor=#00000088:boxborderw=18,\
drawtext=fontcolor=#94a3b8:fontsize=30:text='Use your own licensed gameplay in ~/.cm/assets/gameplay/<style>/':x=(w-text_w)/2:y=160:box=1:boxcolor=#00000066:boxborderw=14,\
drawtext=fontcolor=#e5e7eb:fontsize=40:text='Score\: %{eif\\:mod(t*120\\,999)\\:d}':x=80:y=230,\
format=yuv420p" \
  -c:v libx264 -pix_fmt yuv420p -preset veryfast -crf 20 -an -movflags +faststart \
  "$out"

echo "Wrote: $out"

