import fs from 'node:fs';
import path from 'node:path';

const laneDir = path.resolve('experiments/proving-wave-2/text-thread-reveal');
const timestampsPath = path.join(laneDir, 'output', 'audio', 'timestamps.json');
const beatsPath = path.join(laneDir, 'assets', 'messages', 'beats.json');
const outputPath = path.join(laneDir, 'output', 'visuals', 'visuals.json');

const timestamps = JSON.parse(fs.readFileSync(timestampsPath, 'utf8'));
const beats = JSON.parse(fs.readFileSync(beatsPath, 'utf8'));
const gameplayPath = path.resolve(process.env.HOME, '.cm/assets/gameplay/subway-surfers/QPW3XwBoQlw.mp4');

const scenes = timestamps.scenes.map((scene, index) => {
  const beat = beats[index] ?? beats[beats.length - 1];
  return {
    sceneId: scene.sceneId,
    source: 'user-footage',
    assetPath: path.join(laneDir, 'assets', 'messages', 'render', `${beat.id}.png`),
    assetType: 'image',
    duration: Number((scene.audioEnd - scene.audioStart).toFixed(3)),
    motionStrategy: 'kenburns',
    motionApplied: false,
    matchReasoning: {
      reasoning: beat.subheader,
      conceptsMatched: ['message-ui', 'state-change']
    }
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
  totalGenerationCost: 0,
  motionStrategy: 'kenburns',
  gameplayClip: {
    path: gameplayPath,
    style: 'subway-surfers'
  },
  providerRoutingPolicy: 'configured',
  providerChain: ['manual-message-assets'],
  policyGates: [],
  totalDuration: timestamps.totalDuration
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(visuals, null, 2));
console.log(outputPath);
