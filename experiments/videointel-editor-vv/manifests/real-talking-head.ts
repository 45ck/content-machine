import type { EditorVVManifest } from '../ground-truth';

/**
 * Real talking-head: single shot of a man speaking with gestures on a
 * green-screen background (Mixkit #28287).  16s at 60fps.
 *
 * Tests single-shot degenerate case with real footage. Silent audio
 * (no audio stream in source, silent AAC added for pipeline compat).
 *
 * Total duration: ~16s  |  Scenes: 1  |  Pacing: slow
 */
export const realTalkingHead: EditorVVManifest = {
  name: 'real-talking-head',
  description: 'Single-shot real talking head (green screen)',
  tier: 'real',
  resolution: { width: 1280, height: 720 },
  fps: 60,
  inputPath: 'real-talking-head.mp4',
  sourceUrl: 'https://assets.mixkit.co/videos/28287/28287-720.mp4',
  license: 'Mixkit Free License',
  groundTruth: {
    totalDuration: 16,
    sceneCount: 1,
    cutPoints: [],
    hasVoiceover: false,
    hasMusic: false,
    hasCaptions: false,
    expectedPacing: 'slow',
    skipVoiceoverCheck: true,
    expectedArchetype: 'story',
    expectedFormat: 'talking_head',
    tolerances: { durationSeconds: 1 },
  },
};
