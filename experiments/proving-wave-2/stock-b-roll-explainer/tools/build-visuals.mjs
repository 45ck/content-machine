import fs from 'node:fs';
import path from 'node:path';

const laneDir = path.resolve('experiments/proving-wave-2/stock-b-roll-explainer');
const timestampsPath = path.join(laneDir, 'outputs', 'work', 'audio', 'timestamps.json');
const clipPlanPath = path.join(laneDir, 'inputs', 'clip-plan.json');
const outputPath = path.join(laneDir, 'outputs', 'work', 'visuals.json');

const timestamps = JSON.parse(fs.readFileSync(timestampsPath, 'utf8'));
const clipPlan = JSON.parse(fs.readFileSync(clipPlanPath, 'utf8'));

const planBySceneId = new Map(clipPlan.map((entry) => [entry.sceneId, entry]));

const scenes = timestamps.scenes.map((scene, index) => {
  const plan = planBySceneId.get(scene.sceneId);
  if (!plan) {
    throw new Error(`Missing clip plan entry for ${scene.sceneId}`);
  }
  const duration = Number((scene.audioEnd - scene.audioStart).toFixed(3));
  const trimStart = Number((plan.trimStart ?? 0).toFixed(3));
  return {
    sceneId: scene.sceneId,
    source: 'user-footage',
    assetPath: path.resolve(plan.assetPath),
    duration,
    assetType: 'video',
    motionApplied: false,
    trimStart,
    trimEnd: Number((trimStart + duration).toFixed(3)),
    trimReasoning: `Use a shorter subcut for wave-2 cadence (${plan.label}).`,
    matchReasoning: {
      reasoning: `Lane-local local-motion mapping for ${plan.label}.`,
      conceptsMatched: ['manual-local-motion', 'wave-2-stock-edutainment']
    },
    visualCue: plan.label
  };
});

const keywords = timestamps.scenes.map((scene, index) => ({
  keyword: scene.words.slice(0, 4).map((word) => word.word).join(' '),
  sectionId: scene.sceneId,
  startTime: scene.audioStart,
  endTime: scene.audioEnd,
  visualHint: clipPlan[index]?.label ?? scene.sceneId
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
  providerChain: ['manual-local-motion'],
  keywords,
  totalDuration: timestamps.totalDuration
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(visuals, null, 2)}\n`);
console.log(outputPath);
