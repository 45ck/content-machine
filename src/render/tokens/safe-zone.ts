/**
 * Safe Zones - Platform-specific margin primitives
 *
 * Source: docs/research/deep-dives/SHORT-FORM-VIDEO-TEMPLATES-TRENDS-20260105.md §4
 */

export interface SafeZone {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly right: number;
}

/** Platform safe zones (in pixels for 1080x1920) */
export const SAFE_ZONES = Object.freeze({
  /**
   * TikTok safe zone
   * Source: Research §4 "top: 150, bottom: 270"
   * Validated: TikTok iOS app 2025
   */
  tiktok: Object.freeze({ top: 150, bottom: 270, left: 40, right: 40 } as SafeZone),

  /**
   * Instagram Reels safe zone (asymmetric)
   * Source: Research §4 "right: 120 asymmetric for icons"
   */
  reels: Object.freeze({ top: 120, bottom: 200, left: 40, right: 120 } as SafeZone),

  /**
   * YouTube Shorts safe zone
   * Source: Research §4
   */
  shorts: Object.freeze({ top: 100, bottom: 180, left: 40, right: 40 } as SafeZone),

  /**
   * Generic safe zone for multi-platform
   */
  universal: Object.freeze({ top: 150, bottom: 270, left: 40, right: 120 } as SafeZone),
} as const);

export type PlatformName = keyof typeof SAFE_ZONES;

/**
 * Get content-safe dimensions for a platform
 * @param platform - Target platform name
 * @param width - Canvas width (default 1080)
 * @param height - Canvas height (default 1920)
 * @returns Content bounds with x, y, width, height
 */
export function getContentBounds(
  platform: PlatformName,
  width: number = 1080,
  height: number = 1920
): { width: number; height: number; x: number; y: number } {
  const zone = SAFE_ZONES[platform];
  return {
    x: zone.left,
    y: zone.top,
    width: width - zone.left - zone.right,
    height: height - zone.top - zone.bottom,
  };
}
