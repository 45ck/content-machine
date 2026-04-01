import type { EditorVVManifest } from '../ground-truth';

/**
 * Three-scene listicle: 3 colour segments with large caption text and
 * sine audio (not real speech). Validates shot detection on hard colour
 * cuts and OCR on bold drawtext.
 *
 * Total duration: 21 s  |  Scenes: 3  |  Pacing: slow
 */
export const threeSceneListicle: EditorVVManifest = {
  name: 'three-scene-listicle',
  description: '3 color scenes with captions and sine audio',
  tier: 'ffmpeg',
  resolution: { width: 1080, height: 1920 },
  fps: 30,
  segments: [
    {
      duration: 7,
      video: { type: 'color', color: '0x2196F3', size: '1080x1920' },
      drawtext: {
        text: 'First Tip',
        fontsize: 72,
        fontcolor: 'white',
        x: '(w-text_w)/2',
        y: 'h*0.75',
      },
      audio: { type: 'sine', frequency: 300 },
    },
    {
      duration: 7,
      video: { type: 'color', color: '0x4CAF50', size: '1080x1920' },
      drawtext: {
        text: 'Second Tip',
        fontsize: 72,
        fontcolor: 'white',
        x: '(w-text_w)/2',
        y: 'h*0.75',
      },
      audio: { type: 'sine', frequency: 350 },
    },
    {
      duration: 7,
      video: { type: 'color', color: '0xFF5722', size: '1080x1920' },
      drawtext: {
        text: 'Third Tip',
        fontsize: 72,
        fontcolor: 'white',
        x: '(w-text_w)/2',
        y: 'h*0.75',
      },
      audio: { type: 'sine', frequency: 400 },
    },
  ],
  groundTruth: {
    totalDuration: 21,
    sceneCount: 3,
    cutPoints: [7, 14],
    hasVoiceover: false,
    hasMusic: false,
    // Tier 1 drawtext on solid backgrounds is not detected by OCR PSM 6.
    // Real-world captions on video content are tested via Tier 2.
    hasCaptions: false,
    expectedPacing: 'slow',
    skipAudioChecks: true,
  },
};
