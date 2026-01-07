/**
 * Visual Duration Helper
 *
 * Ensures visual scenes cover the full audio duration to prevent
 * the v3 bug where scenes ended at 20.32s but audio continued to 25.22s.
 *
 * @see docs/research/investigations/RQ-28-AUDIO-VISUAL-CAPTION-SYNC-20260610.md
 */

/**
 * Represents a visual scene in the video.
 */
export interface VisualScene {
  /** Start time in milliseconds */
  startMs: number;
  /** End time in milliseconds */
  endMs: number;
  /** Video URL (null for color-only scenes) */
  url: string | null;
  /** Optional background color for fallback scenes */
  backgroundColor?: string;
  /** Original video duration in ms (for looping calculation) */
  durationMs?: number;
}

export interface CoverageOptions {
  /** Fallback background color when no video available */
  fallbackColor?: string;
  /** Maximum extension ratio before looping (default: 1.5) */
  maxExtensionRatio?: number;
  /** Force use of fallback color instead of extending/looping video */
  useFallbackColor?: boolean;
}

/**
 * Calculates the gap between the end of visual scenes and the audio duration.
 *
 * @param scenes - Array of visual scenes
 * @param audioDurationMs - Total audio duration in milliseconds
 * @returns Gap in milliseconds (0 if fully covered, negative if exceeds)
 *
 * @example
 * ```ts
 * // Scenes end at 20320ms, audio is 25220ms
 * calculateVisualGap([{startMs: 0, endMs: 20320, url: 'video.mp4'}], 25220);
 * // => 4900 (4.9 seconds missing)
 * ```
 */
export function calculateVisualGap(scenes: VisualScene[], audioDurationMs: number): number {
  if (scenes.length === 0) {
    return audioDurationMs;
  }

  const lastScene = scenes[scenes.length - 1];
  return Math.max(0, audioDurationMs - lastScene.endMs);
}

/**
 * Ensures visual scenes cover the full audio duration.
 *
 * Strategies (in order of preference):
 * 1. If scenes already cover audio, return unchanged
 * 2. If fallbackColor is explicitly provided, add color scene for gap
 * 3. If gap is small (< 1.5x last scene), extend last scene
 * 4. If gap is large, loop the last video
 * 5. If no video available, add fallback color scene
 *
 * @param scenes - Original visual scenes
 * @param audioDurationMs - Target audio duration in milliseconds
 * @param options - Coverage options
 * @returns Modified scenes that cover the full duration
 *
 * @example
 * ```ts
 * // Fix the v3 gap: scenes end at 20.32s, audio is 25.22s
 * const fixed = ensureVisualCoverage(scenes, 25220);
 * // Last scene is now extended to 25220ms
 * ```
 */
export function ensureVisualCoverage(
  scenes: VisualScene[],
  audioDurationMs: number,
  options: CoverageOptions = {}
): VisualScene[] {
  const { fallbackColor = '#1a1a1a', maxExtensionRatio = 1.5 } = options;

  // Handle empty scenes
  if (scenes.length === 0) {
    return [
      {
        startMs: 0,
        endMs: audioDurationMs,
        url: null,
        backgroundColor: fallbackColor,
      },
    ];
  }

  // Handle zero audio duration
  if (audioDurationMs <= 0) {
    return scenes;
  }

  // Deep clone to avoid mutation
  const result: VisualScene[] = scenes.map((s) => ({ ...s }));

  // Check if scenes exceed audio (trim case)
  const lastScene = result[result.length - 1];
  if (lastScene.endMs > audioDurationMs) {
    lastScene.endMs = audioDurationMs;
    return result;
  }

  // Calculate gap
  const gap = calculateVisualGap(result, audioDurationMs);
  if (gap === 0) {
    return result;
  }

  // If fallbackColor is explicitly provided in options, use it for the gap
  if (options.fallbackColor !== undefined) {
    result.push({
      startMs: lastScene.endMs,
      endMs: audioDurationMs,
      url: null,
      backgroundColor: fallbackColor,
    });
    return result;
  }

  // Get last scene info
  const lastSceneDuration = lastScene.endMs - lastScene.startMs;
  const originalDuration = lastScene.durationMs || lastSceneDuration;

  // Strategy 1: Extend last scene if gap is reasonable (within extension ratio)
  if (lastScene.url && gap <= originalDuration * (maxExtensionRatio - 1)) {
    lastScene.endMs = audioDurationMs;
    return result;
  }

  // Strategy 2: Loop last video if available
  if (lastScene.url) {
    let currentEnd = lastScene.endMs;

    while (currentEnd < audioDurationMs) {
      const loopDuration = Math.min(originalDuration, audioDurationMs - currentEnd);
      result.push({
        startMs: currentEnd,
        endMs: currentEnd + loopDuration,
        url: lastScene.url,
        durationMs: originalDuration,
      });
      currentEnd += loopDuration;
    }

    return result;
  }

  // Strategy 3: Add fallback color scene (no video available)
  result.push({
    startMs: lastScene.endMs,
    endMs: audioDurationMs,
    url: null,
    backgroundColor: fallbackColor,
  });

  return result;
}

/**
 * Validates that scenes are contiguous (no gaps between them).
 *
 * @param scenes - Array of visual scenes
 * @returns True if scenes are contiguous
 */
export function areSceneContiguous(scenes: VisualScene[]): boolean {
  if (scenes.length <= 1) {
    return true;
  }

  for (let i = 1; i < scenes.length; i++) {
    if (scenes[i].startMs !== scenes[i - 1].endMs) {
      return false;
    }
  }

  return true;
}

/**
 * Calculates total coverage of scenes in milliseconds.
 *
 * @param scenes - Array of visual scenes
 * @returns Total covered duration in milliseconds
 */
export function calculateTotalCoverage(scenes: VisualScene[]): number {
  return scenes.reduce((total, scene) => total + (scene.endMs - scene.startMs), 0);
}
