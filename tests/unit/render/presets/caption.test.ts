/**
 * Caption Presets Unit Tests
 *
 * TDD: RED phase - Write failing tests first
 */
import { describe, it, expect } from 'vitest';
import {
  THEME_CAPTION_PRESETS,
  type ThemeCaptionPresetName,
  type ThemeCaptionPreset,
} from '../../../../src/render/presets/caption';
import { PALETTES } from '../../../../src/render/presets/palette';
import { TYPOGRAPHY_PRESETS } from '../../../../src/render/presets/typography';

describe('THEME_CAPTION_PRESETS', () => {
  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(THEME_CAPTION_PRESETS)).toBe(true);
  });

  it('should have all presets frozen', () => {
    Object.values(THEME_CAPTION_PRESETS).forEach((preset) => {
      expect(Object.isFrozen(preset)).toBe(true);
    });
  });

  describe('boldPop', () => {
    it('should exist', () => {
      expect(THEME_CAPTION_PRESETS.boldPop).toBeDefined();
    });

    it('should use captionImpact typography', () => {
      expect(THEME_CAPTION_PRESETS.boldPop.typography).toEqual(TYPOGRAPHY_PRESETS.captionImpact);
    });

    it('should use pop animation', () => {
      expect(THEME_CAPTION_PRESETS.boldPop.animation).toBe('pop');
    });

    it('should use futurePop palette colors', () => {
      expect(THEME_CAPTION_PRESETS.boldPop.colors.text).toBe(PALETTES.futurePop.text);
      expect(THEME_CAPTION_PRESETS.boldPop.colors.highlight).toBe(PALETTES.futurePop.highlight);
    });

    it('should be center positioned', () => {
      expect(THEME_CAPTION_PRESETS.boldPop.position).toBe('center');
    });

    it('should have strokeWidth of 3', () => {
      expect(THEME_CAPTION_PRESETS.boldPop.strokeWidth).toBe(3);
    });
  });

  describe('cleanKaraoke', () => {
    it('should exist', () => {
      expect(THEME_CAPTION_PRESETS.cleanKaraoke).toBeDefined();
    });

    it('should use captionClean typography', () => {
      expect(THEME_CAPTION_PRESETS.cleanKaraoke.typography).toEqual(
        TYPOGRAPHY_PRESETS.captionClean
      );
    });

    it('should use karaoke animation', () => {
      expect(THEME_CAPTION_PRESETS.cleanKaraoke.animation).toBe('karaoke');
    });

    it('should use cleanMinimal palette colors', () => {
      expect(THEME_CAPTION_PRESETS.cleanKaraoke.colors.text).toBe(PALETTES.cleanMinimal.text);
      expect(THEME_CAPTION_PRESETS.cleanKaraoke.colors.highlight).toBe(
        PALETTES.cleanMinimal.highlight
      );
    });

    it('should be bottom positioned', () => {
      expect(THEME_CAPTION_PRESETS.cleanKaraoke.position).toBe('bottom');
    });

    it('should have thinner strokeWidth of 2', () => {
      expect(THEME_CAPTION_PRESETS.cleanKaraoke.strokeWidth).toBe(2);
    });
  });

  describe('warmBounce', () => {
    it('should exist', () => {
      expect(THEME_CAPTION_PRESETS.warmBounce).toBeDefined();
    });

    it('should use captionImpact typography', () => {
      expect(THEME_CAPTION_PRESETS.warmBounce.typography).toEqual(TYPOGRAPHY_PRESETS.captionImpact);
    });

    it('should use bounce animation', () => {
      expect(THEME_CAPTION_PRESETS.warmBounce.animation).toBe('bounce');
    });

    it('should use earthyComfort palette colors', () => {
      expect(THEME_CAPTION_PRESETS.warmBounce.colors.text).toBe(PALETTES.earthyComfort.text);
      expect(THEME_CAPTION_PRESETS.warmBounce.colors.highlight).toBe(
        PALETTES.earthyComfort.highlight
      );
    });

    it('should be center positioned', () => {
      expect(THEME_CAPTION_PRESETS.warmBounce.position).toBe('center');
    });
  });

  describe('tikTokNative', () => {
    it('should exist', () => {
      expect(THEME_CAPTION_PRESETS.tikTokNative).toBeDefined();
    });

    it('should use captionImpact typography', () => {
      expect(THEME_CAPTION_PRESETS.tikTokNative.typography).toEqual(
        TYPOGRAPHY_PRESETS.captionImpact
      );
    });

    it('should use pop animation', () => {
      expect(THEME_CAPTION_PRESETS.tikTokNative.animation).toBe('pop');
    });

    it('should use tikTokNative palette colors', () => {
      expect(THEME_CAPTION_PRESETS.tikTokNative.colors.text).toBe(PALETTES.tikTokNative.text);
      expect(THEME_CAPTION_PRESETS.tikTokNative.colors.highlight).toBe(
        PALETTES.tikTokNative.highlight
      );
    });

    it('should be center positioned', () => {
      expect(THEME_CAPTION_PRESETS.tikTokNative.position).toBe('center');
    });
  });

  describe('fadeSubtle', () => {
    it('should exist', () => {
      expect(THEME_CAPTION_PRESETS.fadeSubtle).toBeDefined();
    });

    it('should use captionClean typography', () => {
      expect(THEME_CAPTION_PRESETS.fadeSubtle.typography).toEqual(TYPOGRAPHY_PRESETS.captionClean);
    });

    it('should use fade animation', () => {
      expect(THEME_CAPTION_PRESETS.fadeSubtle.animation).toBe('fade');
    });

    it('should be bottom positioned', () => {
      expect(THEME_CAPTION_PRESETS.fadeSubtle.position).toBe('bottom');
    });

    it('should have thin strokeWidth of 1', () => {
      expect(THEME_CAPTION_PRESETS.fadeSubtle.strokeWidth).toBe(1);
    });
  });

  describe('slideImpact', () => {
    it('should exist', () => {
      expect(THEME_CAPTION_PRESETS.slideImpact).toBeDefined();
    });

    it('should use hookBold typography for impact', () => {
      expect(THEME_CAPTION_PRESETS.slideImpact.typography).toEqual(TYPOGRAPHY_PRESETS.hookBold);
    });

    it('should use slideUp animation', () => {
      expect(THEME_CAPTION_PRESETS.slideImpact.animation).toBe('slideUp');
    });

    it('should be center positioned', () => {
      expect(THEME_CAPTION_PRESETS.slideImpact.position).toBe('center');
    });

    it('should have heavy strokeWidth of 4', () => {
      expect(THEME_CAPTION_PRESETS.slideImpact.strokeWidth).toBe(4);
    });
  });

  describe('typewriterCode', () => {
    it('should exist', () => {
      expect(THEME_CAPTION_PRESETS.typewriterCode).toBeDefined();
    });

    it('should use code typography', () => {
      expect(THEME_CAPTION_PRESETS.typewriterCode.typography).toEqual(TYPOGRAPHY_PRESETS.code);
    });

    it('should use typewriter animation', () => {
      expect(THEME_CAPTION_PRESETS.typewriterCode.animation).toBe('typewriter');
    });

    it('should be bottom positioned', () => {
      expect(THEME_CAPTION_PRESETS.typewriterCode.position).toBe('bottom');
    });

    it('should have no stroke (0)', () => {
      expect(THEME_CAPTION_PRESETS.typewriterCode.strokeWidth).toBe(0);
    });
  });

  it('should have correct type coverage', () => {
    const names: ThemeCaptionPresetName[] = [
      'boldPop',
      'cleanKaraoke',
      'warmBounce',
      'tikTokNative',
      'fadeSubtle',
      'slideImpact',
      'typewriterCode',
    ];
    names.forEach((name) => {
      expect(THEME_CAPTION_PRESETS[name]).toBeDefined();
    });
  });

  it('should match CaptionPreset interface for all presets', () => {
    Object.values(THEME_CAPTION_PRESETS).forEach((preset: ThemeCaptionPreset) => {
      expect(preset.typography).toBeDefined();
      expect(preset.colors).toBeDefined();
      expect(preset.colors.text).toBeTypeOf('string');
      expect(preset.colors.highlight).toBeTypeOf('string');
      expect(preset.colors.stroke).toBeTypeOf('string');
      expect(preset.animation).toBeTypeOf('string');
      expect(preset.strokeWidth).toBeTypeOf('number');
      expect(['top', 'center', 'bottom']).toContain(preset.position);
    });
  });
});
