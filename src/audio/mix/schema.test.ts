/**
 * Audio Mix Schema Tests
 */
import { describe, it, expect } from 'vitest';
import { AUDIO_MIX_SCHEMA_VERSION, AudioMixOutputSchema, type AudioMixOutput } from './schema';

describe('AudioMixOutputSchema', () => {
  it('should validate a mix plan with music, sfx, and ambience', () => {
    const mix: AudioMixOutput = {
      schemaVersion: AUDIO_MIX_SCHEMA_VERSION,
      voicePath: 'audio.wav',
      totalDuration: 12.3,
      mixPreset: 'clean',
      lufsTarget: -16,
      layers: [
        {
          type: 'music',
          path: 'assets/audio/music/lofi-01.mp3',
          start: 0,
          end: 12.3,
          volumeDb: -18,
          duckDb: -8,
          fadeInMs: 300,
          fadeOutMs: 600,
          loop: true,
        },
        {
          type: 'sfx',
          path: 'assets/audio/sfx/pop-01.wav',
          start: 1.2,
          duration: 0.4,
          volumeDb: -12,
          event: 'hook',
          sceneId: 'hook',
        },
        {
          type: 'ambience',
          path: 'assets/audio/ambience/roomtone.wav',
          start: 0,
          end: 12.3,
          volumeDb: -26,
          loop: true,
        },
      ],
      warnings: [],
    };

    const result = AudioMixOutputSchema.safeParse(mix);
    expect(result.success).toBe(true);
  });

  it('should reject zero duration', () => {
    const mix = {
      schemaVersion: AUDIO_MIX_SCHEMA_VERSION,
      voicePath: 'audio.wav',
      totalDuration: 0,
      layers: [],
    };

    const result = AudioMixOutputSchema.safeParse(mix);
    expect(result.success).toBe(false);
  });

  it('should reject invalid layer types', () => {
    const mix = {
      schemaVersion: AUDIO_MIX_SCHEMA_VERSION,
      voicePath: 'audio.wav',
      totalDuration: 4.2,
      layers: [
        {
          type: 'dialogue',
          path: 'audio.wav',
          start: 0,
          end: 4.2,
        },
      ],
    };

    const result = AudioMixOutputSchema.safeParse(mix);
    expect(result.success).toBe(false);
  });
});
