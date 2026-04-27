#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ASSET_DIR="$ROOT/assets"
FONT_BOLD="/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_REGULAR="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

mkdir -p "$ASSET_DIR"

make_clip() {
  local output="$1"
  local color="$2"
  local title="$3"
  local subtitle="$4"

  ffmpeg -y \
    -f lavfi -i "color=c=${color}:s=1080x1920:d=7:r=30" \
    -vf "drawbox=x='mod(t*120,1400)-220':y=180:w=300:h=300:color=white@0.10:t=fill,drawbox=x='w-mod(t*150,1500)':y=1220:w=360:h=360:color=black@0.12:t=fill,drawtext=fontfile='${FONT_BOLD}':text='${title}':fontcolor=white:fontsize=84:x=(w-text_w)/2:y=350,drawtext=fontfile='${FONT_REGULAR}':text='${subtitle}':fontcolor=white@0.92:fontsize=42:x=(w-text_w)/2:y=485" \
    -c:v libx264 -pix_fmt yuv420p -preset veryfast -crf 23 -movflags +faststart \
    "$output"
}

make_clip "$ASSET_DIR/scene-001.mp4" "#1f5eff" "STOP REUSING" "One weak password should not unlock every app"
make_clip "$ASSET_DIR/scene-002.mp4" "#0b8f6a" "UNIQUE LOGINS" "Generate long random passwords for each site"
make_clip "$ASSET_DIR/scene-003.mp4" "#7b3fe4" "ENCRYPTED VAULT" "Your vault stays locked behind one master key"
make_clip "$ASSET_DIR/scene-004.mp4" "#c96a12" "AUTO FILL" "Security works better when safe is also fast"
make_clip "$ASSET_DIR/scene-005.mp4" "#b22f46" "ADD 2FA" "Protect the master password and the whole system"
