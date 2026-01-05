/**
 * Animation Presets Unit Tests
 *
 * TDD: RED phase - Write failing tests first
 */
import { describe, it, expect } from 'vitest';
import {
  ANIMATION_TYPES,
  ANIMATION_PRESETS,
  type AnimationPresetName,
  type AnimationConfig,
} from '../../../../src/render/presets/animation';
import { EASING_CURVES, SPRING_CONFIGS } from '../../../../src/render/tokens';
import { TIMING_MS } from '../../../../src/render/tokens/timing';

describe('ANIMATION_TYPES', () => {
  it('should be an array of animation type strings', () => {
    expect(Array.isArray(ANIMATION_TYPES)).toBe(true);
  });

  it('should include core animation types', () => {
    expect(ANIMATION_TYPES).toContain('none');
    expect(ANIMATION_TYPES).toContain('pop');
    expect(ANIMATION_TYPES).toContain('bounce');
    expect(ANIMATION_TYPES).toContain('karaoke');
    expect(ANIMATION_TYPES).toContain('typewriter');
  });

  it('should include extended animation types', () => {
    expect(ANIMATION_TYPES).toContain('fade');
    expect(ANIMATION_TYPES).toContain('slideUp');
    expect(ANIMATION_TYPES).toContain('slideDown');
  });

  it('should have exactly 8 types', () => {
    expect(ANIMATION_TYPES).toHaveLength(8);
  });

  it('should be compatible with schema animation enum', () => {
    // These are the original schema types - they MUST exist
    const schemaTypes = ['none', 'pop', 'bounce', 'karaoke', 'typewriter'];
    schemaTypes.forEach((type) => {
      expect(ANIMATION_TYPES).toContain(type);
    });
  });
});

describe('ANIMATION_PRESETS', () => {
  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(ANIMATION_PRESETS)).toBe(true);
  });

  describe('none preset', () => {
    it('should have type none', () => {
      expect(ANIMATION_PRESETS.none.type).toBe('none');
    });

    it('should have zero duration', () => {
      expect(ANIMATION_PRESETS.none.duration).toBe(0);
    });

    it('should use linear easing', () => {
      expect(ANIMATION_PRESETS.none.easing).toBe(EASING_CURVES.linear);
    });
  });

  describe('pop preset', () => {
    it('should have type pop', () => {
      expect(ANIMATION_PRESETS.pop.type).toBe('pop');
    });

    it('should use wordPop timing from tokens', () => {
      expect(ANIMATION_PRESETS.pop.duration).toBe(TIMING_MS.wordPop);
    });

    it('should use punchyPop easing', () => {
      expect(ANIMATION_PRESETS.pop.easing).toBe(EASING_CURVES.punchyPop);
    });

    it('should have scale transform', () => {
      expect(ANIMATION_PRESETS.pop.scale).toEqual({ from: 1, to: 1.15 });
    });
  });

  describe('bounce preset', () => {
    it('should have type bounce', () => {
      expect(ANIMATION_PRESETS.bounce.type).toBe('bounce');
    });

    it('should use bouncy spring config', () => {
      expect(ANIMATION_PRESETS.bounce.spring).toEqual(SPRING_CONFIGS.bouncy);
    });

    it('should have larger scale than pop', () => {
      expect(ANIMATION_PRESETS.bounce.scale?.to).toBeGreaterThan(ANIMATION_PRESETS.pop.scale!.to);
    });
  });

  describe('karaoke preset', () => {
    it('should have type karaoke', () => {
      expect(ANIMATION_PRESETS.karaoke.type).toBe('karaoke');
    });

    it('should use highlightTransition timing', () => {
      expect(ANIMATION_PRESETS.karaoke.duration).toBe(TIMING_MS.highlightTransition);
    });
  });

  describe('typewriter preset', () => {
    it('should have type typewriter', () => {
      expect(ANIMATION_PRESETS.typewriter.type).toBe('typewriter');
    });

    it('should use micro timing', () => {
      expect(ANIMATION_PRESETS.typewriter.duration).toBe(TIMING_MS.micro);
    });
  });

  describe('fade preset', () => {
    it('should have type fade', () => {
      expect(ANIMATION_PRESETS.fade.type).toBe('fade');
    });

    it('should have opacity transform', () => {
      expect(ANIMATION_PRESETS.fade.opacity).toEqual({ from: 0, to: 1 });
    });
  });

  describe('slideUp preset', () => {
    it('should have type slideUp', () => {
      expect(ANIMATION_PRESETS.slideUp.type).toBe('slideUp');
    });

    it('should use titleEntrance timing', () => {
      expect(ANIMATION_PRESETS.slideUp.duration).toBe(TIMING_MS.titleEntrance);
    });

    it('should use snappy spring', () => {
      expect(ANIMATION_PRESETS.slideUp.spring).toEqual(SPRING_CONFIGS.snappy);
    });
  });

  describe('slideDown preset', () => {
    it('should have type slideDown', () => {
      expect(ANIMATION_PRESETS.slideDown.type).toBe('slideDown');
    });
  });

  it('should have preset for each animation type', () => {
    const presetNames = Object.keys(ANIMATION_PRESETS) as AnimationPresetName[];
    expect(presetNames).toHaveLength(ANIMATION_TYPES.length);

    ANIMATION_TYPES.forEach((type) => {
      expect(presetNames).toContain(type);
    });
  });

  it('should match AnimationConfig interface', () => {
    const config: AnimationConfig = ANIMATION_PRESETS.pop;
    expect(config.type).toBeDefined();
    expect(config.duration).toBeTypeOf('number');
    expect(config.easing).toBeTypeOf('string');
  });
});
