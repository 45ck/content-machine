/**
 * Typography Presets Unit Tests
 *
 * TDD: RED phase - Write failing tests first
 */
import { describe, it, expect } from 'vitest';
import {
  TYPOGRAPHY_PRESETS,
  type TypographyPresetName,
  type TypographyPreset,
} from '../../../../src/render/presets/typography';
import { FONT_STACKS, FONT_SIZES, FONT_WEIGHTS } from '../../../../src/render/tokens/font';

describe('TYPOGRAPHY_PRESETS', () => {
  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(TYPOGRAPHY_PRESETS)).toBe(true);
  });

  it('should have all presets frozen', () => {
    Object.values(TYPOGRAPHY_PRESETS).forEach((preset) => {
      expect(Object.isFrozen(preset)).toBe(true);
    });
  });

  describe('hookBold', () => {
    it('should exist', () => {
      expect(TYPOGRAPHY_PRESETS.hookBold).toBeDefined();
    });

    it('should use impact font stack (Bebas Neue)', () => {
      expect(TYPOGRAPHY_PRESETS.hookBold.fontFamily).toBe(FONT_STACKS.impact);
    });

    it('should use 3xl size', () => {
      expect(TYPOGRAPHY_PRESETS.hookBold.fontSize).toBe(FONT_SIZES['3xl']);
    });

    it('should use black weight', () => {
      expect(TYPOGRAPHY_PRESETS.hookBold.fontWeight).toBe(FONT_WEIGHTS.black);
    });

    it('should have tight line height', () => {
      expect(TYPOGRAPHY_PRESETS.hookBold.lineHeight).toBe(1.1);
    });
  });

  describe('captionImpact', () => {
    it('should exist', () => {
      expect(TYPOGRAPHY_PRESETS.captionImpact).toBeDefined();
    });

    it('should use body font stack (Montserrat)', () => {
      expect(TYPOGRAPHY_PRESETS.captionImpact.fontFamily).toBe(FONT_STACKS.body);
    });

    it('should use xl size', () => {
      expect(TYPOGRAPHY_PRESETS.captionImpact.fontSize).toBe(FONT_SIZES.xl);
    });

    it('should use bold weight', () => {
      expect(TYPOGRAPHY_PRESETS.captionImpact.fontWeight).toBe(FONT_WEIGHTS.bold);
    });
  });

  describe('captionClean', () => {
    it('should exist', () => {
      expect(TYPOGRAPHY_PRESETS.captionClean).toBeDefined();
    });

    it('should use body font stack', () => {
      expect(TYPOGRAPHY_PRESETS.captionClean.fontFamily).toBe(FONT_STACKS.body);
    });

    it('should be smaller than captionImpact', () => {
      expect(TYPOGRAPHY_PRESETS.captionClean.fontSize).toBeLessThan(
        TYPOGRAPHY_PRESETS.captionImpact.fontSize
      );
    });

    it('should use semibold weight (lighter than impact)', () => {
      expect(TYPOGRAPHY_PRESETS.captionClean.fontWeight).toBe(FONT_WEIGHTS.semibold);
    });
  });

  describe('body', () => {
    it('should exist', () => {
      expect(TYPOGRAPHY_PRESETS.body).toBeDefined();
    });

    it('should use body font stack', () => {
      expect(TYPOGRAPHY_PRESETS.body.fontFamily).toBe(FONT_STACKS.body);
    });

    it('should use md size', () => {
      expect(TYPOGRAPHY_PRESETS.body.fontSize).toBe(FONT_SIZES.md);
    });

    it('should use normal weight', () => {
      expect(TYPOGRAPHY_PRESETS.body.fontWeight).toBe(FONT_WEIGHTS.normal);
    });

    it('should have comfortable line height', () => {
      expect(TYPOGRAPHY_PRESETS.body.lineHeight).toBe(1.5);
    });
  });

  describe('code', () => {
    it('should exist', () => {
      expect(TYPOGRAPHY_PRESETS.code).toBeDefined();
    });

    it('should use mono font stack', () => {
      expect(TYPOGRAPHY_PRESETS.code.fontFamily).toBe(FONT_STACKS.mono);
    });
  });

  it('should have correct type coverage', () => {
    const names: TypographyPresetName[] = [
      'hookBold',
      'captionImpact',
      'captionClean',
      'body',
      'code',
    ];
    names.forEach((name) => {
      expect(TYPOGRAPHY_PRESETS[name]).toBeDefined();
    });
  });

  it('should match TypographyPreset interface for all presets', () => {
    Object.values(TYPOGRAPHY_PRESETS).forEach((preset: TypographyPreset) => {
      expect(preset.fontFamily).toBeTypeOf('string');
      expect(preset.fontSize).toBeTypeOf('number');
      expect(preset.fontWeight).toBeTypeOf('number');
    });
  });
});
