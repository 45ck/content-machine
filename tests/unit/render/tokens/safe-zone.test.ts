/**
 * Safe Zone Tokens Unit Tests
 *
 * TDD: RED phase - Write failing tests first
 */
import { describe, it, expect } from 'vitest';
import {
  SAFE_ZONES,
  getContentBounds,
  type PlatformName,
  type SafeZone,
} from '../../../../src/render/tokens/safe-zone';

describe('SAFE_ZONES', () => {
  describe('tiktok', () => {
    it('should have correct values per research', () => {
      expect(SAFE_ZONES.tiktok).toEqual({
        top: 150,
        bottom: 270,
        left: 40,
        right: 40,
      });
    });
  });

  describe('reels (asymmetric)', () => {
    it('should have larger right margin for icons', () => {
      expect(SAFE_ZONES.reels.right).toBe(120);
      expect(SAFE_ZONES.reels.right).toBeGreaterThan(SAFE_ZONES.reels.left);
    });

    it('should have correct values', () => {
      expect(SAFE_ZONES.reels).toEqual({
        top: 120,
        bottom: 200,
        left: 40,
        right: 120,
      });
    });
  });

  describe('shorts', () => {
    it('should have correct values', () => {
      expect(SAFE_ZONES.shorts).toEqual({
        top: 100,
        bottom: 180,
        left: 40,
        right: 40,
      });
    });
  });

  describe('universal', () => {
    it('should be most conservative (largest margins)', () => {
      expect(SAFE_ZONES.universal.top).toBe(150);
      expect(SAFE_ZONES.universal.bottom).toBe(270);
      expect(SAFE_ZONES.universal.right).toBe(120);
    });
  });

  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(SAFE_ZONES)).toBe(true);
    expect(Object.isFrozen(SAFE_ZONES.tiktok)).toBe(true);
    expect(Object.isFrozen(SAFE_ZONES.reels)).toBe(true);
    expect(Object.isFrozen(SAFE_ZONES.shorts)).toBe(true);
    expect(Object.isFrozen(SAFE_ZONES.universal)).toBe(true);
  });

  it('should have correct type coverage', () => {
    const names: PlatformName[] = ['tiktok', 'reels', 'shorts', 'universal'];
    names.forEach((name) => {
      expect(SAFE_ZONES[name]).toBeDefined();
    });
  });

  it('should match SafeZone interface', () => {
    const zone: SafeZone = SAFE_ZONES.tiktok;
    expect(zone.top).toBeTypeOf('number');
    expect(zone.bottom).toBeTypeOf('number');
    expect(zone.left).toBeTypeOf('number');
    expect(zone.right).toBeTypeOf('number');
  });
});

describe('getContentBounds', () => {
  it('should calculate content bounds for tiktok at 1080x1920', () => {
    const bounds = getContentBounds('tiktok', 1080, 1920);
    expect(bounds).toEqual({
      x: 40,
      y: 150,
      width: 1080 - 40 - 40, // 1000
      height: 1920 - 150 - 270, // 1500
    });
  });

  it('should calculate content bounds for reels at 1080x1920', () => {
    const bounds = getContentBounds('reels', 1080, 1920);
    expect(bounds).toEqual({
      x: 40,
      y: 120,
      width: 1080 - 40 - 120, // 920 (asymmetric)
      height: 1920 - 120 - 200, // 1600
    });
  });

  it('should use default dimensions if not provided', () => {
    const bounds = getContentBounds('tiktok');
    expect(bounds.width).toBe(1000);
    expect(bounds.height).toBe(1500);
  });

  it('should work for different canvas sizes', () => {
    const bounds = getContentBounds('tiktok', 720, 1280);
    expect(bounds).toEqual({
      x: 40,
      y: 150,
      width: 720 - 40 - 40, // 640
      height: 1280 - 150 - 270, // 860
    });
  });
});
