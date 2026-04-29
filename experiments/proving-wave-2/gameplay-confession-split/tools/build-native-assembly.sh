#!/usr/bin/env bash
set -euo pipefail

lane_root="experiments/proving-wave-2/gameplay-confession-split"
assembly_dir="$lane_root/output/final/native-assembly"
scenes_tsv="$lane_root/output/final/local-assembly-v2/scenes.tsv"
gameplay="$lane_root/assets/gameplay/subway.mp4"
audio="$lane_root/output/work/audio/audio.wav"
captions="$lane_root/output/final/captions.ass"
output="$lane_root/output/final/video.mp4"
font="/usr/share/fonts/truetype/lato/Lato-Black.ttf"

rm -rf "$assembly_dir"
mkdir -p "$assembly_dir/top" "$assembly_dir/bottom" "$assembly_dir/composite"

cursor="0"
concat="$assembly_dir/concat.txt"
: > "$concat"

while IFS=$'\t' read -r index top_asset duration; do
  top_out="$assembly_dir/top/$index.mp4"
  bottom_out="$assembly_dir/bottom/$index.mp4"
  composite_out="$assembly_dir/composite/$index.mp4"

  ffmpeg -nostdin -y -hide_banner -loglevel error \
    -i "$top_asset" \
    -t "$duration" \
    -vf "crop=540:960:270:0,scale=1080:960,setsar=1,fps=30" \
    -an -c:v libx264 -preset ultrafast -crf 21 -pix_fmt yuv420p "$top_out"

  ffmpeg -nostdin -y -hide_banner -loglevel error \
    -ss "$cursor" -i "$gameplay" \
    -t "$duration" \
    -vf "crop=540:960:270:0,scale=1080:960,setsar=1,fps=30" \
    -an -c:v libx264 -preset ultrafast -crf 21 -pix_fmt yuv420p "$bottom_out"

  if [[ "$index" == "01" ]]; then
    ffmpeg -nostdin -y -hide_banner -loglevel error \
      -i "$top_out" -i "$bottom_out" \
      -filter_complex "[0:v][1:v]vstack=inputs=2,drawbox=x=0:y=952:w=1080:h=16:color=black@0.55:t=fill,drawbox=x=70:y=92:w=940:h=222:color=black@0.62:t=fill,drawtext=fontfile='$font':text='ROOMMATE FAKED A':x=(w-text_w)/2:y=124:fontsize=64:fontcolor=white:borderw=5:bordercolor=black,drawtext=fontfile='$font':text='SIX-FIGURE JOB':x=(w-text_w)/2:y=204:fontsize=72:fontcolor=yellow:borderw=6:bordercolor=black[v]" \
      -map "[v]" -an -c:v libx264 -preset ultrafast -crf 21 -pix_fmt yuv420p "$composite_out"
  else
    ffmpeg -nostdin -y -hide_banner -loglevel error \
      -i "$top_out" -i "$bottom_out" \
      -filter_complex "[0:v][1:v]vstack=inputs=2,drawbox=x=0:y=952:w=1080:h=16:color=black@0.35:t=fill[v]" \
      -map "[v]" -an -c:v libx264 -preset ultrafast -crf 21 -pix_fmt yuv420p "$composite_out"
  fi

  printf "file '%s'\n" "$(realpath "$composite_out")" >> "$concat"
  cursor="$(awk -v a="$cursor" -v b="$duration" 'BEGIN { printf "%.3f", a + b }')"
done < "$scenes_tsv"

ffmpeg -nostdin -y -hide_banner -loglevel error \
  -f concat -safe 0 -i "$concat" \
  -i "$audio" \
  -vf "subtitles='$captions'" \
  -map 0:v:0 -map 1:a:0 -shortest -r 30 \
  -c:v libx264 -preset ultrafast -crf 21 -pix_fmt yuv420p \
  -c:a aac -b:a 128k "$output"
