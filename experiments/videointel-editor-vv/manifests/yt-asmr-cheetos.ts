import type { EditorVVManifest } from '../ground-truth';

/**
 * YouTube Short: "Homemade Cheetos" (3SVi80fjs7U)
 *
 * ASMR cooking process: fast cuts showing hands preparing food with
 * ambient audio (water running, crunching). Whisper transcribes ambient
 * sounds as descriptive text. No real voiceover narration.
 *
 * Total duration: ~18s  |  Shots: 9  |  Pacing: fast
 */
export const ytAsmrCheetos: EditorVVManifest = {
  name: 'yt-asmr-cheetos',
  description: 'YouTube Short: ASMR cooking process (18s)',
  tier: 'real',
  resolution: { width: 360, height: 640 },
  fps: 30,
  inputPath: 'yt-asmr-cheetos.mp4',
  sourceUrl: 'https://www.youtube.com/shorts/3SVi80fjs7U',
  license: 'YouTube Standard',
  groundTruth: {
    totalDuration: 17.8,
    sceneCount: 9,
    cutPoints: [1.2, 2.2, 4.1, 8.1, 11.6, 12.7, 13.8, 17.0],
    hasVoiceover: false,
    hasMusic: false,
    hasCaptions: false,
    expectedPacing: 'fast',
    expectedArchetype: 'listicle',
    expectedFormat: 'talking_head',
    // Voiceover check unreliable — Whisper transcribes ambient ASMR sounds
    skipVoiceoverCheck: true,
    tolerances: { durationSeconds: 1, sceneCountDelta: 3, cutPointSeconds: 2 },
  },
};
