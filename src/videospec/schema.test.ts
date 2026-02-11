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

  test('accepts inserted-content extraction layout/structured fields', () => {
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
      inserted_content_blocks: [
        {
          id: 'icb_0001',
          type: 'reddit_screenshot',
          start: 0,
          end: 0.7,
          presentation: 'picture_in_picture',
          region: { x: 0.1, y: 0.2, w: 0.5, h: 0.3 },
          extraction: {
            ocr: {
              engine: 'tesseract.js',
              text: "Who's the strangest person you've ever met?",
              lines: [
                {
                  text: "Who's the strangest person you've ever met?",
                  bbox: [0.1, 0.2, 0.5, 0.1],
                },
              ],
            },
            layout: {
              engine: 'heuristic-line-grouping',
              elements: [
                {
                  id: 'el_01',
                  role: 'title',
                  text: "Who's the strangest person you've ever met?",
                  bbox: [0.1, 0.2, 0.5, 0.1],
                },
              ],
              reading_order: ['el_01'],
            },
            structured: {
              schema_version: '1.0',
              data: {
                kind: 'reddit_post',
                title: "Who's the strangest person you've ever met?",
              },
            },
          },
        },
      ],
      provenance: { modules: { pipeline: 'test' } },
    });

    expect(spec.inserted_content_blocks?.[0]?.extraction?.layout?.engine).toBe(
      'heuristic-line-grouping'
    );
  });
});
