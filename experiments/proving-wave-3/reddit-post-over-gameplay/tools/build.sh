#!/usr/bin/env bash
set -euo pipefail

ROOT="experiments/proving-wave-3/reddit-post-over-gameplay"
CHUNKS="$ROOT/outputs/gameplay-cuts"
DURATION="58.069"
CHUNK="2.75"
COUNT="22"

mkdir -p "$ROOT/assets/reddit" "$ROOT/outputs/render" "$ROOT/outputs/final" "$CHUNKS"

node --import tsx scripts/harness/reddit-story-assets.ts \
  < "$ROOT/requests/reddit-card.request.json" \
  > "$ROOT/outputs/render/reddit-card.stdout.json"

rm -rf "$CHUNKS"
mkdir -p "$CHUNKS"
: > "$CHUNKS/concat.txt"

for i in $(seq 0 $((COUNT - 1))); do
  offset="$(
    awk -v i="$i" 'BEGIN {
      vals[0]=0; vals[1]=14; vals[2]=28; vals[3]=42;
      vals[4]=7; vals[5]=21; vals[6]=35; vals[7]=49;
      vals[8]=3.5; vals[9]=17.5; vals[10]=31.5; vals[11]=45.5;
      printf "%.3f", vals[i % 12]
    }'
  )"
  dur="$CHUNK"
  if [ "$i" -eq $((COUNT - 1)) ]; then
    dur="0.319"
  fi
  out="$CHUNKS/chunk-$(printf '%02d' "$i").mp4"
  ffmpeg -y -ss "$offset" -i "$ROOT/assets/gameplay.mp4" -t "$dur" \
    -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1" \
    -an -r 30 -c:v libx264 -crf 20 -preset veryfast -pix_fmt yuv420p "$out" >/dev/null 2>&1
  printf "file '%s'\n" "$(pwd)/$out" >> "$CHUNKS/concat.txt"
done

ffmpeg -y -f concat -safe 0 -i "$CHUNKS/concat.txt" \
  -an -c:v libx264 -crf 20 -preset veryfast -pix_fmt yuv420p \
  "$ROOT/outputs/render/gameplay-jumpcuts.mp4" >/dev/null 2>&1

node --import tsx scripts/harness/caption-export.ts <<JSON \
  > "$ROOT/outputs/render/caption-export.stdout.json"
{
  "timestampsPath": "$ROOT/timestamps.json",
  "captionExportPath": "$ROOT/outputs/render/captions.remotion.json",
  "captionSrtPath": "$ROOT/outputs/render/captions.srt",
  "captionAssPath": "$ROOT/outputs/render/captions.ass",
  "captionPreset": "capcut",
  "captionMode": "page",
  "captionTimingOffsetMs": -550,
  "captionAssStyle": {
    "karaoke": true,
    "fontName": "Arial",
    "fontSize": 58,
    "primaryColor": "&H00FFFFFF",
    "secondaryColor": "&H00D8D8D8",
    "outlineColor": "&H00000000",
    "backColor": "&H8C000000",
    "alignment": 5,
    "positionX": 540,
    "positionY": 1260,
    "maxCharsPerLine": 24,
    "maxLines": 2
  }
}
JSON

node --import tsx scripts/harness/caption-export.ts <<JSON \
  > "$ROOT/outputs/render/caption-export-review.stdout.json"
{
  "timestampsPath": "$ROOT/timestamps.json",
  "captionExportPath": "$ROOT/outputs/render/captions.review.remotion.json",
  "captionSrtPath": "$ROOT/outputs/render/captions.review.srt",
  "captionAssPath": "$ROOT/outputs/render/captions.review.ass",
  "captionPreset": "capcut",
  "captionMode": "page"
}
JSON

ffmpeg -y \
  -i "$ROOT/outputs/render/gameplay-jumpcuts.mp4" \
  -loop 1 -i "$ROOT/assets/reddit/opener.png" \
  -t "$DURATION" \
  -filter_complex "[1:v]scale=940:-1,format=rgba,fade=t=out:st=4.75:d=0.35:alpha=1[card];[0:v][card]overlay=(W-w)/2:210:enable='between(t,0,5.15)'[v]" \
  -map "[v]" -an -r 30 -c:v libx264 -crf 20 -preset veryfast -pix_fmt yuv420p \
  "$ROOT/outputs/render/base-no-captions.mp4" >/dev/null 2>&1

ffmpeg -y \
  -i "$ROOT/outputs/render/base-no-captions.mp4" \
  -i "$ROOT/audio.wav" \
  -vf "ass=$ROOT/outputs/render/captions.ass" \
  -af "volume=0.93" \
  -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -crf 20 -preset veryfast -pix_fmt yuv420p \
  -c:a aac -b:a 160k -shortest \
  "$ROOT/outputs/final/video.mp4" >/dev/null 2>&1

ffmpeg -y -i "$ROOT/outputs/final/video.mp4" \
  -vf "scale=540:960" \
  -c:v libx264 -crf 30 -preset veryfast -c:a aac -b:a 96k \
  docs/demo/demo-9-reddit-post-over-gameplay.mp4 >/dev/null 2>&1

rm -rf "$ROOT/outputs/final/publish-prep"
node --import tsx scripts/harness/publish-prep.ts <<JSON \
  > "$ROOT/outputs/final/publish-prep.stdout.json"
{
  "videoPath": "$ROOT/outputs/final/video.mp4",
  "scriptPath": "$ROOT/script.json",
  "outputDir": "$ROOT/outputs/final/publish-prep",
  "platform": "tiktok",
  "captionExportPath": "$ROOT/outputs/render/captions.review.remotion.json"
}
JSON

ffmpeg -y -i "$ROOT/outputs/final/video.mp4" \
  -vf "fps=1/8,scale=270:480,tile=4x2" \
  -frames:v 1 "$ROOT/outputs/final/contact-sheet.jpg" >/dev/null 2>&1
