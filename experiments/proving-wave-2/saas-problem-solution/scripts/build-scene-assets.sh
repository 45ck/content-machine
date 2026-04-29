#!/usr/bin/env bash
set -euo pipefail

ROOT="/home/calvin/Documents/GitHub/content-machine"
LANE="$ROOT/experiments/proving-wave-2/saas-problem-solution"
RUN_DIR="$LANE/output/run-001"
TIMESTAMPS="$RUN_DIR/audio/timestamps.json"
MANIFEST="$LANE/assets/scene-manifest.json"
SCENE_DIR="$RUN_DIR/scenes"
VISUALS_DIR="$RUN_DIR/visuals"

export TIMESTAMPS
export MANIFEST
TMP_DIR="$RUN_DIR/.tmp-scene-build"
CARD_PNG_DIR="$RUN_DIR/card-png"

mkdir -p "$SCENE_DIR" "$VISUALS_DIR" "$TMP_DIR" "$CARD_PNG_DIR"

if [[ ! -f "$TIMESTAMPS" ]]; then
  echo "Missing timestamps: $TIMESTAMPS" >&2
  exit 1
fi

for svg in "$LANE"/assets/cards/*.svg; do
  png="$CARD_PNG_DIR/$(basename "${svg%.svg}").png"
  ffmpeg -y -loglevel error -i "$svg" -frames:v 1 "$png"
done

TIMESTAMPS="$TIMESTAMPS" MANIFEST="$MANIFEST" LANE="$LANE" SCENE_DIR="$SCENE_DIR" TMP_DIR="$TMP_DIR" CARD_PNG_DIR="$CARD_PNG_DIR" node --input-type=module <<'EOF'
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const lane = resolve(process.env.LANE);
const timestamps = JSON.parse(readFileSync(process.env.TIMESTAMPS, 'utf8'));
const manifest = JSON.parse(readFileSync(process.env.MANIFEST, 'utf8'));
const sceneDir = resolve(process.env.SCENE_DIR);
const tmpDir = resolve(process.env.TMP_DIR);
const cardPngDir = resolve(process.env.CARD_PNG_DIR);

mkdirSync(sceneDir, { recursive: true });
mkdirSync(tmpDir, { recursive: true });

const trimStarts = [0.2, 1.4, 2.1, 0.8, 1.6, 3.0, 1.1, 0.4, 1.8, 2.4];

for (const scene of timestamps.scenes) {
  const plan = manifest[scene.sceneId];
  if (!plan) {
    throw new Error(`No manifest plan for ${scene.sceneId}`);
  }
  const duration = Number((scene.audioEnd - scene.audioStart).toFixed(3));
  const segmentCount = Math.max(plan.cards.length, 1);
  const baseDuration = duration / segmentCount;
  const segmentDurations = Array.from({ length: segmentCount }, () => Number(baseDuration.toFixed(3)));
  const currentTotal = segmentDurations.reduce((sum, value) => sum + value, 0);
  segmentDurations[segmentDurations.length - 1] = Number(
    (segmentDurations[segmentDurations.length - 1] + (duration - currentTotal)).toFixed(3)
  );

  const segmentPaths = [];

  for (let index = 0; index < segmentCount; index += 1) {
    const cardName = plan.cards[index];
    const clipRel = plan.clips[index % plan.clips.length];
    const cardPath = resolve(cardPngDir, `${cardName}.png`);
    const clipPath = resolve(lane, 'assets', clipRel);
    const segmentPath = resolve(tmpDir, `${scene.sceneId}-${String(index + 1).padStart(2, '0')}.mp4`);
    const trimStart = trimStarts[index % trimStarts.length];
    const segmentDuration = segmentDurations[index];

    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-loglevel',
        'error',
        '-ss',
        String(trimStart),
        '-i',
        clipPath,
        '-loop',
        '1',
        '-i',
        cardPath,
        '-filter_complex',
        `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,fps=30,eq=saturation=1.06:contrast=1.04:brightness=-0.02,trim=duration=${segmentDuration},setpts=PTS-STARTPTS[bg];[1:v]format=rgba,scale=1080:1920[ov];[bg][ov]overlay=0:0:format=auto,format=yuv420p[v]`,
        '-map',
        '[v]',
        '-an',
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-pix_fmt',
        'yuv420p',
        segmentPath,
      ],
      { stdio: 'inherit' }
    );

    segmentPaths.push(segmentPath);
  }

  const concatListPath = resolve(tmpDir, `${scene.sceneId}-concat.txt`);
  writeFileSync(
    concatListPath,
    segmentPaths.map((segmentPath) => `file '${segmentPath.replace(/'/g, "'\\''")}'`).join('\n') + '\n',
    'utf8'
  );

  const outPath = resolve(sceneDir, `${scene.sceneId}.mp4`);
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loglevel',
      'error',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatListPath,
      '-c',
      'copy',
      outPath,
    ],
    { stdio: 'inherit' }
  );
}

rmSync(tmpDir, { recursive: true, force: true });
EOF

TIMESTAMPS="$TIMESTAMPS" SCENE_DIR="$SCENE_DIR" VISUALS_DIR="$VISUALS_DIR" node --input-type=module <<'EOF'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const timestamps = JSON.parse(readFileSync(process.env.TIMESTAMPS, 'utf8'));
const sceneDir = resolve(process.env.SCENE_DIR);
const visualsDir = resolve(process.env.VISUALS_DIR);
mkdirSync(visualsDir, { recursive: true });

const scenes = timestamps.scenes.map((scene) => ({
  sceneId: scene.sceneId,
  source: 'user-footage',
  assetPath: join(sceneDir, `${scene.sceneId}.mp4`),
  duration: Number((scene.audioEnd - scene.audioStart).toFixed(3)),
  assetType: 'video',
  motionStrategy: 'none',
  motionApplied: false,
  matchReasoning: {
    reasoning: 'Lane-local SaaS proof scene built from multiple local motion clips plus SVG product overlays.',
    conceptsMatched: ['saas', 'proof', 'composited-scene']
  }
}));

const visuals = {
  schemaVersion: '1.1.0',
  scenes,
  totalAssets: scenes.length,
  fromUserFootage: scenes.length,
  fromStock: 0,
  fallbacks: 0,
  fromGenerated: 0,
  totalGenerationCost: 0,
  motionStrategy: 'none',
  providerRoutingPolicy: 'configured',
  providerChain: ['local-scene-build'],
  policyGates: [],
  keywords: timestamps.scenes.map((scene) => ({
    keyword: scene.sceneId,
    sectionId: scene.sceneId,
    startTime: scene.audioStart,
    endTime: scene.audioEnd
  })),
  totalDuration: timestamps.totalDuration
};

writeFileSync(join(visualsDir, 'visuals.json'), JSON.stringify(visuals, null, 2) + '\n');
EOF

echo "Built scene clips in $SCENE_DIR and visuals.json in $VISUALS_DIR"
