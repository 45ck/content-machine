/**
 * Animation Presets - Composed animation configurations
 *
 * THIS IS THE SINGLE SOURCE OF TRUTH FOR ANIMATION TYPES
 * schema.ts imports from here
 *
 * Source: docs/research/deep-dives/SHORT-FORM-VIDEO-TEMPLATES-TRENDS-20260105.md §1
 */
import { SPRING_CONFIGS, EASING_CURVES, type SpringConfig } from '../tokens';
import { TIMING_MS } from '../tokens/timing';

/** Animation type enum - SSoT for all animation references */
export const ANIMATION_TYPES = [
  'none',
  'pop',
  'bounce',
  'karaoke',
  'typewriter',
  'fade',
  'slideUp',
  'slideDown',
] as const;

export type AnimationType = (typeof ANIMATION_TYPES)[number];

/** Animation configuration */
export interface AnimationConfig {
  readonly type: AnimationType;
  readonly duration: number;
  readonly easing: string;
  readonly spring?: SpringConfig;
  readonly scale?: { from: number; to: number };
  readonly opacity?: { from: number; to: number };
}

/** Pre-built animation presets */
export const ANIMATION_PRESETS = Object.freeze({
  /** No animation */
  none: Object.freeze({
    type: 'none' as const,
    duration: 0,
    easing: EASING_CURVES.linear,
  }),

  /**
   * Pop: Quick scale burst
   * Source: Research §1 "70-130ms word pop"
   */
  pop: Object.freeze({
    type: 'pop' as const,
    duration: TIMING_MS.wordPop,
    easing: EASING_CURVES.punchyPop,
    scale: { from: 1, to: 1.15 },
  }),

  /**
   * Bounce: Spring-based pop with overshoot
   */
  bounce: Object.freeze({
    type: 'bounce' as const,
    duration: TIMING_MS.wordPop,
    easing: EASING_CURVES.snapSettle,
    spring: SPRING_CONFIGS.bouncy,
    scale: { from: 1, to: 1.2 },
  }),

  /**
   * Karaoke: Highlight progression
   */
  karaoke: Object.freeze({
    type: 'karaoke' as const,
    duration: TIMING_MS.highlightTransition,
    easing: EASING_CURVES.smoothGlide,
  }),

  /**
   * Typewriter: Character-by-character reveal
   */
  typewriter: Object.freeze({
    type: 'typewriter' as const,
    duration: TIMING_MS.micro,
    easing: EASING_CURVES.linear,
  }),

  /**
   * Fade: Opacity transition
   */
  fade: Object.freeze({
    type: 'fade' as const,
    duration: TIMING_MS.wordPop,
    easing: EASING_CURVES.smoothGlide,
    opacity: { from: 0, to: 1 },
  }),

  /**
   * Slide Up: Vertical entrance
   */
  slideUp: Object.freeze({
    type: 'slideUp' as const,
    duration: TIMING_MS.titleEntrance,
    easing: EASING_CURVES.snapSettle,
    spring: SPRING_CONFIGS.snappy,
  }),

  /**
   * Slide Down: Vertical exit
   */
  slideDown: Object.freeze({
    type: 'slideDown' as const,
    duration: TIMING_MS.titleEntrance,
    easing: EASING_CURVES.snapSettle,
  }),
} as const);

export type AnimationPresetName = keyof typeof ANIMATION_PRESETS;
