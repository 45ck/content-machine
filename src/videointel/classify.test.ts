/**
 * Tests for VideoTheme classification logic.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  classifyVideoSpec,
  inferArchetype,
  inferPurpose,
  inferFormat,
  hasRealSpeech,
  WHISPER_HALLUCINATION,
} from './classify';
import { VideoThemeV1Schema, VIDEOTHEME_V1_VERSION } from '../domain';
import {
  createMinimalVideoSpec,
  talkingHeadSpec,
  listicleSpec,
  reactionSpec,
  compilationSpec,
} from './test-fixtures';

describe('classifyVideoSpec', () => {
  // TC-01: Talking head → correct archetype
  it('classifies a talking-head video', async () => {
    const result = await classifyVideoSpec(talkingHeadSpec, {
      sourceVideospecPath: 'talking-head.v1.json',
    });

    expect(result.version).toBe(VIDEOTHEME_V1_VERSION);
    expect(result.source_videospec).toBe('talking-head.v1.json');
    expect(result.format).toBe('talking_head');
    expect(result.provenance.method).toBe('heuristic');
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  // TC-02: Listicle → archetype = listicle
  it('classifies a listicle video', async () => {
    const result = await classifyVideoSpec(listicleSpec, {
      sourceVideospecPath: 'listicle.v1.json',
    });

    expect(result.archetype).toBe('listicle');
    expect(result.archetype_confidence).toBeGreaterThanOrEqual(0.5);
    expect(result.format).toBe('listicle');
    expect(result.theme_labels).toEqual(['productivity', 'motivation']);
  });

  // TC-03: Reddit reaction → correct classification
  it('classifies a reaction video with inserted content', async () => {
    const result = await classifyVideoSpec(reactionSpec, {
      sourceVideospecPath: 'reaction.v1.json',
    });

    expect(result.archetype).toBe('reaction');
    expect(result.format).toBe('reaction');
    expect(result.edit_signature.has_inserted_content).toBe(true);
  });

  // TC-04: Fast compilation → compilation
  it('classifies a fast compilation (25 shots, no transcript, music)', async () => {
    const result = await classifyVideoSpec(compilationSpec, {
      sourceVideospecPath: 'compilation.v1.json',
    });

    expect(result.archetype).toBe('montage');
    expect(result.style.energy).toBe('high');
    expect(result.edit_signature.has_music).toBe(true);
    expect(result.purpose).toBe('entertain');
  });

  // TC-05: Minimal spec → graceful degradation, low confidence
  it('handles minimal/empty spec gracefully', async () => {
    const minimal = createMinimalVideoSpec();
    const result = await classifyVideoSpec(minimal, {
      sourceVideospecPath: 'minimal.v1.json',
    });

    expect(result.version).toBe(VIDEOTHEME_V1_VERSION);
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    // Should still produce a valid theme
    const validation = VideoThemeV1Schema.safeParse(result);
    expect(validation.success).toBe(true);
  });

  // TC-06: Schema validation (valid + invalid shapes)
  describe('schema validation', () => {
    it('produces valid VideoTheme.v1 for all fixtures', async () => {
      const fixtures = [talkingHeadSpec, listicleSpec, reactionSpec, compilationSpec];
      for (const fixture of fixtures) {
        const result = await classifyVideoSpec(fixture);
        const validation = VideoThemeV1Schema.safeParse(result);
        expect(validation.success).toBe(true);
      }
    });

    it('rejects invalid VideoTheme shapes', () => {
      const invalid = { version: 'wrong', archetype: '' };
      const validation = VideoThemeV1Schema.safeParse(invalid);
      expect(validation.success).toBe(false);
    });
  });

  // TC-07: LLM fallback on error → heuristic result with provenance note
  it('falls back to heuristic when LLM fails', async () => {
    const failingProvider = {
      chat: vi.fn().mockRejectedValue(new Error('LLM unavailable')),
    } as never;

    const result = await classifyVideoSpec(listicleSpec, {
      mode: 'llm',
      llmProvider: failingProvider,
      sourceVideospecPath: 'listicle.v1.json',
    });

    expect(result.provenance.method).toBe('heuristic');
    expect(result.provenance.notes).toContain('fell back to heuristic');
    expect(result.archetype).toBe('listicle');
  });

  // TC-08: Determinism (same input → same output, ignoring timestamps)
  it('produces deterministic output for the same input', async () => {
    const result1 = await classifyVideoSpec(listicleSpec, {
      sourceVideospecPath: 'listicle.v1.json',
    });
    const result2 = await classifyVideoSpec(listicleSpec, {
      sourceVideospecPath: 'listicle.v1.json',
    });

    // Compare everything except provenance.classified_at (timestamp)
    const strip = (r: typeof result1) => ({
      ...r,
      provenance: { ...r.provenance, classified_at: '' },
    });
    expect(strip(result1)).toEqual(strip(result2));
  });
});

describe('inferArchetype', () => {
  it('detects "versus" pattern in transcript', () => {
    const spec = createMinimalVideoSpec({
      audio: {
        transcript: [
          { start: 0, end: 15, text: 'React vs Angular: which one should you choose?' },
          { start: 15, end: 30, text: 'Let me break down the differences.' },
        ],
        music_segments: [],
        sound_effects: [],
        beat_grid: { beats: [] },
      },
    });
    expect(inferArchetype(spec)).toBe('versus');
  });

  it('detects "howto" pattern in transcript', () => {
    const spec = createMinimalVideoSpec({
      audio: {
        transcript: [
          { start: 0, end: 10, text: 'Step 1: open your terminal.' },
          { start: 10, end: 20, text: 'Step 2: install the dependencies.' },
          { start: 20, end: 30, text: 'Step 3: run the build command.' },
        ],
        music_segments: [],
        sound_effects: [],
        beat_grid: { beats: [] },
      },
    });
    expect(inferArchetype(spec)).toBe('howto');
  });

  it('detects "myth" pattern in transcript', () => {
    const spec = createMinimalVideoSpec({
      audio: {
        transcript: [
          { start: 0, end: 15, text: 'Common myth: you need 8 glasses of water a day.' },
          { start: 15, end: 30, text: 'Actually, the science says something different.' },
        ],
        music_segments: [],
        sound_effects: [],
        beat_grid: { beats: [] },
      },
    });
    expect(inferArchetype(spec)).toBe('myth');
  });
});

describe('inferPurpose', () => {
  it('detects "convert" from CTA with buy language', () => {
    const spec = createMinimalVideoSpec({
      narrative: {
        arc: {
          hook: { start: 0, end: 3, description: 'Hook' },
          escalation: { start: 3, end: 25, description: 'Body' },
          payoff: { start: 25, end: 30, description: 'CTA' },
        },
        cta: 'Sign up using the link in bio for a 20% discount!',
      },
    });
    expect(inferPurpose(spec)).toBe('convert');
  });

  it('detects "entertain" for music-only content', () => {
    const spec = createMinimalVideoSpec({
      audio: {
        transcript: [],
        music_segments: [{ start: 0, end: 30, background: false }],
        sound_effects: [],
        beat_grid: { beats: [] },
      },
    });
    expect(inferPurpose(spec)).toBe('entertain');
  });
});

describe('inferFormat', () => {
  it('returns "talking_head" for single-shot, speech-heavy video', () => {
    expect(inferFormat(talkingHeadSpec)).toBe('talking_head');
  });

  it('returns "reaction" for videos with multiple inserted content blocks', () => {
    expect(inferFormat(reactionSpec)).toBe('reaction');
  });

  it('returns "montage" for many-shot videos with montage format', () => {
    expect(inferFormat(compilationSpec)).toBe('montage');
  });

  it('returns "montage" for 3-shot silent video (no gap)', () => {
    const spec = createMinimalVideoSpec({
      timeline: {
        shots: [
          { id: 1, start: 0, end: 5 },
          { id: 2, start: 5, end: 10 },
          { id: 3, start: 10, end: 15 },
        ],
        pacing: {
          shot_count: 3,
          avg_shot_duration: 5,
          median_shot_duration: 5,
          fastest_shot_duration: 5,
          slowest_shot_duration: 5,
          classification: 'moderate',
        },
      },
      audio: { transcript: [], music_segments: [], sound_effects: [], beat_grid: { beats: [] } },
    });
    expect(inferFormat(spec)).toBe('montage');
  });

  it('returns "story" for 1-shot silent video', () => {
    const spec = createMinimalVideoSpec({
      audio: { transcript: [], music_segments: [], sound_effects: [], beat_grid: { beats: [] } },
    });
    expect(inferFormat(spec)).toBe('story');
  });
});

describe('hasRealSpeech', () => {
  it('returns false for empty transcript', () => {
    const spec = createMinimalVideoSpec({
      audio: { transcript: [], music_segments: [], sound_effects: [], beat_grid: { beats: [] } },
    });
    expect(hasRealSpeech(spec)).toBe(false);
  });

  it('returns false for hallucination-only transcript', () => {
    const spec = createMinimalVideoSpec({
      audio: {
        transcript: [
          { start: 0, end: 5, text: 'BLANK AUDIO' },
          { start: 5, end: 10, text: 'music' },
          { start: 10, end: 15, text: 'Thank you for watching' },
        ],
        music_segments: [],
        sound_effects: [],
        beat_grid: { beats: [] },
      },
    });
    expect(hasRealSpeech(spec)).toBe(false);
  });

  it('returns true for real speech mixed with hallucinations', () => {
    const spec = createMinimalVideoSpec({
      audio: {
        transcript: [
          { start: 0, end: 5, text: 'BLANK AUDIO' },
          { start: 5, end: 15, text: 'Today I want to show you something amazing.' },
        ],
        music_segments: [],
        sound_effects: [],
        beat_grid: { beats: [] },
      },
    });
    expect(hasRealSpeech(spec)).toBe(true);
  });

  it('does NOT filter real speech containing "you"', () => {
    const spec = createMinimalVideoSpec({
      audio: {
        transcript: [{ start: 0, end: 10, text: 'You need to try this recipe!' }],
        music_segments: [],
        sound_effects: [],
        beat_grid: { beats: [] },
      },
    });
    expect(hasRealSpeech(spec)).toBe(true);
  });

  it('filters bracketed labels like [Music]', () => {
    const spec = createMinimalVideoSpec({
      audio: {
        transcript: [{ start: 0, end: 10, text: '[Music]' }],
        music_segments: [],
        sound_effects: [],
        beat_grid: { beats: [] },
      },
    });
    expect(hasRealSpeech(spec)).toBe(false);
  });

  it('filters "music upbeat" hallucination pattern', () => {
    const spec = createMinimalVideoSpec({
      audio: {
        transcript: [{ start: 0, end: 10, text: 'music upbeat' }],
        music_segments: [],
        sound_effects: [],
        beat_grid: { beats: [] },
      },
    });
    expect(hasRealSpeech(spec)).toBe(false);
  });
});

describe('WHISPER_HALLUCINATION regex', () => {
  const cases: [string, boolean][] = [
    ['BLANK AUDIO', true],
    ['blank audio', true],
    ['music', true],
    ['music upbeat', true],
    ['music playing', true],
    ['[Music]', true],
    ['(music)', true],
    ['Thank you', true],
    ['Thank you for watching', true],
    ['Thanks for watching', true],
    ['subscribe', true],
    ['like and subscribe', true],
    ['...', true],
    ['  .  ', true],
    ['You need to try this', false],
    ['Today I want to show you something', false],
    ['Step 1 open your terminal', false],
    ['First always start early', false],
  ];

  for (const [text, shouldMatch] of cases) {
    it(`${shouldMatch ? 'filters' : 'keeps'}: "${text}"`, () => {
      expect(WHISPER_HALLUCINATION.test(text.trim())).toBe(shouldMatch);
    });
  }
});

describe('inferArchetype — fallback edge cases', () => {
  it('returns "montage" for 3-shot speechless video (no gap)', () => {
    const spec = createMinimalVideoSpec({
      timeline: {
        shots: [
          { id: 1, start: 0, end: 5 },
          { id: 2, start: 5, end: 10 },
          { id: 3, start: 10, end: 15 },
        ],
        pacing: {
          shot_count: 3,
          avg_shot_duration: 5,
          median_shot_duration: 5,
          fastest_shot_duration: 5,
          slowest_shot_duration: 5,
          classification: 'moderate',
        },
      },
      audio: { transcript: [], music_segments: [], sound_effects: [], beat_grid: { beats: [] } },
    });
    expect(inferArchetype(spec)).toBe('montage');
  });

  it('returns "montage" for 4-shot speechless video (no gap)', () => {
    const spec = createMinimalVideoSpec({
      timeline: {
        shots: [
          { id: 1, start: 0, end: 5 },
          { id: 2, start: 5, end: 10 },
          { id: 3, start: 10, end: 15 },
          { id: 4, start: 15, end: 20 },
        ],
        pacing: {
          shot_count: 4,
          avg_shot_duration: 5,
          median_shot_duration: 5,
          fastest_shot_duration: 5,
          slowest_shot_duration: 5,
          classification: 'moderate',
        },
      },
      audio: { transcript: [], music_segments: [], sound_effects: [], beat_grid: { beats: [] } },
    });
    expect(inferArchetype(spec)).toBe('montage');
  });

  it('returns "story" for 2-shot speechless video', () => {
    const spec = createMinimalVideoSpec({
      timeline: {
        shots: [
          { id: 1, start: 0, end: 15 },
          { id: 2, start: 15, end: 30 },
        ],
        pacing: {
          shot_count: 2,
          avg_shot_duration: 15,
          median_shot_duration: 15,
          fastest_shot_duration: 15,
          slowest_shot_duration: 15,
          classification: 'slow',
        },
      },
      audio: { transcript: [], music_segments: [], sound_effects: [], beat_grid: { beats: [] } },
    });
    expect(inferArchetype(spec)).toBe('story');
  });

  it('returns "story" for 1-shot speechless video', () => {
    const spec = createMinimalVideoSpec({
      audio: { transcript: [], music_segments: [], sound_effects: [], beat_grid: { beats: [] } },
    });
    expect(inferArchetype(spec)).toBe('story');
  });
});
