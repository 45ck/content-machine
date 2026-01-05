/**
 * Font Tokens Unit Tests
 *
 * TDD: RED phase - Write failing tests first
 */
import { describe, it, expect } from 'vitest';
import {
  FONT_STACKS,
  FONT_SIZES,
  FONT_WEIGHTS,
  type FontStackName,
  type FontSizeName,
  type FontWeightName,
} from '../../../../src/render/tokens/font';

describe('FONT_STACKS', () => {
  it('should export impact stack with Bebas Neue', () => {
    expect(FONT_STACKS.impact).toContain('Bebas Neue');
  });

  it('should export body stack with Montserrat', () => {
    expect(FONT_STACKS.body).toContain('Montserrat');
  });

  it('should export system stack', () => {
    expect(FONT_STACKS.system).toContain('-apple-system');
  });

  it('should export mono stack', () => {
    expect(FONT_STACKS.mono).toContain('JetBrains Mono');
  });

  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(FONT_STACKS)).toBe(true);
  });

  it('should have correct type coverage', () => {
    const names: FontStackName[] = ['impact', 'body', 'system', 'mono'];
    names.forEach((name) => {
      expect(FONT_STACKS[name]).toBeDefined();
    });
  });
});

describe('FONT_SIZES', () => {
  it('should export size scale', () => {
    expect(FONT_SIZES.xs).toBe(14);
    expect(FONT_SIZES.sm).toBe(18);
    expect(FONT_SIZES.md).toBe(24);
    expect(FONT_SIZES.lg).toBe(32);
    expect(FONT_SIZES.xl).toBe(48);
    expect(FONT_SIZES['2xl']).toBe(64);
    expect(FONT_SIZES['3xl']).toBe(80);
    expect(FONT_SIZES['4xl']).toBe(96);
  });

  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(FONT_SIZES)).toBe(true);
  });

  it('should have increasing scale', () => {
    const sizes = [
      FONT_SIZES.xs,
      FONT_SIZES.sm,
      FONT_SIZES.md,
      FONT_SIZES.lg,
      FONT_SIZES.xl,
      FONT_SIZES['2xl'],
      FONT_SIZES['3xl'],
      FONT_SIZES['4xl'],
    ];
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i]).toBeGreaterThan(sizes[i - 1]);
    }
  });

  it('should have correct type coverage', () => {
    const names: FontSizeName[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl'];
    names.forEach((name) => {
      expect(FONT_SIZES[name]).toBeDefined();
    });
  });
});

describe('FONT_WEIGHTS', () => {
  it('should export weight scale', () => {
    expect(FONT_WEIGHTS.normal).toBe(400);
    expect(FONT_WEIGHTS.medium).toBe(500);
    expect(FONT_WEIGHTS.semibold).toBe(600);
    expect(FONT_WEIGHTS.bold).toBe(700);
    expect(FONT_WEIGHTS.black).toBe(900);
  });

  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(FONT_WEIGHTS)).toBe(true);
  });

  it('should have increasing scale', () => {
    const weights = [
      FONT_WEIGHTS.normal,
      FONT_WEIGHTS.medium,
      FONT_WEIGHTS.semibold,
      FONT_WEIGHTS.bold,
      FONT_WEIGHTS.black,
    ];
    for (let i = 1; i < weights.length; i++) {
      expect(weights[i]).toBeGreaterThan(weights[i - 1]);
    }
  });

  it('should have correct type coverage', () => {
    const names: FontWeightName[] = ['normal', 'medium', 'semibold', 'bold', 'black'];
    names.forEach((name) => {
      expect(FONT_WEIGHTS[name]).toBeDefined();
    });
  });
});
