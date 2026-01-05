/**
 * Easing Curves - Primitive timing functions
 *
 * Source: docs/research/deep-dives/SHORT-FORM-VIDEO-TEMPLATES-TRENDS-20260105.md §1
 */

/** CSS cubic-bezier easing curves */
export const EASING_CURVES = Object.freeze({
  /**
   * Snap-settle: Fast attack, smooth deceleration
   * Use for: Word pops, element entrances
   * Source: Research §1 "easeOutExpo variant"
   */
  snapSettle: 'cubic-bezier(0.16, 1, 0.3, 1)',

  /**
   * Punchy pop: Slight overshoot for emphasis
   * Use for: Highlighted words, attention grabbers
   * Source: Research §1 "easeOutBack variant"
   */
  punchyPop: 'cubic-bezier(0.34, 1.56, 0.64, 1)',

  /**
   * Smooth glide: Gentle ease-in-out
   * Use for: Transitions, subtle movements
   */
  smoothGlide: 'cubic-bezier(0.4, 0, 0.2, 1)',

  /**
   * Linear: No easing
   * Use for: Progress bars, constant motion
   */
  linear: 'cubic-bezier(0, 0, 1, 1)',
} as const);

export type EasingCurveName = keyof typeof EASING_CURVES;

/** Spring configuration interface */
export interface SpringConfig {
  readonly damping: number;
  readonly stiffness: number;
  readonly mass: number;
}

/** Remotion spring configurations */
export const SPRING_CONFIGS = Object.freeze({
  /**
   * Snappy: Quick response with slight bounce
   * Source: Research §1 spring physics
   */
  snappy: Object.freeze({ damping: 15, stiffness: 200, mass: 1 } as SpringConfig),

  /**
   * Bouncy: More pronounced overshoot
   */
  bouncy: Object.freeze({ damping: 10, stiffness: 150, mass: 1 } as SpringConfig),

  /**
   * Gentle: Slow, smooth motion
   */
  gentle: Object.freeze({ damping: 20, stiffness: 100, mass: 1 } as SpringConfig),
} as const);

export type SpringConfigName = keyof typeof SPRING_CONFIGS;
