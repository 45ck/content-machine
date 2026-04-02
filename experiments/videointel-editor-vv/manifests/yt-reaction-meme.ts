import type { EditorVVManifest } from '../ground-truth';

/**
 * YouTube Short: "anime vs reddit | the rock reaction meme" (_ei61HSIKsM)
 *
 * Meme compilation: anime clips intercut with "The Rock" reaction face.
 * Background music detected as speech by Whisper ("music upbeat"), but
 * hasRealSpeech filters most hallucinations. Classified as listicle
 * (default fallback with some transcript detected).
 *
 * Total duration: ~14s  |  Shots: 6  |  Pacing: moderate
 */
export const ytReactionMeme: EditorVVManifest = {
  name: 'yt-reaction-meme',
  description: 'YouTube Short: anime/rock reaction meme (14s)',
  tier: 'real',
  resolution: { width: 360, height: 640 },
  fps: 30,
  inputPath: 'yt-reaction-meme.mp4',
  sourceUrl: 'https://www.youtube.com/shorts/_ei61HSIKsM',
  license: 'YouTube Standard',
  groundTruth: {
    totalDuration: 13.5,
    sceneCount: 6,
    cutPoints: [3.0, 4.5, 7.4, 9.0, 11.9],
    hasVoiceover: false,
    hasMusic: false,
    hasCaptions: false,
    expectedPacing: 'moderate',
    expectedArchetype: 'listicle',
    expectedFormat: 'talking_head',
    // Voiceover check is unreliable — Whisper detects background music as speech
    skipVoiceoverCheck: true,
    tolerances: { durationSeconds: 1, sceneCountDelta: 2, cutPointSeconds: 2 },
  },
};
