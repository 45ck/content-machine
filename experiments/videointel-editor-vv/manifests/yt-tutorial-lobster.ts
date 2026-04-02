import type { EditorVVManifest } from '../ground-truth';

/**
 * YouTube Short: "Cooking Lobster In ONLY Butter" (sc3-2mA7yn0)
 *
 * Quick cooking tutorial with fast cuts between prep shots. Speaker
 * narrates the process but doesn't use numbered step language, so the
 * classifier picks "listicle" as default (no howto pattern match).
 *
 * Total duration: ~16s  |  Shots: 13  |  Pacing: fast
 */
export const ytTutorialLobster: EditorVVManifest = {
  name: 'yt-tutorial-lobster',
  description: 'YouTube Short: lobster cooking tutorial (16s, narrated)',
  tier: 'real',
  resolution: { width: 360, height: 640 },
  fps: 30,
  inputPath: 'yt-tutorial-lobster.mp4',
  sourceUrl: 'https://www.youtube.com/shorts/sc3-2mA7yn0',
  license: 'YouTube Standard',
  groundTruth: {
    totalDuration: 16.4,
    sceneCount: 13,
    cutPoints: [],
    hasVoiceover: true,
    hasMusic: false,
    hasCaptions: false,
    expectedPacing: 'fast',
    expectedArchetype: 'listicle',
    expectedFormat: 'talking_head',
    tolerances: { durationSeconds: 1, sceneCountDelta: 3 },
  },
};
