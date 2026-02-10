/**
 * Style Resolver - DI-based style resolution
 */
import type { Archetype } from '../../core/config';
import type { Theme } from '../themes/types';
import type { ColorPalette } from '../presets/palette';
import type { TypographyPreset } from '../presets/typography';
import type { AnimationConfig } from '../presets/animation';
import type { ThemeCaptionPreset } from '../presets/caption';
import type { SafeZone } from '../tokens/safe-zone';
import type { ResolvedStyle, StyleOverrides } from './types';

/** Dependencies for style resolver */
export interface StyleResolverDeps {
  getTheme: (archetype: Archetype) => Theme;
  palettes: Record<string, ColorPalette>;
  typography: Record<string, TypographyPreset>;
  animations: Record<string, AnimationConfig>;
  captions: Record<string, ThemeCaptionPreset>;
  safeZones: Record<string, SafeZone>;
}

/** Create a style resolver with injected dependencies */
export function createStyleResolver(deps: StyleResolverDeps) {
  return function resolveStyle(
    archetype: Archetype,
    overrides: StyleOverrides = {}
  ): ResolvedStyle {
    const theme = deps.getTheme(archetype);

    // Resolve palette
    const basePalette = deps.palettes[theme.palette];
    if (!basePalette) {
      throw new Error(`Palette not found: ${theme.palette}`);
    }
    const palette: ColorPalette = overrides.palette
      ? { ...basePalette, ...overrides.palette }
      : basePalette;

    // Resolve typography
    const hookTypo = deps.typography[theme.typography.hook];
    const captionTypo = deps.typography[theme.typography.caption];
    if (!hookTypo || !captionTypo) {
      throw new Error(`Typography preset not found`);
    }
    const typography = {
      hook: overrides.typography ? { ...hookTypo, ...overrides.typography } : hookTypo,
      caption: overrides.typography ? { ...captionTypo, ...overrides.typography } : captionTypo,
    };

    // Resolve animation
    const animName = overrides.animation || theme.animation;
    const animation = deps.animations[animName];
    if (!animation) {
      throw new Error(`Animation not found: ${animName}`);
    }

    // Resolve safe zone
    const platformName = overrides.platform || theme.platform;
    const safeZone = deps.safeZones[platformName];
    if (!safeZone) {
      throw new Error(`Safe zone not found: ${platformName}`);
    }

    // Resolve caption preset
    const captionPreset = deps.captions[theme.caption];
    if (!captionPreset) {
      throw new Error(`Caption preset not found: ${theme.caption}`);
    }

    return {
      palette,
      typography,
      animation,
      safeZone,
      caption: {
        fontFamily: captionPreset.typography.fontFamily,
        fontSize: captionPreset.typography.fontSize,
        fontWeight: captionPreset.typography.fontWeight,
        color: palette.text,
        highlightColor: palette.highlight,
        strokeColor: palette.stroke,
        strokeWidth: captionPreset.strokeWidth,
        position: captionPreset.position,
        animation: animation.type,
      },
    };
  };
}
