#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$ROOT/output/local-only-001/render-local"
mkdir -p "$OUT_DIR"

ffmpeg -y \
  -i "$ROOT/assets/scene-001.mp4" \
  -i "$ROOT/assets/scene-002.mp4" \
  -i "$ROOT/assets/scene-003.mp4" \
  -i "$ROOT/assets/scene-004.mp4" \
  -i "$ROOT/assets/scene-005.mp4" \
  -i "$ROOT/output/local-only-001/audio/audio.wav" \
  -filter_complex "\
[0:v]trim=duration=6.058,setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v0];\
[1:v]trim=duration=5.702,setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v1];\
[2:v]trim=duration=5.791,setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v2];\
[3:v]trim=duration=6.326,setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v3];\
[4:v]trim=duration=6.058,setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[v4];\
[v0][v1][v2][v3][v4]concat=n=5:v=1:a=0[v]" \
  -map "[v]" \
  -map 5:a \
  -c:v libx264 \
  -pix_fmt yuv420p \
  -c:a aac \
  -b:a 192k \
  -shortest \
  "$OUT_DIR/video.mp4"
