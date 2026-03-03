/**
 * Theme Types
 */
import type { PaletteName } from '../presets/palette';
import type { TypographyPresetName } from '../presets/typography';
import type { AnimationPresetName } from '../presets/animation';
import type { ThemeCaptionPresetName } from '../presets/caption';
import type { PlatformName } from '../tokens/safe-zone';

/**
 * Theme definition
 *
 * @cmTerm theme
 */
export interface Theme {
  readonly name: string;
  readonly description?: string;
  readonly palette: PaletteName;
  readonly typography: {
    readonly hook: TypographyPresetName;
    readonly caption: TypographyPresetName;
  };
  readonly animation: AnimationPresetName;
  readonly caption: ThemeCaptionPresetName;
  readonly platform: PlatformName;
}
