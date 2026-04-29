#!/usr/bin/env bash
set -euo pipefail

ROOT="experiments/proving-wave-2/reddit-story"
ABS_ROOT="$(cd "$ROOT" && pwd)"
GAMEPLAY_SOURCE="$ABS_ROOT/assets/gameplay-bottom.mp4"
TOP_SOURCE_DIR="$ABS_ROOT/assets/top-source"
SEGMENTS_DIR="$ABS_ROOT/outputs/segments"
COMPOSITES_DIR="$ABS_ROOT/outputs/composites"
RENDER_DIR="$ABS_ROOT/outputs/render"
FINAL_DIR="$ABS_ROOT/outputs/final"

mkdir -p "$ABS_ROOT/assets/reddit" "$SEGMENTS_DIR" "$COMPOSITES_DIR" "$RENDER_DIR" "$FINAL_DIR"

node --import tsx scripts/harness/reddit-story-assets.ts < "$ABS_ROOT/requests/reddit-story-assets.request.json" > "$RENDER_DIR/reddit-story-assets.stdout.json"

ffmpeg -y \
  -loop 1 \
  -i "$ABS_ROOT/assets/reddit/opener.png" \
  -t 5.2 \
  -vf "scale=1080:864:force_original_aspect_ratio=decrease,pad=1080:960:(ow-iw)/2:(oh-ih)/2:color=#EEF2F5" \
  -r 30 \
  -c:v libx264 \
  -pix_fmt yuv420p \
  "$SEGMENTS_DIR/seg-00-opener.mp4" >/dev/null 2>&1

find "$TOP_SOURCE_DIR" -maxdepth 1 -name 'seg-*.mp4' ! -name 'seg-00-opener.mp4' -exec cp {} "$SEGMENTS_DIR"/ \;

ffmpeg -y \
  -f lavfi \
  -i "color=c=black:s=1080x1920:d=0.1:r=30" \
  -c:v libx264 \
  -pix_fmt yuv420p \
  "$COMPOSITES_DIR/flash.mp4" >/dev/null 2>&1

offset="0"
index="0"
rm -f "$COMPOSITES_DIR"/concat.txt

for top in "$SEGMENTS_DIR"/seg-*.mp4; do
  base="$(basename "$top")"
  name="${base%.mp4}"
  duration="$(ffprobe -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 "$top")"
  bottom="$COMPOSITES_DIR/${name}-bottom.mp4"
  composite="$COMPOSITES_DIR/${name}.mp4"

  ffmpeg -y \
    -ss "$offset" \
    -i "$GAMEPLAY_SOURCE" \
    -t "$duration" \
    -an \
    -vf "scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960" \
    -r 30 \
    -c:v libx264 \
    -pix_fmt yuv420p \
    "$bottom" >/dev/null 2>&1

  ffmpeg -y \
    -i "$top" \
    -i "$bottom" \
    -filter_complex "[0:v][1:v]vstack=inputs=2[v]" \
    -map "[v]" \
    -an \
    -r 30 \
    -c:v libx264 \
    -pix_fmt yuv420p \
    "$composite" >/dev/null 2>&1

  printf "file '%s'\n" "$composite" >> "$COMPOSITES_DIR/concat.txt"

  index=$((index + 1))
  if [ "$index" -lt "$(find "$SEGMENTS_DIR" -maxdepth 1 -name 'seg-*.mp4' | wc -l)" ]; then
    printf "file '%s'\n" "$COMPOSITES_DIR/flash.mp4" >> "$COMPOSITES_DIR/concat.txt"
  fi

  offset="$(awk "BEGIN { printf \"%.6f\", $offset + $duration }")"
done

ffmpeg -y \
  -f concat \
  -safe 0 \
  -i "$COMPOSITES_DIR/concat.txt" \
  -an \
  -c:v libx264 \
  -pix_fmt yuv420p \
  "$RENDER_DIR/base-no-captions.mp4" >/dev/null 2>&1

node --import tsx scripts/harness/caption-export.ts < "$ABS_ROOT/requests/caption-export.request.json" > "$RENDER_DIR/caption-export.stdout.json"

ffmpeg -y \
  -i "$RENDER_DIR/base-no-captions.mp4" \
  -i "$ABS_ROOT/inputs/audio.wav" \
  -vf "ass=$RENDER_DIR/captions.ass" \
  -map 0:v:0 \
  -map 1:a:0 \
  -c:v libx264 \
  -pix_fmt yuv420p \
  -c:a aac \
  -shortest \
  "$FINAL_DIR/video.mp4" >/dev/null 2>&1

cat > "$FINAL_DIR/publish-prep.request.json" <<JSON
{
  "videoPath": "experiments/proving-wave-2/reddit-story/outputs/final/video.mp4",
  "scriptPath": "experiments/proving-wave-2/reddit-story/inputs/script.json",
  "outputDir": "experiments/proving-wave-2/reddit-story/outputs/final/publish-prep",
  "platform": "tiktok",
  "captionExportPath": "experiments/proving-wave-2/reddit-story/outputs/render/captions.remotion.json"
}
JSON

node --import tsx scripts/harness/publish-prep.ts < "$FINAL_DIR/publish-prep.request.json" > "$FINAL_DIR/publish-prep.stdout.json"
