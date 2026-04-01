import type { EditorVVManifest } from '../ground-truth';

/**
 * Three-scene listicle: 3 colour segments with large caption text and
 * silent audio. Validates shot detection on hard colour cuts, pacing
 * classification, and audio profile on silent input.
 *
 * Total duration: 21 s  |  Scenes: 3  |  Pacing: slow
 */
export const threeSceneListicle: EditorVVManifest = {
  name: 'three-scene-listicle',
  description: '3 color scenes with captions and silent audio',
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
      audio: { type: 'silence' },
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
      audio: { type: 'silence' },
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
      audio: { type: 'silence' },
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
    skipVoiceoverCheck: true,
    expectedArchetype: 'listicle',
    expectedFormat: 'talking_head',
  },
};
