import type { EditorVVManifest } from '../ground-truth';

/**
 * YouTube Short: "5 Secrets to Better Food" (TComPBcvVGc)
 *
 * Classic countdown listicle with a single speaker narrating cooking tips.
 * Heavy jump-cut editing (~34 shots in 60s). Real voiceover with "Number five...
 * Number four..." pattern. No background music detected.
 *
 * Total duration: ~60s  |  Shots: 34  |  Pacing: fast
 */
export const ytListicleTips: EditorVVManifest = {
  name: 'yt-listicle-tips',
  description: 'YouTube Short: 5 cooking tips listicle (60s, narrated)',
  tier: 'real',
  resolution: { width: 360, height: 640 },
  fps: 24,
  inputPath: 'yt-listicle-tips.mp4',
  sourceUrl: 'https://www.youtube.com/shorts/TComPBcvVGc',
  license: 'YouTube Standard',
  groundTruth: {
    totalDuration: 59.8,
    sceneCount: 34,
    // Too many cuts to enumerate individually
    cutPoints: [],
    hasVoiceover: true,
    hasMusic: false,
    hasCaptions: false,
    expectedPacing: 'fast',
    expectedArchetype: 'listicle',
    expectedFormat: 'talking_head',
    tolerances: { durationSeconds: 1, sceneCountDelta: 5 },
  },
};
