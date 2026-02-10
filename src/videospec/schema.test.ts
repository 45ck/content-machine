import { describe, expect, test } from 'vitest';
import { VideoSpecV1Schema, VIDEOSPEC_V1_VERSION } from './schema';

describe('VideoSpecV1Schema', () => {
  test('accepts a minimal valid spec shape', () => {
    const spec = VideoSpecV1Schema.parse({
      meta: {
        version: VIDEOSPEC_V1_VERSION,
        source: 'input.mp4',
        duration: 1.0,
        frame_rate: 30,
        resolution: { width: 1080, height: 1920 },
        analysis_date: new Date().toISOString(),
      },
      timeline: {
        shots: [{ id: 1, start: 0, end: 1 }],
        pacing: {
          shot_count: 1,
          avg_shot_duration: 1,
          median_shot_duration: 1,
          fastest_shot_duration: 1,
          slowest_shot_duration: 1,
          classification: 'slow',
        },
      },
      editing: {
        captions: [],
        text_overlays: [],
        camera_motion: [],
        other_effects: {},
      },
      audio: {
        transcript: [],
        music_segments: [],
        sound_effects: [],
        beat_grid: { bpm: null, beats: [] },
      },
      entities: { characters: [], objects: [] },
      narrative: {
        arc: {
          hook: { start: 0, end: 0.5, description: 'hook' },
          escalation: { start: 0.5, end: 0.75, description: 'escalation' },
          payoff: { start: 0.75, end: 1, description: 'payoff' },
        },
      },
      provenance: { modules: { pipeline: 'test' } },
    });

    expect(spec.meta.version).toBe(VIDEOSPEC_V1_VERSION);
  });
});
