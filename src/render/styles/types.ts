/**
 * Style System Types
 */
import type { ColorPalette } from '../presets/palette';
import type { TypographyPreset } from '../presets/typography';
import type { AnimationConfig } from '../presets/animation';
import type { SafeZone } from '../tokens/safe-zone';

/** Style overrides from user/config */
export interface StyleOverrides {
  palette?: Partial<ColorPalette>;
  typography?: Partial<TypographyPreset>;
  animation?: string;
  platform?: string;
}

/** Fully resolved style (no references, all values) */
export interface ResolvedStyle {
  readonly palette: ColorPalette;
  readonly typography: {
    readonly hook: TypographyPreset;
    readonly caption: TypographyPreset;
  };
  readonly animation: AnimationConfig;
  readonly safeZone: SafeZone;
  readonly caption: {
    readonly fontFamily: string;
    readonly fontSize: number;
    readonly fontWeight: number;
    readonly color: string;
    readonly highlightColor: string;
    readonly strokeColor: string;
    readonly strokeWidth: number;
    readonly position: 'top' | 'center' | 'bottom';
    readonly animation: string;
  };
}
