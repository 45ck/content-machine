import fs from 'node:fs';
import path from 'node:path';

const laneDir = path.resolve('experiments/proving-wave-1/text-thread-reveal');
const timestampsPath = path.join(laneDir, 'output', 'audio', 'timestamps.json');
const outputPath = path.join(laneDir, 'output', 'visuals', 'visuals.json');

const timestamps = JSON.parse(fs.readFileSync(timestampsPath, 'utf8'));

const assets = [
  ['scene-001', 'thread-01-goodnight.svg'],
  ['scene-002', 'thread-02-screenshot.svg'],
  ['scene-003', 'thread-03-denial.svg'],
  ['scene-004', 'thread-04-full-thread.svg'],
  ['scene-005', 'thread-05-blocked.svg'],
];

const scenes = timestamps.scenes.map((scene, index) => {
  const [, assetFile] = assets[index] ?? assets[assets.length - 1];
  return {
    sceneId: scene.sceneId,
    source: 'user-footage',
    assetPath: path.join(laneDir, 'assets', assetFile),
    assetType: 'image',
    duration: Number((scene.audioEnd - scene.audioStart).toFixed(3)),
    motionStrategy: 'kenburns',
    motionApplied: false,
  };
});

const visuals = {
  schemaVersion: '1.1.0',
  scenes,
  totalAssets: scenes.length,
  fromUserFootage: scenes.length,
  fromStock: 0,
  fallbacks: 0,
  fromGenerated: 0,
  totalDuration: timestamps.totalDuration,
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(visuals, null, 2));
console.log(outputPath);
