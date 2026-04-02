import type { EditorVVManifest } from '../ground-truth';

/**
 * YouTube Short: "Vegeta's Motivation Gym Edit" (xNUCJ5NMkCo)
 *
 * Anime motivation edit: Vegeta clips with background audio from the
 * anime ("Don't you remember what happened"). Whisper picks up the anime
 * dialogue as real speech, making this classify as story (few shots with
 * narration detected). Music not detected by the pipeline.
 *
 * Total duration: ~12s  |  Shots: 5  |  Pacing: moderate
 */
export const ytMontageGym: EditorVVManifest = {
  name: 'yt-montage-gym',
  description: 'YouTube Short: anime gym motivation edit (12s)',
  tier: 'real',
  resolution: { width: 360, height: 640 },
  fps: 30,
  inputPath: 'yt-montage-gym.mp4',
  sourceUrl: 'https://www.youtube.com/shorts/xNUCJ5NMkCo',
  license: 'YouTube Standard',
  groundTruth: {
    totalDuration: 12.1,
    sceneCount: 5,
    cutPoints: [0.9, 5.0, 9.0, 11.5],
    hasVoiceover: true,
    hasMusic: false,
    hasCaptions: false,
    expectedPacing: 'moderate',
    // Anime dialogue detected as speech → story (not montage)
    expectedArchetype: 'story',
    expectedFormat: 'talking_head',
    tolerances: { durationSeconds: 1, sceneCountDelta: 2, cutPointSeconds: 2 },
  },
};
