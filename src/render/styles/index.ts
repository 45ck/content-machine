/**
 * Styles - Re-exports and default resolver
 */
import { createStyleResolver, type StyleResolverDeps } from './resolver';
import { defaultThemeRegistry } from '../themes';
import { PALETTES } from '../presets/palette';
import { TYPOGRAPHY_PRESETS } from '../presets/typography';
import { ANIMATION_PRESETS } from '../presets/animation';
import { THEME_CAPTION_PRESETS } from '../presets/caption';
import { SAFE_ZONES } from '../tokens/safe-zone';

export * from './types';
export * from './resolver';

/** Default dependencies */
const defaultDeps: StyleResolverDeps = {
  getTheme: (archetype) => defaultThemeRegistry.getForArchetype(archetype),
  palettes: PALETTES,
  typography: TYPOGRAPHY_PRESETS,
  animations: ANIMATION_PRESETS,
  captions: THEME_CAPTION_PRESETS,
  safeZones: SAFE_ZONES,
};

/** Default style resolver */
export const resolveStyle = createStyleResolver(defaultDeps);
