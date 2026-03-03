/**
 * Template SDK (Remotion)
 *
 * Stable, supported building blocks for Remotion code templates.
 *
 * This module is intended to be imported by template packs that provide their
 * own Remotion entrypoint/compositions (trusted code templates).
 *
 * Keep this surface area conservative: only export browser-safe utilities and
 * React components that do not rely on Node-only APIs.
 */

// Captions
export { Caption } from './captions/Caption';
export {
  CAPTION_STYLE_PRESETS,
  getCaptionPreset,
  getCaptionPresetWithOverrides,
  type CaptionPresetName,
} from './captions/presets';
export { mergeCaptionConfig, parseCaptionConfig, type CaptionConfig } from './captions/config';

// Visual layers and helpers
export {
  SceneBackground,
  HookClipLayer,
  LegacyClip,
  buildSequences,
  buildVisualTimeline,
  type VisualSequenceInfo,
} from './remotion/visuals';

// Audio + overlays
export { AudioLayers } from './remotion/AudioLayers';
export { ListBadges } from './remotion/ListBadges';
export { FontLoader } from './remotion/FontLoader';

// Built-in composition components (without registration)
export { ShortVideo } from './remotion/ShortVideo';
export { SplitScreenGameplay } from './remotion/SplitScreenGameplay';

// Layout helpers
export { computeSplitScreenLayout } from './remotion/split-screen-layout';
