/**
 * Timing Values - Duration primitives in milliseconds
 *
 * Source: docs/research/deep-dives/SHORT-FORM-VIDEO-TEMPLATES-TRENDS-20260105.md §1
 */

/** Duration values in milliseconds */
export const TIMING_MS = Object.freeze({
  /**
   * Word pop animation duration
   * Source: Research §1 "70-130ms word pop"
   */
  wordPop: 100,

  /**
   * Title entrance animation
   * Source: Research §1 "200-350ms title entrance"
   */
  titleEntrance: 280,

  /**
   * Scene transition duration
   */
  sceneTransition: 400,

  /**
   * Highlight color transition
   */
  highlightTransition: 100,

  /**
   * Quick micro-interaction
   */
  micro: 50,
} as const);

export type TimingName = keyof typeof TIMING_MS;

/**
 * Convert milliseconds to frames at given FPS
 * @param ms - Duration in milliseconds
 * @param fps - Frames per second
 * @returns Number of frames (rounded)
 */
export function msToFrames(ms: number, fps: number): number {
  return Math.round((ms / 1000) * fps);
}

/**
 * Convert frames to milliseconds at given FPS
 * @param frames - Number of frames
 * @param fps - Frames per second
 * @returns Duration in milliseconds (rounded)
 */
export function framesToMs(frames: number, fps: number): number {
  return Math.round((frames / fps) * 1000);
}
