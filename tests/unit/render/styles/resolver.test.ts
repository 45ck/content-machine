/**
 * Style Resolver Unit Tests
 *
 * TDD: RED phase - Write failing tests first
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import {
  createStyleResolver,
  resolveStyle,
  type StyleResolverDeps,
  type ResolvedStyle,
  type StyleOverrides,
} from '../../../../src/render/styles';
import { type Theme } from '../../../../src/render/themes';
import { PALETTES } from '../../../../src/render/presets/palette';
import { TYPOGRAPHY_PRESETS } from '../../../../src/render/presets/typography';
import { ANIMATION_PRESETS } from '../../../../src/render/presets/animation';
import { CAPTION_PRESETS } from '../../../../src/render/presets/caption';
import { SAFE_ZONES } from '../../../../src/render/tokens/safe-zone';
import type { Archetype } from '../../../../src/core/config';

describe('createStyleResolver', () => {
  describe('dependency injection', () => {
    it('should create resolver with custom dependencies', () => {
      const mockTheme: Theme = {
        name: 'Mock Theme',
        palette: 'cleanMinimal',
        typography: { hook: 'hookBold', caption: 'captionImpact' },
        animation: 'pop',
        caption: 'boldPop',
        platform: 'tiktok',
      };
      const mockGetTheme = vi.fn().mockReturnValue(mockTheme);
      const deps: StyleResolverDeps = {
        getTheme: mockGetTheme,
        palettes: PALETTES,
        typography: TYPOGRAPHY_PRESETS,
        animations: ANIMATION_PRESETS,
        captions: CAPTION_PRESETS,
        safeZones: SAFE_ZONES,
      };

      const resolve = createStyleResolver(deps);
      const style = resolve('listicle');

      expect(mockGetTheme).toHaveBeenCalledWith('listicle');
      expect(style).toBeDefined();
    });

    it('should use injected palettes', () => {
      const customPalettes = {
        ...PALETTES,
        customPalette: {
          primary: '#FF0000',
          secondary: '#00FF00',
          accent: '#0000FF',
          background: '#000000',
          text: '#FFFFFF',
          textMuted: '#888888',
          highlight: '#FFFF00',
          stroke: '#111111',
        },
      };
      const mockTheme: Theme = {
        name: 'Custom',
        palette: 'customPalette' as 'cleanMinimal', // Type hack for test
        typography: { hook: 'hookBold', caption: 'captionImpact' },
        animation: 'pop',
        caption: 'boldPop',
        platform: 'tiktok',
      };
      const deps: StyleResolverDeps = {
        getTheme: () => mockTheme,
        palettes: customPalettes as typeof PALETTES,
        typography: TYPOGRAPHY_PRESETS,
        animations: ANIMATION_PRESETS,
        captions: CAPTION_PRESETS,
        safeZones: SAFE_ZONES,
      };

      const resolve = createStyleResolver(deps);
      const style = resolve('listicle');

      expect(style.palette.primary).toBe('#FF0000');
    });
  });

  describe('error handling', () => {
    it('should throw for missing palette', () => {
      const mockTheme: Theme = {
        name: 'Bad Theme',
        palette: 'nonexistent' as 'cleanMinimal',
        typography: { hook: 'hookBold', caption: 'captionImpact' },
        animation: 'pop',
        caption: 'boldPop',
        platform: 'tiktok',
      };
      const deps: StyleResolverDeps = {
        getTheme: () => mockTheme,
        palettes: {},
        typography: TYPOGRAPHY_PRESETS,
        animations: ANIMATION_PRESETS,
        captions: CAPTION_PRESETS,
        safeZones: SAFE_ZONES,
      };

      const resolve = createStyleResolver(deps);
      expect(() => resolve('listicle')).toThrow('Palette not found');
    });

    it('should throw for missing typography preset', () => {
      const mockTheme: Theme = {
        name: 'Bad Theme',
        palette: 'cleanMinimal',
        typography: { hook: 'nonexistent' as 'hookBold', caption: 'captionImpact' },
        animation: 'pop',
        caption: 'boldPop',
        platform: 'tiktok',
      };
      const deps: StyleResolverDeps = {
        getTheme: () => mockTheme,
        palettes: PALETTES,
        typography: {},
        animations: ANIMATION_PRESETS,
        captions: CAPTION_PRESETS,
        safeZones: SAFE_ZONES,
      };

      const resolve = createStyleResolver(deps);
      expect(() => resolve('listicle')).toThrow('Typography preset not found');
    });

    it('should throw for missing animation preset', () => {
      const mockTheme: Theme = {
        name: 'Bad Theme',
        palette: 'cleanMinimal',
        typography: { hook: 'hookBold', caption: 'captionImpact' },
        animation: 'nonexistent' as 'pop',
        caption: 'boldPop',
        platform: 'tiktok',
      };
      const deps: StyleResolverDeps = {
        getTheme: () => mockTheme,
        palettes: PALETTES,
        typography: TYPOGRAPHY_PRESETS,
        animations: {},
        captions: CAPTION_PRESETS,
        safeZones: SAFE_ZONES,
      };

      const resolve = createStyleResolver(deps);
      expect(() => resolve('listicle')).toThrow('Animation not found');
    });

    it('should throw for missing safe zone', () => {
      const mockTheme: Theme = {
        name: 'Bad Theme',
        palette: 'cleanMinimal',
        typography: { hook: 'hookBold', caption: 'captionImpact' },
        animation: 'pop',
        caption: 'boldPop',
        platform: 'nonexistent' as 'tiktok',
      };
      const deps: StyleResolverDeps = {
        getTheme: () => mockTheme,
        palettes: PALETTES,
        typography: TYPOGRAPHY_PRESETS,
        animations: ANIMATION_PRESETS,
        captions: CAPTION_PRESETS,
        safeZones: {},
      };

      const resolve = createStyleResolver(deps);
      expect(() => resolve('listicle')).toThrow('Safe zone not found');
    });

    it('should throw for missing caption preset', () => {
      const mockTheme: Theme = {
        name: 'Bad Theme',
        palette: 'cleanMinimal',
        typography: { hook: 'hookBold', caption: 'captionImpact' },
        animation: 'pop',
        caption: 'nonexistent' as 'boldPop',
        platform: 'tiktok',
      };
      const deps: StyleResolverDeps = {
        getTheme: () => mockTheme,
        palettes: PALETTES,
        typography: TYPOGRAPHY_PRESETS,
        animations: ANIMATION_PRESETS,
        captions: {},
        safeZones: SAFE_ZONES,
      };

      const resolve = createStyleResolver(deps);
      expect(() => resolve('listicle')).toThrow('Caption preset not found');
    });
  });
});

describe('resolveStyle (default resolver)', () => {
  describe('basic resolution', () => {
    it('should resolve style for listicle archetype', () => {
      const style = resolveStyle('listicle');
      expect(style).toBeDefined();
      expect(style.palette).toBeDefined();
      expect(style.typography).toBeDefined();
      expect(style.animation).toBeDefined();
      expect(style.safeZone).toBeDefined();
      expect(style.caption).toBeDefined();
    });

    it('should resolve style for all archetypes', () => {
      const archetypes: Archetype[] = ['listicle', 'versus', 'howto', 'myth', 'story', 'hot-take'];
      archetypes.forEach((archetype) => {
        const style = resolveStyle(archetype);
        expect(style).toBeDefined();
      });
    });
  });

  describe('ResolvedStyle structure', () => {
    let style: ResolvedStyle;

    beforeAll(() => {
      style = resolveStyle('listicle');
    });

    it('should have complete palette', () => {
      expect(style.palette.primary).toBeTypeOf('string');
      expect(style.palette.secondary).toBeTypeOf('string');
      expect(style.palette.accent).toBeTypeOf('string');
      expect(style.palette.background).toBeTypeOf('string');
      expect(style.palette.text).toBeTypeOf('string');
      expect(style.palette.textMuted).toBeTypeOf('string');
      expect(style.palette.highlight).toBeTypeOf('string');
      expect(style.palette.stroke).toBeTypeOf('string');
    });

    it('should have hook and caption typography', () => {
      expect(style.typography.hook).toBeDefined();
      expect(style.typography.hook.fontFamily).toBeTypeOf('string');
      expect(style.typography.hook.fontSize).toBeTypeOf('number');
      expect(style.typography.hook.fontWeight).toBeTypeOf('number');

      expect(style.typography.caption).toBeDefined();
      expect(style.typography.caption.fontFamily).toBeTypeOf('string');
    });

    it('should have animation config', () => {
      expect(style.animation.type).toBeTypeOf('string');
      expect(style.animation.duration).toBeTypeOf('number');
      expect(style.animation.easing).toBeTypeOf('string');
    });

    it('should have safe zone', () => {
      expect(style.safeZone.top).toBeTypeOf('number');
      expect(style.safeZone.bottom).toBeTypeOf('number');
      expect(style.safeZone.left).toBeTypeOf('number');
      expect(style.safeZone.right).toBeTypeOf('number');
    });

    it('should have caption style', () => {
      expect(style.caption.fontFamily).toBeTypeOf('string');
      expect(style.caption.fontSize).toBeTypeOf('number');
      expect(style.caption.fontWeight).toBeTypeOf('number');
      expect(style.caption.color).toBeTypeOf('string');
      expect(style.caption.highlightColor).toBeTypeOf('string');
      expect(style.caption.strokeColor).toBeTypeOf('string');
      expect(style.caption.strokeWidth).toBeTypeOf('number');
      expect(style.caption.position).toBeTypeOf('string');
      expect(style.caption.animation).toBeTypeOf('string');
    });
  });

  describe('overrides', () => {
    it('should apply palette overrides', () => {
      const overrides: StyleOverrides = {
        palette: { primary: '#FF0000' },
      };
      const style = resolveStyle('listicle', overrides);
      expect(style.palette.primary).toBe('#FF0000');
      // Other palette values should remain from theme
      expect(style.palette.secondary).toBeDefined();
    });

    it('should apply typography overrides', () => {
      const overrides: StyleOverrides = {
        typography: { fontSize: 72 },
      };
      const style = resolveStyle('listicle', overrides);
      expect(style.typography.hook.fontSize).toBe(72);
      expect(style.typography.caption.fontSize).toBe(72);
    });

    it('should apply animation override', () => {
      const overrides: StyleOverrides = {
        animation: 'bounce',
      };
      const style = resolveStyle('listicle', overrides);
      expect(style.animation.type).toBe('bounce');
    });

    it('should apply platform override', () => {
      const overrides: StyleOverrides = {
        platform: 'reels',
      };
      const style = resolveStyle('listicle', overrides);
      expect(style.safeZone).toEqual(SAFE_ZONES.reels);
    });

    it('should apply multiple overrides', () => {
      const overrides: StyleOverrides = {
        palette: { highlight: '#00FF00' },
        animation: 'fade',
        platform: 'shorts',
      };
      const style = resolveStyle('listicle', overrides);
      expect(style.palette.highlight).toBe('#00FF00');
      expect(style.animation.type).toBe('fade');
      expect(style.safeZone).toEqual(SAFE_ZONES.shorts);
    });

    it('should not modify original when no overrides', () => {
      const style1 = resolveStyle('listicle');
      const style2 = resolveStyle('listicle', {});
      expect(style1.palette.primary).toBe(style2.palette.primary);
    });
  });
});

describe('ResolvedStyle for Caption component', () => {
  it('should provide all props needed by Caption.tsx', () => {
    const style = resolveStyle('listicle');

    // Caption component needs these from resolved style
    expect(style.caption.fontFamily).toBeDefined();
    expect(style.caption.fontSize).toBeDefined();
    expect(style.caption.fontWeight).toBeDefined();
    expect(style.caption.color).toBeDefined();
    expect(style.caption.highlightColor).toBeDefined();
    expect(style.caption.strokeColor).toBeDefined();
    expect(style.caption.strokeWidth).toBeDefined();
    expect(style.caption.position).toBeDefined();
    expect(style.caption.animation).toBeDefined();
  });

  it('should have caption colors from resolved palette', () => {
    const style = resolveStyle('listicle');
    // Caption text color should match palette.text
    expect(style.caption.color).toBe(style.palette.text);
    // Caption highlight should match palette.highlight
    expect(style.caption.highlightColor).toBe(style.palette.highlight);
  });
});
