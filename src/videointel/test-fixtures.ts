/**
 * Shared test fixtures for videointel module.
 *
 * Provides a VideoSpec.v1 factory and pre-built fixtures for common video archetypes.
 * No real videos needed — these are pure JSON objects.
 */
import { VIDEOSPEC_V1_VERSION, type VideoSpecV1 } from '../domain';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Array<infer U>
    ? Array<DeepPartial<U>>
    : T[P] extends object
      ? DeepPartial<T[P]>
      : T[P];
};

/**
 * Merge overrides into a base object (shallow per top-level key, spreads nested objects).
 */
function deepMerge<T extends Record<string, unknown>>(base: T, overrides: DeepPartial<T>): T {
  const result = { ...base } as Record<string, unknown>;
  for (const key of Object.keys(overrides)) {
    const ov = (overrides as Record<string, unknown>)[key];
    const bv = (base as Record<string, unknown>)[key];
    if (
      ov !== undefined &&
      typeof ov === 'object' &&
      ov !== null &&
      !Array.isArray(ov) &&
      typeof bv === 'object' &&
      bv !== null &&
      !Array.isArray(bv)
    ) {
      result[key] = deepMerge(
        bv as Record<string, unknown>,
        ov as DeepPartial<Record<string, unknown>>
      );
    } else if (ov !== undefined) {
      result[key] = ov;
    }
  }
  return result as T;
}

/**
 * Create a minimal but valid VideoSpec.v1 object.
 * Override any fields via the `overrides` parameter.
 */
