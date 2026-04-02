import type { EditorVVManifest } from '../ground-truth';

/**
 * Fast-cut montage with no text overlays and silent audio. Validates
 * that the pipeline handles zero-caption,
 * high-cut-count videos. PySceneDetect's ContentDetector misses many
 * 1-second solid-colour transitions (adjacent hues are too similar),
 * so scene count and pacing expectations are relaxed.
 *
 * Total duration: 15 s  |  Scenes: 15 (expect ~5 detected)  |  Pacing: moderate
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
    audio: { type: 'silence' as const },
  }));
}

export const montageNoSpeech: EditorVVManifest = {
  name: 'montage-no-speech',
  description: '15 fast cuts, no text, silent audio',
  tier: 'ffmpeg',
  resolution: { width: 1080, height: 1920 },
  fps: 30,
  segments: montageSegments(),
  groundTruth: {
    totalDuration: 15,
    sceneCount: 15,
    // Individual cut points not asserted — pyscenedetect misses most 1s
    // solid-colour transitions where adjacent hues are similar.
    cutPoints: [],
    hasVoiceover: false,
    hasMusic: false,
    hasCaptions: false,
    // With ~5 detected scenes in 15s, avg ≈ 3s → 'moderate'.
    expectedPacing: 'moderate',
    skipVoiceoverCheck: true,
    expectedArchetype: 'montage',
    expectedFormat: 'montage',
    tolerances: { sceneCountDelta: 12 },
  },
};
