/**
 * Render Style System Integration Tests
 *
 * Tests the complete integration of tokens, presets, themes, and resolver.
 */
import { describe, it, expect } from 'vitest';

// Import the complete style system
import { resolveStyle, createStyleResolver } from '../../../src/render/styles';
import { defaultThemeRegistry } from '../../../src/render/themes';
import { PALETTES } from '../../../src/render/presets/palette';
import { TYPOGRAPHY_PRESETS } from '../../../src/render/presets/typography';
import { ANIMATION_PRESETS, ANIMATION_TYPES } from '../../../src/render/presets/animation';
import { CAPTION_PRESETS } from '../../../src/render/presets/caption';
import { SAFE_ZONES } from '../../../src/render/tokens/safe-zone';
import { TIMING_MS, msToFrames } from '../../../src/render/tokens/timing';
import { SPRING_CONFIGS, EASING_CURVES } from '../../../src/render/tokens/easing';
import { CaptionStyleSchema } from '../../../src/render/schema';
import type { Archetype } from '../../../src/core/config';

describe('Style System Integration', () => {
  describe('end-to-end style resolution', () => {
    const archetypes: Archetype[] = ['listicle', 'versus', 'howto', 'myth', 'story', 'hot-take'];

    it('should resolve complete styles for all archetypes', () => {
      archetypes.forEach((archetype) => {
        const style = resolveStyle(archetype);

        // Verify all sections are present
        expect(style.palette).toBeDefined();
        expect(style.typography.hook).toBeDefined();
        expect(style.typography.caption).toBeDefined();
        expect(style.animation).toBeDefined();
        expect(style.safeZone).toBeDefined();
        expect(style.caption).toBeDefined();
      });
    });

    it('should produce valid caption props for Caption.tsx', () => {
      archetypes.forEach((archetype) => {
        const style = resolveStyle(archetype);

        // These are the exact props Caption.tsx needs
        expect(style.caption.fontFamily).toBeTypeOf('string');
        expect(style.caption.fontSize).toBeGreaterThan(0);
        expect(style.caption.fontWeight).toBeGreaterThan(0);
        expect(style.caption.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(style.caption.highlightColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(style.caption.strokeColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(style.caption.strokeWidth).toBeGreaterThanOrEqual(0);
        expect(['top', 'center', 'bottom']).toContain(style.caption.position);
        expect(ANIMATION_TYPES).toContain(style.caption.animation);
      });
    });
  });

  describe('schema compatibility', () => {
    it('should have all animation types supported by schema', () => {
      // The schema should accept all ANIMATION_TYPES
      ANIMATION_TYPES.forEach((animType) => {
        const result = CaptionStyleSchema.shape.animation.safeParse(animType);
        expect(result.success).toBe(true);
      });
    });

    it('should use ANIMATION_TYPES as the single source of truth', () => {
      // Verify the schema's animation enum matches our SSoT
      // For z.enum() with .default(), we need to access innerType first
      const animationField = CaptionStyleSchema.shape.animation;
      // Get the underlying enum options - handle both with and without .default()
      const schemaAnimations = animationField._def.innerType?.options ?? animationField.options;
      expect(schemaAnimations).toEqual([...ANIMATION_TYPES]);
    });
  });

  describe('token → preset → theme → resolver flow', () => {
    it('should trace values from tokens through to resolved style', () => {
      const style = resolveStyle('listicle');

      // Verify timing values come from tokens
      const expectedPopDuration = TIMING_MS.wordPop;
      expect(style.animation.duration).toBe(expectedPopDuration);

      // Verify easing comes from tokens
      expect(Object.values(EASING_CURVES)).toContain(style.animation.easing);
    });

    it('should use typography presets correctly', () => {
      const style = resolveStyle('listicle');

      // The hookBold preset uses FONT_STACKS.impact (Bebas Neue)
      expect(style.typography.hook.fontFamily).toContain('Bebas Neue');
    });

    it('should use palette colors for captions', () => {
      const style = resolveStyle('listicle');

      // Caption colors should match palette
      expect(style.caption.color).toBe(style.palette.text);
      expect(style.caption.highlightColor).toBe(style.palette.highlight);
    });
  });

  describe('custom theme registration', () => {
    it('should allow extending with custom themes', () => {
      const customTheme = {
        name: 'Custom Neon',
        description: 'High contrast neon',
        palette: 'tikTokNative' as const,
        typography: { hook: 'hookBold' as const, caption: 'captionImpact' as const },
        animation: 'bounce' as const,
        caption: 'warmBounce' as const,
        platform: 'reels' as const,
      };

      // Create extended registry
      const extendedRegistry = defaultThemeRegistry.register('custom-neon', customTheme);

      // Verify original registry unchanged (immutability)
      expect(defaultThemeRegistry.get('custom-neon')).toBeUndefined();

      // Verify new registry has the theme
      expect(extendedRegistry.get('custom-neon')).toEqual(customTheme);

      // Verify custom theme can be used with resolver
      const resolver = createStyleResolver({
        getTheme: (archetype) =>
          archetype === 'listicle'
            ? extendedRegistry.get('custom-neon')!
            : defaultThemeRegistry.getForArchetype(archetype),
        palettes: PALETTES,
        typography: TYPOGRAPHY_PRESETS,
        animations: ANIMATION_PRESETS,
        captions: CAPTION_PRESETS,
        safeZones: SAFE_ZONES,
      });

      const style = resolver('listicle');
      expect(style.palette).toEqual(PALETTES.tikTokNative);
      expect(style.animation.type).toBe('bounce');
    });
  });

  describe('research-backed values verification', () => {
    it('should use 100ms word pop timing (within 70-130ms research range)', () => {
      expect(TIMING_MS.wordPop).toBe(100);
      expect(TIMING_MS.wordPop).toBeGreaterThanOrEqual(70);
      expect(TIMING_MS.wordPop).toBeLessThanOrEqual(130);
    });

    it('should use 280ms title entrance (within 200-350ms research range)', () => {
      expect(TIMING_MS.titleEntrance).toBe(280);
      expect(TIMING_MS.titleEntrance).toBeGreaterThanOrEqual(200);
      expect(TIMING_MS.titleEntrance).toBeLessThanOrEqual(350);
    });

    it('should have snapSettle easing matching research', () => {
      expect(EASING_CURVES.snapSettle).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
    });

    it('should have punchyPop easing matching research', () => {
      expect(EASING_CURVES.punchyPop).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)');
    });

    it('should have TikTok safe zones matching research', () => {
      expect(SAFE_ZONES.tiktok.top).toBe(150);
      expect(SAFE_ZONES.tiktok.bottom).toBe(270);
    });

    it('should have Reels asymmetric right margin matching research', () => {
      expect(SAFE_ZONES.reels.right).toBe(120);
      expect(SAFE_ZONES.reels.right).toBeGreaterThan(SAFE_ZONES.reels.left);
    });
  });

  describe('animation preset calculations', () => {
    it('should have pop animation with correct scale', () => {
      expect(ANIMATION_PRESETS.pop.scale).toEqual({ from: 1, to: 1.15 });
    });

    it('should have bounce animation with spring config', () => {
      expect(ANIMATION_PRESETS.bounce.spring).toEqual(SPRING_CONFIGS.bouncy);
    });

    it('should calculate correct frame durations at 30fps', () => {
      // 100ms at 30fps = 3 frames
      expect(msToFrames(100, 30)).toBe(3);

      // 280ms at 30fps = 8.4 → 8 frames
      expect(msToFrames(280, 30)).toBe(8);
    });

    it('should calculate correct frame durations at 60fps', () => {
      // 100ms at 60fps = 6 frames
      expect(msToFrames(100, 60)).toBe(6);
    });
  });

  describe('style override merging', () => {
    it('should merge palette overrides while preserving other palette values', () => {
      const style = resolveStyle('listicle', {
        palette: { highlight: '#FF0000' },
      });

      expect(style.palette.highlight).toBe('#FF0000');
      // Other values should remain from theme
      expect(style.palette.primary).toBeDefined();
      expect(style.palette.text).toBe('#FFFFFF');
    });

    it('should apply platform override to change safe zones', () => {
      const tiktokStyle = resolveStyle('listicle', { platform: 'tiktok' });
      const reelsStyle = resolveStyle('listicle', { platform: 'reels' });

      expect(tiktokStyle.safeZone).toEqual(SAFE_ZONES.tiktok);
      expect(reelsStyle.safeZone).toEqual(SAFE_ZONES.reels);

      // Reels should have asymmetric right margin
      expect(reelsStyle.safeZone.right).toBeGreaterThan(tiktokStyle.safeZone.right);
    });

    it('should apply animation override', () => {
      const popStyle = resolveStyle('listicle', { animation: 'pop' });
      const bounceStyle = resolveStyle('listicle', { animation: 'bounce' });

      expect(popStyle.animation.type).toBe('pop');
      expect(bounceStyle.animation.type).toBe('bounce');
      expect(bounceStyle.animation.spring).toBeDefined();
    });
  });
});

describe('Caption component compatibility', () => {
  it('should provide all values needed for Caption.tsx DEFAULT_STYLE', () => {
    const style = resolveStyle('listicle');

    // Caption.tsx DEFAULT_STYLE structure
    const captionStyle = {
      fontFamily: style.caption.fontFamily,
      fontSize: style.caption.fontSize,
      fontWeight: style.caption.fontWeight === 900 ? '900' : 'bold',
      color: style.caption.color,
      highlightColor: style.caption.highlightColor,
      highlightCurrentWord: true, // Fixed value
      strokeColor: style.caption.strokeColor,
      strokeWidth: style.caption.strokeWidth,
      position: style.caption.position,
      animation: style.caption.animation,
    };

    // Validate against schema
    const result = CaptionStyleSchema.safeParse(captionStyle);
    expect(result.success).toBe(true);
  });

  it('should provide valid animation config for Word component', () => {
    const style = resolveStyle('listicle');
    const anim = style.animation;

    // Word component needs these for animation
    expect(anim.type).toBeTypeOf('string');
    expect(anim.duration).toBeTypeOf('number');
    expect(anim.easing).toBeTypeOf('string');

    // Pop animation needs scale
    if (anim.type === 'pop') {
      expect(anim.scale).toBeDefined();
    }

    // Bounce animation needs spring
    if (anim.type === 'bounce') {
      expect(anim.spring).toBeDefined();
    }
  });
});