export function createMinimalVideoSpec(overrides?: DeepPartial<VideoSpecV1>): VideoSpecV1 {
  const base: VideoSpecV1 = {
    meta: {
      version: VIDEOSPEC_V1_VERSION,
      source: 'test-video.mp4',
      duration: 30,
      frame_rate: 30,
      resolution: { width: 1080, height: 1920 },
      analysis_date: '2026-01-01T00:00:00Z',
    },
    timeline: {
      shots: [{ id: 1, start: 0, end: 30 }],
      pacing: {
        shot_count: 1,
        avg_shot_duration: 30,
        median_shot_duration: 30,
        fastest_shot_duration: 30,
        slowest_shot_duration: 30,
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
      beat_grid: { beats: [] },
    },
    entities: {
      characters: [],
      objects: [],
    },
    narrative: {
      arc: {
        hook: { start: 0, end: 3, description: 'Hook' },
        escalation: { start: 3, end: 25, description: 'Escalation' },
        payoff: { start: 25, end: 30, description: 'Payoff' },
      },
    },
    provenance: {
      modules: { test: '1.0.0' },
    },
  };

  if (!overrides) return base;
  return deepMerge(base, overrides);
}

/**
 * Talking-head fixture: single shot, full narration, slow pacing.
 */
export const talkingHeadSpec: VideoSpecV1 = createMinimalVideoSpec({
  meta: { duration: 45, source: 'talking-head.mp4' },
  timeline: {
    shots: [{ id: 1, start: 0, end: 45 }],
    pacing: {
      shot_count: 1,
      avg_shot_duration: 45,
      median_shot_duration: 45,
      fastest_shot_duration: 45,
      slowest_shot_duration: 45,
      classification: 'slow',
    },
  },
  editing: {
    captions: [
      { text: 'Hello everyone', start: 0, end: 2 },
      { text: 'Today I want to talk about something', start: 2, end: 5 },
    ],
    camera_motion: [{ shot_id: 1, motion: 'static', start: 0, end: 45 }],
  },
  audio: {
    transcript: [
      {
        start: 0,
        end: 10,
        text: 'Hello everyone, today I want to talk about something important.',
        speaker: 'host',
      },
      {
        start: 10,
        end: 25,
        text: 'This is a key insight that you need to know about.',
        speaker: 'host',
      },
      { start: 25, end: 40, text: 'Let me explain why this matters for you.', speaker: 'host' },
      { start: 40, end: 45, text: 'Follow for more tips!', speaker: 'host' },
    ],
  },
  narrative: {
    arc: {
      hook: { start: 0, end: 5, description: 'Personal greeting' },
      escalation: { start: 5, end: 40, description: 'Main topic discussion' },
      payoff: { start: 40, end: 45, description: 'Call to action' },
    },
    cta: 'Follow for more tips!',
    tone: 'conversational',
  },
});

/**
 * Listicle fixture: numbered transcript, multiple shots, moderate pacing.
 */
export const listicleSpec: VideoSpecV1 = createMinimalVideoSpec({
  meta: { duration: 40, source: 'listicle.mp4' },
  timeline: {
    shots: [
      { id: 1, start: 0, end: 5 },
      { id: 2, start: 5, end: 15, transition_in: 'cut' },
      { id: 3, start: 15, end: 25, transition_in: 'cut' },
      { id: 4, start: 25, end: 35, transition_in: 'cut' },
      { id: 5, start: 35, end: 40, transition_in: 'cut' },
    ],
    pacing: {
      shot_count: 5,
      avg_shot_duration: 8,
      median_shot_duration: 10,
      fastest_shot_duration: 5,
      slowest_shot_duration: 10,
      classification: 'moderate',
    },
  },
  editing: {
    captions: [
      { text: 'Three things you need to know', start: 0, end: 3 },
      { text: 'First, always start early', start: 5, end: 10 },
      { text: 'Second, consistency is key', start: 15, end: 20 },
      { text: 'Third, never give up', start: 25, end: 30 },
    ],
  },
  audio: {
    transcript: [
      { start: 0, end: 5, text: 'Three things you absolutely need to know.' },
      { start: 5, end: 15, text: 'First, always start early. The early bird gets the worm.' },
      { start: 15, end: 25, text: 'Second, consistency is key. Show up every day.' },
      { start: 25, end: 35, text: 'Third, never give up. Success takes time.' },
      { start: 35, end: 40, text: 'Which one resonates most? Comment below!' },
    ],
  },
  narrative: {
    arc: {
      hook: { start: 0, end: 5, description: 'List intro' },
      escalation: { start: 5, end: 35, description: 'Three items' },
      payoff: { start: 35, end: 40, description: 'Engagement CTA' },
    },
    format: 'listicle',
    cta: 'Which one resonates most? Comment below!',
    themes: ['productivity', 'motivation'],
  },
});

/**
 * Reaction fixture: inserted content blocks (reddit screenshots), talking head overlay.
 */
export const reactionSpec: VideoSpecV1 = createMinimalVideoSpec({
  meta: { duration: 35, source: 'reaction.mp4' },
  timeline: {
    shots: [
      { id: 1, start: 0, end: 5 },
      { id: 2, start: 5, end: 15, transition_in: 'cut' },
      { id: 3, start: 15, end: 25, transition_in: 'cut' },
      { id: 4, start: 25, end: 35, transition_in: 'cut' },
    ],
    pacing: {
      shot_count: 4,
      avg_shot_duration: 8.75,
      median_shot_duration: 10,
      fastest_shot_duration: 5,
      slowest_shot_duration: 10,
      classification: 'moderate',
    },
  },
  audio: {
    transcript: [
      { start: 0, end: 5, text: 'Look at this Reddit post!', speaker: 'host' },
      {
        start: 5,
        end: 15,
        text: 'This person says they made a million dollars in a week.',
        speaker: 'host',
      },
      { start: 15, end: 25, text: 'No way this is real. Let me break it down.', speaker: 'host' },
      { start: 25, end: 35, text: 'What do you think? Is this legit?', speaker: 'host' },
    ],
  },
  inserted_content_blocks: [
    {
      id: 'ic-1',
      type: 'reddit_screenshot',
      start: 5,
      end: 15,
      presentation: 'full_screen',
    },
    {
      id: 'ic-2',
      type: 'reddit_screenshot',
      start: 15,
      end: 25,
      presentation: 'full_screen',
    },
  ],
  narrative: {
    arc: {
      hook: { start: 0, end: 5, description: 'Reaction intro' },
      escalation: { start: 5, end: 25, description: 'Reddit content reaction' },
      payoff: { start: 25, end: 35, description: 'Commentary' },
    },
    format: 'reaction',
  },
});

/**
 * Compilation fixture: many short shots, no transcript, music-driven, fast pacing.
 */
export const compilationSpec: VideoSpecV1 = createMinimalVideoSpec({
  meta: { duration: 30, source: 'compilation.mp4' },
  timeline: {
    shots: Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      start: i * 1.2,
      end: (i + 1) * 1.2,
      transition_in: i > 0 ? ('cut' as const) : undefined,
      jump_cut: i > 0 && i % 3 === 0 ? true : undefined,
    })),
    pacing: {
      shot_count: 25,
      avg_shot_duration: 1.2,
      median_shot_duration: 1.2,
      fastest_shot_duration: 1.2,
      slowest_shot_duration: 1.2,
      classification: 'very_fast',
    },
  },
  audio: {
    transcript: [],
    music_segments: [{ start: 0, end: 30, track: 'Epic Montage', background: false }],
    sound_effects: [],
    beat_grid: { bpm: 128, beats: Array.from({ length: 64 }, (_, i) => i * (30 / 64)) },
  },
  narrative: {
    arc: {
      hook: { start: 0, end: 3, description: 'Opening montage' },
      escalation: { start: 3, end: 27, description: 'Rapid clips' },
      payoff: { start: 27, end: 30, description: 'Finale' },
    },
    format: 'montage',
    themes: ['action', 'excitement'],
  },
});
