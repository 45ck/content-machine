import type { EditorVVManifest } from '../ground-truth';

/**
 * Fast-cut montage with no text overlays and sine audio at varying
 * frequencies. Validates pacing classification as "very_fast" and
 * confirms the pipeline handles zero-caption, high-cut-count videos.
 *
 * Total duration: 15 s  |  Scenes: 15  |  Pacing: very_fast
 */

function montageSegments() {
  const colors = [
    '0xF44336',
    '0xE91E63',
    '0x9C27B0',
    '0x673AB7',
    '0x3F51B5',
    '0x2196F3',
    '0x03A9F4',
    '0x00BCD4',
    '0x009688',
    '0x4CAF50',
    '0x8BC34A',
    '0xCDDC39',
    '0xFFEB3B',
    '0xFFC107',
    '0xFF9800',
  ];
  return colors.map((color, i) => ({
    duration: 1,
    video: { type: 'color' as const, color, size: '1080x1920' },
    audio: { type: 'sine' as const, frequency: 200 + i * 30 },
  }));
}

export const montageNoSpeech: EditorVVManifest = {
  name: 'montage-no-speech',
  description: '15 fast cuts, no text, music-freq audio',
  tier: 'ffmpeg',
  resolution: { width: 1080, height: 1920 },
  fps: 30,
  segments: montageSegments(),
  groundTruth: {
    totalDuration: 15,
    sceneCount: 15,
    cutPoints: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    hasVoiceover: false,
    hasMusic: false,
    hasCaptions: false,
    expectedPacing: 'very_fast',
    tolerances: { sceneCountDelta: 2 },
  },
};
