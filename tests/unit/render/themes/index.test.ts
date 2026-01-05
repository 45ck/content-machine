/**
 * Theme Registry Unit Tests
 *
 * TDD: RED phase - Write failing tests first
 */
import { describe, it, expect } from 'vitest';
import { createThemeRegistry, defaultThemeRegistry } from '../../../../src/render/themes';
import type { Theme } from '../../../../src/render/themes/types';
import type { Archetype } from '../../../../src/core/config';

describe('createThemeRegistry', () => {
  describe('factory pattern', () => {
    it('should create a registry with default themes', () => {
      const registry = createThemeRegistry();
      expect(registry.list().length).toBeGreaterThan(0);
    });

    it('should create a registry with custom initial themes', () => {
      const customTheme: Theme = {
        name: 'Custom Theme',
        palette: 'cleanMinimal',
        typography: { hook: 'hookBold', caption: 'captionImpact' },
        animation: 'pop',
        caption: 'boldPop',
        platform: 'tiktok',
      };
      const registry = createThemeRegistry({ custom: customTheme });
      expect(registry.get('custom')).toEqual(customTheme);
      expect(registry.list()).toEqual(['custom']);
    });
  });

  describe('get', () => {
    it('should return theme by name', () => {
      const registry = createThemeRegistry();
      const theme = registry.get('bold-tech');
      expect(theme).toBeDefined();
      expect(theme?.name).toBe('Bold Tech');
    });

    it('should return undefined for non-existent theme', () => {
      const registry = createThemeRegistry();
      expect(registry.get('non-existent')).toBeUndefined();
    });
  });

  describe('getForArchetype', () => {
    it('should return theme for listicle archetype', () => {
      const registry = createThemeRegistry();
      const theme = registry.getForArchetype('listicle');
      expect(theme).toBeDefined();
      expect(theme.name).toBe('Bold Tech');
    });

    it('should return theme for versus archetype', () => {
      const registry = createThemeRegistry();
      const theme = registry.getForArchetype('versus');
      expect(theme).toBeDefined();
      expect(theme.name).toBe('Future Pop');
    });

    it('should return theme for howto archetype', () => {
      const registry = createThemeRegistry();
      const theme = registry.getForArchetype('howto');
      expect(theme).toBeDefined();
      expect(theme.name).toBe('Clean Minimal');
    });

    it('should return theme for myth archetype', () => {
      const registry = createThemeRegistry();
      const theme = registry.getForArchetype('myth');
      expect(theme).toBeDefined();
      expect(theme.name).toBe('Earthy Warm');
    });

    it('should return theme for story archetype', () => {
      const registry = createThemeRegistry();
      const theme = registry.getForArchetype('story');
      expect(theme).toBeDefined();
    });

    it('should return theme for hot-take archetype', () => {
      const registry = createThemeRegistry();
      const theme = registry.getForArchetype('hot-take');
      expect(theme).toBeDefined();
    });

    it('should throw for invalid archetype theme mapping', () => {
      // Create registry with empty themes
      const registry = createThemeRegistry({});
      expect(() => registry.getForArchetype('listicle')).toThrow();
    });
  });

  describe('list', () => {
    it('should return list of theme names', () => {
      const registry = createThemeRegistry();
      const names = registry.list();
      expect(names).toContain('bold-tech');
      expect(names).toContain('clean-minimal');
      expect(names).toContain('earthy-warm');
      expect(names).toContain('future-pop');
    });
  });

  describe('register (immutable)', () => {
    it('should return new registry with added theme', () => {
      const registry = createThemeRegistry();
      const newTheme: Theme = {
        name: 'New Theme',
        palette: 'tikTokNative',
        typography: { hook: 'hookBold', caption: 'captionClean' },
        animation: 'bounce',
        caption: 'warmBounce',
        platform: 'tiktok',
      };
      const newRegistry = registry.register('new-theme', newTheme);

      // New registry has the theme
      expect(newRegistry.get('new-theme')).toEqual(newTheme);

      // Original registry does NOT have the theme (immutable)
      expect(registry.get('new-theme')).toBeUndefined();
    });

    it('should preserve existing themes when registering', () => {
      const registry = createThemeRegistry();
      const originalThemes = registry.list();
      const newTheme: Theme = {
        name: 'New Theme',
        palette: 'tikTokNative',
        typography: { hook: 'hookBold', caption: 'captionClean' },
        animation: 'bounce',
        caption: 'warmBounce',
        platform: 'tiktok',
      };
      const newRegistry = registry.register('new-theme', newTheme);

      // All original themes still exist
      originalThemes.forEach((name) => {
        expect(newRegistry.get(name)).toBeDefined();
      });
    });

    it('should allow overwriting existing theme', () => {
      const registry = createThemeRegistry();
      const updatedTheme: Theme = {
        name: 'Updated Bold Tech',
        palette: 'futurePop',
        typography: { hook: 'hookBold', caption: 'captionImpact' },
        animation: 'pop',
        caption: 'boldPop',
        platform: 'reels',
      };
      const newRegistry = registry.register('bold-tech', updatedTheme);

      expect(newRegistry.get('bold-tech')?.name).toBe('Updated Bold Tech');
      expect(registry.get('bold-tech')?.name).toBe('Bold Tech'); // Original unchanged
    });
  });
});

