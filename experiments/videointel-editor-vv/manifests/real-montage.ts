import type { EditorVVManifest } from '../ground-truth';

/**
 * Real-footage montage: 4 stock clips concatenated (BBB animation,
 * coastal timelapse, couple close-up, retro woman).
 *
 * Tests scene detection on genuine visual transitions between diverse
 * real-world footage. All clips are video-only with synthesized silent
 * audio track.
 *
 * Segments: BBB 10s → coast 16.2s → couple 9.2s → retro 5.3s
 * Total duration: ~40.7s  |  Scenes: 9 (detected)  |  Pacing: slow
 *
 * pyscenedetect correctly detects internal transitions within clips
 * (coast timelapse has camera pans, couple/retro have lighting shifts),
 * yielding 9 visual scenes from 4 concatenated clips.
 */
export const realMontage: EditorVVManifest = {
  name: 'real-montage',
  description: '4 real stock clips concatenated (montage)',
  tier: 'real',
  resolution: { width: 1280, height: 720 },
  fps: 30,
  inputPath: 'real-montage.mp4',
  sourceUrl: 'Composed from Mixkit CC0 clips + Big Buck Bunny (CC-BY)',
  license: 'CC0 / CC-BY-3.0',
  groundTruth: {
    totalDuration: 40.7,
    sceneCount: 9,
    // Hard clip boundaries + internal transitions detected by pyscenedetect
    cutPoints: [10, 13, 16.7, 21.1, 24.5, 25.2, 26.2, 35.4],
    hasVoiceover: false,
    hasMusic: false,
    hasCaptions: false,
    expectedPacing: 'slow',
    skipVoiceoverCheck: true,
    expectedArchetype: 'montage',
    expectedFormat: 'montage',
    tolerances: { durationSeconds: 1, cutPointSeconds: 2, sceneCountDelta: 2 },
  },
};
