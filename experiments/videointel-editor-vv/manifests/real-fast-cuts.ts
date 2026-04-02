import type { EditorVVManifest } from '../ground-truth';

/**
 * Real fast-cut montage: 6 stock clips trimmed to 3-5 seconds each
 * (gym, coast, tree, couple, retro, BBB). Tests scene detection on
 * rapid hard cuts between diverse real footage.
 *
 * Segments: gym 5s → coast 5s → tree 5s → couple 3s → retro 3s → BBB 4s
 * Total duration: 25s  |  Scenes: 8 (detected)  |  Pacing: moderate
 *
 * pyscenedetect detects 8 scenes: the coast clip has internal camera
 * transitions at ~8s and ~9s within its 5s segment. With 8 shots in
 * 25s, avg duration = 3.13s → 'moderate' pacing.
 */
export const realFastCuts: EditorVVManifest = {
  name: 'real-fast-cuts',
  description: '6 real clips trimmed to 3-5s fast cuts',
  tier: 'real',
  resolution: { width: 1280, height: 720 },
  fps: 30,
  inputPath: 'real-fast-cuts.mp4',
  sourceUrl: 'Composed from Mixkit CC0 clips + Big Buck Bunny (CC-BY)',
  license: 'CC0 / CC-BY-3.0',
  groundTruth: {
    totalDuration: 25,
    sceneCount: 8,
    // Clip boundaries + internal transitions in coast segment
    cutPoints: [5, 8, 9, 10, 15, 18, 21],
    hasVoiceover: false,
    hasMusic: false,
    hasCaptions: false,
    expectedPacing: 'moderate',
    skipVoiceoverCheck: true,
    expectedArchetype: 'montage',
    expectedFormat: 'montage',
    tolerances: { durationSeconds: 1, cutPointSeconds: 2, sceneCountDelta: 2 },
  },
};
