import type { EditorVVManifest } from '../ground-truth';

/**
 * Five-scene how-to tutorial: 5 colour segments with step numbers,
 * varying durations that mimic tutorial pacing.
 *
 * Total duration: 45 s  |  Scenes: 5  |  Pacing: moderate
 */
export const fiveSceneHowto: EditorVVManifest = {
  name: 'five-scene-howto',
  description: '5 scenes with step numbers and tutorial pacing',
  tier: 'ffmpeg',
  resolution: { width: 1080, height: 1920 },
  fps: 30,
  segments: [
    {
      duration: 5,
      video: { type: 'color', color: '0x9C27B0', size: '1080x1920' },
      drawtext: {
        text: 'Step 1 Intro',
        fontsize: 64,
        fontcolor: 'white',
        x: '(w-text_w)/2',
        y: '(h-text_h)/2',
      },
      audio: { type: 'sine', frequency: 280 },
    },
    {
      duration: 10,
      video: { type: 'color', color: '0x3F51B5', size: '1080x1920' },
      drawtext: {
        text: 'Step 2 Setup',
        fontsize: 64,
        fontcolor: 'white',
        x: '(w-text_w)/2',
        y: '(h-text_h)/2',
      },
      audio: { type: 'sine', frequency: 320 },
    },
    {
      duration: 12,
      video: { type: 'color', color: '0x009688', size: '1080x1920' },
      drawtext: {
        text: 'Step 3 Build',
        fontsize: 64,
        fontcolor: 'white',
        x: '(w-text_w)/2',
        y: '(h-text_h)/2',
      },
      audio: { type: 'sine', frequency: 360 },
    },
    {
      duration: 10,
      video: { type: 'color', color: '0xFFC107', size: '1080x1920' },
      drawtext: {
        text: 'Step 4 Test',
        fontsize: 64,
        fontcolor: 'black',
        x: '(w-text_w)/2',
        y: '(h-text_h)/2',
      },
      audio: { type: 'sine', frequency: 400 },
    },
    {
      duration: 8,
      video: { type: 'color', color: '0xE91E63', size: '1080x1920' },
      drawtext: {
        text: 'Step 5 Done',
        fontsize: 64,
        fontcolor: 'white',
        x: '(w-text_w)/2',
        y: '(h-text_h)/2',
      },
      audio: { type: 'sine', frequency: 440 },
    },
  ],
  groundTruth: {
    totalDuration: 45,
    sceneCount: 5,
    cutPoints: [5, 15, 27, 37],
    hasVoiceover: false,
    hasMusic: false,
    hasCaptions: true,
    expectedCaptionTexts: ['Step 1', 'Step 2', 'Step 3', 'Step 4', 'Step 5'],
    expectedPacing: 'moderate',
    // Format not asserted: heuristic depends on narration we can't synthesize
  },
};
