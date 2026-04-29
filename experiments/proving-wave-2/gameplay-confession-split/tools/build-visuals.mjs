import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const repoRoot = resolve('.');
const laneRoot = resolve('experiments/proving-wave-2/gameplay-confession-split');
const timestampsPath = resolve(laneRoot, 'output/work/audio/timestamps.json');
const outputPath = resolve(laneRoot, 'output/work/visuals/visuals.json');

const timestamps = JSON.parse(readFileSync(timestampsPath, 'utf8'));
const totalDuration = Number(timestamps.totalDuration ?? 0);
if (!Number.isFinite(totalDuration) || totalDuration <= 0) {
  throw new Error(`Invalid totalDuration in ${timestampsPath}`);
}

const gameplayPath = resolve(laneRoot, 'assets/gameplay/subway.mp4');
const beats = [
  ['hook-call-a', 'seg-20-call-a.mp4', 2.7, 'conflict-opener'],
  ['setup-desk-a', 'seg-10-desk-a.mp4', 3.0, 'fake-screenshots'],
  ['setup-desk-b', 'seg-11-desk-b.mp4', 3.0, 'fake-screenshots'],
  ['landlord-call-b', 'seg-21-call-b.mp4', 2.7, 'landlord-pressure'],
  ['blame-desk-a', 'seg-10-desk-a.mp4', 2.7, 'blame-beat'],
  ['reveal-setup', 'seg-30-setup-a.mp4', 3.0, 'offer-email-setup'],
  ['stall-call-a', 'seg-20-call-a.mp4', 2.7, 'stalling'],
  ['panic', 'seg-40-panic-a.mp4', 3.0, 'panic'],
  ['click-desk-b', 'seg-11-desk-b.mp4', 2.6, 'voicemail-click'],
  ['reveal-aftermath', 'seg-50-aftermath-a.mp4', 3.0, 'public-fallout'],
  ['judgment-dark', 'seg-60-cta.mp4', 2.667, 'judgment-bait'],
  ['aftershock', 'seg-50-aftermath-a.mp4', 3.0, 'aftershock'],
  ['closer-dark', 'seg-60-cta.mp4', 2.667, 'closer']
];

let cursor = 0;
let cycle = 0;
const scenes = [];
const keywords = [];

while (cursor < totalDuration) {
  const index = scenes.length % beats.length;
  const [sceneId, filename, beatDuration, keyword] = beats[index];
  if (cursor >= totalDuration) break;
  const remaining = Number((totalDuration - cursor).toFixed(3));
  const duration = Number(Math.min(beatDuration, remaining).toFixed(3));
  if (duration <= 0.2) break;
  const assetPath = resolve(laneRoot, 'assets/top', filename);
  const uniqueSceneId = cycle === 0 ? sceneId : `${sceneId}-r${cycle + 1}`;
  scenes.push({
    sceneId: uniqueSceneId,
    source: 'user-footage',
    assetPath,
    duration,
    assetType: 'video',
    motionStrategy: 'none',
    motionApplied: false,
    matchReasoning: {
      reasoning: `Lane-local gameplay-confession beat: ${keyword}`,
      conceptsMatched: [keyword]
    }
  });
  keywords.push({
    keyword,
    sectionId: uniqueSceneId,
    startTime: Number(cursor.toFixed(3)),
    endTime: Number((cursor + duration).toFixed(3))
  });
  cursor += duration;
  if (index === beats.length - 1) {
    cycle += 1;
  }
}

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
  gameplayClip: {
    path: gameplayPath,
    duration: Math.max(totalDuration, 1),
    width: 1080,
    height: 960,
    style: 'subway-surfers'
  },
  providerRoutingPolicy: 'configured',
  providerChain: ['manual-local-assets'],
  policyGates: [],
  keywords,
  totalDuration: Number(totalDuration.toFixed(3))
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, JSON.stringify(visuals, null, 2) + '\n');
console.log(outputPath);
