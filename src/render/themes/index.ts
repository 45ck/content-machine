/**
 * Theme Registry - Factory pattern for immutability
 */
import type { Theme } from './types';
import type { Archetype } from '../../core/config';
import { ARCHETYPE_THEME_DEFAULTS } from './defaults';

/** Built-in themes */
const BUILTIN_THEMES: Record<string, Theme> = {
  'bold-tech': {
    name: 'Bold Tech',
    description: 'High-energy tech content',
    palette: 'boldTech',
    typography: { hook: 'hookBold', caption: 'captionImpact' },
    animation: 'pop',
    caption: 'boldPop',
    platform: 'tiktok',
  },
  'clean-minimal': {
    name: 'Clean Minimal',
    description: 'Professional, understated',
    palette: 'cleanMinimal',
    typography: { hook: 'hookBold', caption: 'captionClean' },
    animation: 'karaoke',
    caption: 'cleanKaraoke',
    platform: 'universal',
  },
  'earthy-warm': {
    name: 'Earthy Warm',
    description: 'Soft, approachable feel',
    palette: 'earthyComfort',
    typography: { hook: 'hookBold', caption: 'captionImpact' },
    animation: 'bounce',
    caption: 'warmBounce',
    platform: 'tiktok',
  },
  'future-pop': {
    name: 'Future Pop',
    description: 'Trendy, digital-forward',
    palette: 'futurePop',
    typography: { hook: 'hookBold', caption: 'captionImpact' },
    animation: 'pop',
    caption: 'boldPop',
    platform: 'reels',
  },
  'tiktok-native': {
    name: 'TikTok Native',
    description: 'Authentic TikTok brand aesthetic',
    palette: 'tikTokNative',
    typography: { hook: 'hookBold', caption: 'captionImpact' },
    animation: 'pop',
    caption: 'tikTokNative',
    platform: 'tiktok',
  },
  'code-tutorial': {
    name: 'Code Tutorial',
    description: 'Technical content with typewriter effect',
    palette: 'boldTech',
    typography: { hook: 'hookBold', caption: 'code' },
    animation: 'typewriter',
    caption: 'typewriterCode',
    platform: 'universal',
  },
  'dramatic-slide': {
    name: 'Dramatic Slide',
    description: 'Impactful entrance animations for hooks',
    palette: 'futurePop',
    typography: { hook: 'hookBold', caption: 'captionImpact' },
    animation: 'slideUp',
    caption: 'slideImpact',
    platform: 'reels',
  },
};

/** Theme registry interface */
export interface ThemeRegistry {
  get(name: string): Theme | undefined;
  getForArchetype(archetype: Archetype): Theme;
  list(): string[];
  register(name: string, theme: Theme): ThemeRegistry;
}

/**
 * Create a theme registry (factory pattern)
 * Returns immutable registry - register returns new instance
 */
export function createThemeRegistry(
  themes: Record<string, Theme> = BUILTIN_THEMES,
  archetypeDefaults: Record<Archetype, string> = ARCHETYPE_THEME_DEFAULTS
): ThemeRegistry {
  const frozenThemes = Object.freeze({ ...themes });

  return {
    get(name: string): Theme | undefined {
      return frozenThemes[name];
    },

    getForArchetype(archetype: Archetype): Theme {
      const themeName = archetypeDefaults[archetype];
      const theme = frozenThemes[themeName];
      if (!theme) {
        throw new Error(`No theme found for archetype: ${archetype}`);
      }
      return theme;
    },

    list(): string[] {
      return Object.keys(frozenThemes);
    },

    register(name: string, theme: Theme): ThemeRegistry {
      return createThemeRegistry({ ...frozenThemes, [name]: theme }, archetypeDefaults);
    },
  };
}

/** Default registry instance */
export const defaultThemeRegistry = createThemeRegistry();

// Re-export types
export type { Theme } from './types';
