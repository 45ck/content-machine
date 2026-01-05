/**
 * Theme Types
 */
import type { PaletteName } from '../presets/palette';
import type { TypographyPresetName } from '../presets/typography';
import type { AnimationPresetName } from '../presets/animation';
import type { CaptionPresetName } from '../presets/caption';
import type { PlatformName } from '../tokens/safe-zone';

/** Theme definition */
export interface Theme {
  readonly name: string;
  readonly description?: string;
  readonly palette: PaletteName;
  readonly typography: {
    readonly hook: TypographyPresetName;
    readonly caption: TypographyPresetName;
  };
  readonly animation: AnimationPresetName;
  readonly caption: CaptionPresetName;
  readonly platform: PlatformName;
}
