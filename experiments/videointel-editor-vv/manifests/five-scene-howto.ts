import type { EditorVVManifest } from '../ground-truth';

/**
 * Five-scene how-to tutorial: 5 colour segments with step numbers,
 * varying durations that mimic tutorial pacing.
 *
 * Total duration: 45 s  |  Scenes: 5  |  Pacing: slow
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
      video: { type: 'color', color: '0xFF5722', size: '1080x1920' },
      drawtext: {
        text: 'Step 1 Intro',
        fontsize: 64,
        fontcolor: 'white',
        x: '(w-text_w)/2',
        y: 'h*0.75',
      },
      audio: { type: 'silence' },
    },
    {
      duration: 10,
      video: { type: 'color', color: '0x3F51B5', size: '1080x1920' },
      drawtext: {
        text: 'Step 2 Setup',
        fontsize: 64,
        fontcolor: 'white',
        x: '(w-text_w)/2',
        y: 'h*0.75',
      },
      audio: { type: 'silence' },
    },
    {
      duration: 12,
      video: { type: 'color', color: '0x009688', size: '1080x1920' },
      drawtext: {
        text: 'Step 3 Build',
        fontsize: 64,
        fontcolor: 'white',
        x: '(w-text_w)/2',
        y: 'h*0.75',
      },
      audio: { type: 'silence' },
    },
    {
      duration: 10,
      video: { type: 'color', color: '0xFFC107', size: '1080x1920' },
      drawtext: {
        text: 'Step 4 Test',
        fontsize: 64,
        fontcolor: 'black',
        x: '(w-text_w)/2',
        y: 'h*0.75',
      },
      audio: { type: 'silence' },
    },
    {
      duration: 8,
      video: { type: 'color', color: '0xE91E63', size: '1080x1920' },
      drawtext: {
        text: 'Step 5 Done',
        fontsize: 64,
        fontcolor: 'white',
        x: '(w-text_w)/2',
        y: 'h*0.75',
      },
      audio: { type: 'silence' },
    },
  ],
  groundTruth: {
    totalDuration: 45,
    sceneCount: 5,
    cutPoints: [5, 15, 27, 37],
    hasVoiceover: false,
    hasMusic: false,
    // Tier 1 drawtext on solid backgrounds is not detected by OCR PSM 6.
    hasCaptions: false,
    expectedPacing: 'slow',
    skipVoiceoverCheck: true,
    expectedArchetype: 'montage',
    expectedFormat: 'montage',
  },
};
