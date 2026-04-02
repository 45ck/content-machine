import type { EditorVVManifest } from '../ground-truth';

/**
 * Real vertical/portrait video: tree branches swaying in the wind,
 * 720×1280 (Mixkit #1188).  15s at 24fps.
 *
 * Tests pipeline handling of portrait-mode (9:16) real footage.
 * Single continuous shot with natural motion. Silent audio track.
 *
 * Total duration: ~15s  |  Scenes: 1  |  Pacing: slow
 */
export const realVertical: EditorVVManifest = {
  name: 'real-vertical',
  description: 'Single-shot vertical (portrait) nature clip',
  tier: 'real',
  resolution: { width: 720, height: 1280 },
  fps: 24,
  inputPath: 'real-vertical.mp4',
  sourceUrl: 'https://assets.mixkit.co/videos/1188/1188-720.mp4',
  license: 'Mixkit Free License',
  groundTruth: {
    totalDuration: 15,
    sceneCount: 1,
    cutPoints: [],
    hasVoiceover: false,
    hasMusic: false,
    hasCaptions: false,
    expectedPacing: 'slow',
    skipVoiceoverCheck: true,
    expectedArchetype: 'listicle',
    expectedFormat: 'talking_head',
    tolerances: { durationSeconds: 1 },
  },
};