describe('defaultThemeRegistry', () => {
  it('should be a valid registry instance', () => {
    expect(defaultThemeRegistry).toBeDefined();
    expect(typeof defaultThemeRegistry.get).toBe('function');
    expect(typeof defaultThemeRegistry.getForArchetype).toBe('function');
    expect(typeof defaultThemeRegistry.list).toBe('function');
    expect(typeof defaultThemeRegistry.register).toBe('function');
  });

  it('should have all built-in themes', () => {
    const themes = defaultThemeRegistry.list();
    expect(themes).toContain('bold-tech');
    expect(themes).toContain('clean-minimal');
    expect(themes).toContain('earthy-warm');
    expect(themes).toContain('future-pop');
    expect(themes).toContain('tiktok-native');
    expect(themes).toContain('code-tutorial');
    expect(themes).toContain('dramatic-slide');
    // Verify we have exactly 7 built-in themes
    expect(themes.length).toBe(7);
  });

  it('should return valid themes for all archetypes', () => {
    const archetypes: Archetype[] = ['listicle', 'versus', 'howto', 'myth', 'story', 'hot-take'];
    archetypes.forEach((archetype) => {
      const theme = defaultThemeRegistry.getForArchetype(archetype);
      expect(theme).toBeDefined();
      expect(theme.name).toBeDefined();
      expect(theme.palette).toBeDefined();
    });
  });
});

describe('Theme interface compliance', () => {
  it('should have all required properties', () => {
    const theme = defaultThemeRegistry.get('bold-tech');
    expect(theme).toBeDefined();
    expect(theme!.name).toBeTypeOf('string');
    expect(theme!.palette).toBeTypeOf('string');
    expect(theme!.typography).toBeDefined();
    expect(theme!.typography.hook).toBeTypeOf('string');
    expect(theme!.typography.caption).toBeTypeOf('string');
    expect(theme!.animation).toBeTypeOf('string');
    expect(theme!.caption).toBeTypeOf('string');
    expect(theme!.platform).toBeTypeOf('string');
  });

  it('should have optional description property', () => {
    const theme = defaultThemeRegistry.get('bold-tech');
    // description is optional, can be undefined or string
    expect(theme!.description === undefined || typeof theme!.description === 'string').toBe(true);
  });
});

describe('New themes with new caption presets', () => {
  describe('tiktok-native theme', () => {
    it('should use tikTokNative caption preset', () => {
      const theme = defaultThemeRegistry.get('tiktok-native');
      expect(theme).toBeDefined();
      expect(theme!.caption).toBe('tikTokNative');
    });

    it('should use tikTokNative palette', () => {
      const theme = defaultThemeRegistry.get('tiktok-native');
      expect(theme!.palette).toBe('tikTokNative');
    });

    it('should be optimized for tiktok platform', () => {
      const theme = defaultThemeRegistry.get('tiktok-native');
      expect(theme!.platform).toBe('tiktok');
    });
  });

  describe('code-tutorial theme', () => {
    it('should use typewriterCode caption preset', () => {
      const theme = defaultThemeRegistry.get('code-tutorial');
      expect(theme).toBeDefined();
      expect(theme!.caption).toBe('typewriterCode');
    });

    it('should use typewriter animation', () => {
      const theme = defaultThemeRegistry.get('code-tutorial');
      expect(theme!.animation).toBe('typewriter');
    });

    it('should use code typography for captions', () => {
      const theme = defaultThemeRegistry.get('code-tutorial');
      expect(theme!.typography.caption).toBe('code');
    });
  });

  describe('dramatic-slide theme', () => {
    it('should use slideImpact caption preset', () => {
      const theme = defaultThemeRegistry.get('dramatic-slide');
      expect(theme).toBeDefined();
      expect(theme!.caption).toBe('slideImpact');
    });

    it('should use slideUp animation', () => {
      const theme = defaultThemeRegistry.get('dramatic-slide');
      expect(theme!.animation).toBe('slideUp');
    });
  });
});
