/**
 * Tests for VideoBlueprint extraction logic.
 */
import { describe, it, expect } from 'vitest';
import {
  extractBlueprint,
  extractSceneSlots,
  extractPacingProfile,
  extractAudioProfile,
  extractNarrativeStructure,
  extractInsertedContentPattern,
} from './blueprint';
import { VideoBlueprintV1Schema, VIDEOBLUEPRINT_V1_VERSION } from '../domain';
import { classifyHeuristic } from './classify';
import {
  createMinimalVideoSpec,
  talkingHeadSpec,
  listicleSpec,
  reactionSpec,
  compilationSpec,
} from './test-fixtures';

function getTheme(spec: Parameters<typeof classifyHeuristic>[0]) {
  return classifyHeuristic(spec, 'test.v1.json');
}

describe('extractBlueprint', () => {
  it('produces valid VideoBlueprint.v1 for a talking-head video', () => {
    const theme = getTheme(talkingHeadSpec);
    const bp = extractBlueprint(talkingHeadSpec, theme, {
      sourceVideospecPath: 'talking-head.v1.json',
      sourceThemePath: 'talking-head.theme.json',
    });

    expect(bp.version).toBe(VIDEOBLUEPRINT_V1_VERSION);
    expect(bp.source_videospec).toBe('talking-head.v1.json');
    expect(bp.source_theme).toBe('talking-head.theme.json');
    expect(bp.scene_slots.length).toBeGreaterThan(0);

    const validation = VideoBlueprintV1Schema.safeParse(bp);
    expect(validation.success).toBe(true);
  });

  it('produces valid VideoBlueprint.v1 for a listicle', () => {
    const theme = getTheme(listicleSpec);
    const bp = extractBlueprint(listicleSpec, theme);

    expect(bp.archetype).toBe('listicle');
    expect(bp.scene_slots.length).toBe(5); // 5 shots in the listicle fixture
    expect(bp.narrative_structure.has_cta).toBe(true);
    expect(bp.pacing_profile.classification).toBe('moderate');

    const validation = VideoBlueprintV1Schema.safeParse(bp);
    expect(validation.success).toBe(true);
  });

  it('produces valid VideoBlueprint.v1 for a reaction video', () => {
    const theme = getTheme(reactionSpec);
    const bp = extractBlueprint(reactionSpec, theme);

    expect(bp.archetype).toBe('reaction');
    expect(bp.inserted_content_pattern.present).toBe(true);
    expect(bp.inserted_content_pattern.count).toBe(2);
    expect(bp.inserted_content_pattern.types).toContain('reddit_screenshot');

    const validation = VideoBlueprintV1Schema.safeParse(bp);
    expect(validation.success).toBe(true);
  });

  it('produces valid VideoBlueprint.v1 for a compilation', () => {
    const theme = getTheme(compilationSpec);
    const bp = extractBlueprint(compilationSpec, theme);

    expect(bp.scene_slots.length).toBe(25);
    expect(bp.audio_profile.has_music).toBe(true);
    expect(bp.audio_profile.has_voiceover).toBe(false);
    expect(bp.pacing_profile.classification).toBe('very_fast');

    const validation = VideoBlueprintV1Schema.safeParse(bp);
    expect(validation.success).toBe(true);
  });

  it('handles minimal/empty spec', () => {
    const minimal = createMinimalVideoSpec();
    const theme = getTheme(minimal);
    const bp = extractBlueprint(minimal, theme);

    expect(bp.version).toBe(VIDEOBLUEPRINT_V1_VERSION);
    expect(bp.scene_slots.length).toBe(1); // 1 shot in minimal spec

    const validation = VideoBlueprintV1Schema.safeParse(bp);
    expect(validation.success).toBe(true);
  });

  it('handles spec with no shots', () => {
    const noShots = createMinimalVideoSpec({
      timeline: {
        shots: [],
        pacing: {
          shot_count: 0,
          avg_shot_duration: 0,
          median_shot_duration: 0,
          fastest_shot_duration: 0,
          slowest_shot_duration: 0,
        },
      },
    });
    const theme = getTheme(noShots);
    const bp = extractBlueprint(noShots, theme);

    // Should produce at least a fallback slot
    expect(bp.scene_slots.length).toBe(1);

    const validation = VideoBlueprintV1Schema.safeParse(bp);
    expect(validation.success).toBe(true);
  });
});

describe('extractSceneSlots', () => {
  it('assigns hook role to the first shot', () => {
    const theme = getTheme(listicleSpec);
    const slots = extractSceneSlots(listicleSpec, theme);

    expect(slots[0].role).toBe('hook');
  });

  it('assigns cta role to the last shot when CTA exists', () => {
    const theme = getTheme(listicleSpec);
    const slots = extractSceneSlots(listicleSpec, theme);

    expect(slots[slots.length - 1].role).toBe('cta');
  });

  it('marks inserted_content visual type for shots overlapping inserted blocks', () => {
    const theme = getTheme(reactionSpec);
    const slots = extractSceneSlots(reactionSpec, theme);

    const insertedSlots = slots.filter((s) => s.visual_type === 'inserted_content');
    expect(insertedSlots.length).toBeGreaterThanOrEqual(1);
  });
});

describe('extractPacingProfile', () => {
  it('extracts correct pacing for compilation', () => {
    const profile = extractPacingProfile(compilationSpec);

    expect(profile.target_duration).toBe(30);
    expect(profile.avg_shot_duration).toBe(1.2);
    expect(profile.classification).toBe('very_fast');
    expect(profile.shot_count_range.min).toBeLessThan(profile.shot_count_range.max);
  });
});

describe('extractAudioProfile', () => {
  it('detects voiceover and speaker count', () => {
    const profile = extractAudioProfile(talkingHeadSpec);

    expect(profile.has_voiceover).toBe(true);
    expect(profile.speaker_count).toBe(1);
  });

  it('detects music and no voiceover for compilation', () => {
    const profile = extractAudioProfile(compilationSpec);

    expect(profile.has_voiceover).toBe(false);
    expect(profile.has_music).toBe(true);
    expect(profile.bpm).toBe(128);
  });

  it('returns has_voiceover=false when transcript is all Whisper hallucinations', () => {
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
    const profile = extractAudioProfile(spec);
    expect(profile.has_voiceover).toBe(false);
  });
});

describe('extractNarrativeStructure', () => {
  it('extracts hook duration and CTA presence', () => {
    const structure = extractNarrativeStructure(listicleSpec);

    expect(structure.hook_duration).toBe(5);
    expect(structure.has_cta).toBe(true);
    expect(structure.arc_type).toBe('listicle');
  });
});

describe('extractInsertedContentPattern', () => {
  it('extracts inserted content for reaction video', () => {
    const pattern = extractInsertedContentPattern(reactionSpec);

    expect(pattern.present).toBe(true);
    expect(pattern.count).toBe(2);
    expect(pattern.types).toEqual(['reddit_screenshot']);
  });

  it('reports no inserted content for talking head', () => {
    const pattern = extractInsertedContentPattern(talkingHeadSpec);

    expect(pattern.present).toBe(false);
    expect(pattern.count).toBeUndefined();
  });
});

describe('schema validation', () => {
  it('rejects invalid VideoBlueprint shapes', () => {
    const validation = VideoBlueprintV1Schema.safeParse({
      version: 'wrong',
      scene_slots: 'not-array',
    });
    expect(validation.success).toBe(false);
  });
});
