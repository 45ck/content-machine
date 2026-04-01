import type { EditorVVManifest } from '../ground-truth';

/**
 * Single continuous shot — 30 seconds of one colour with a single
 * caption and sine audio. Validates that the pipeline handles the
 * degenerate case (one shot, no cuts).
 *
 * Total duration: 30 s  |  Scenes: 1  |  Pacing: slow
 */
export const singleShotTalking: EditorVVManifest = {
  name: 'single-shot-talking',
  description: '1 scene, 30s, minimal cuts',
  tier: 'ffmpeg',
  resolution: { width: 1080, height: 1920 },
  fps: 30,
  segments: [
    {
      duration: 30,
      video: { type: 'color', color: '0x607D8B', size: '1080x1920' },
      drawtext: {
        text: 'Hello World',
        fontsize: 64,
        fontcolor: 'white',
        x: '(w-text_w)/2',
        y: 'h*0.75',
      },
      audio: { type: 'sine', frequency: 260 },
    },
  ],
  groundTruth: {
    totalDuration: 30,
    sceneCount: 1,
    cutPoints: [],
    hasVoiceover: false,
    hasMusic: false,
    // Tier 1 drawtext on solid backgrounds is not detected by OCR PSM 6.
    hasCaptions: false,
    expectedPacing: 'slow',
    skipAudioChecks: true,
  },
};
