/**
 * Easing Tokens Unit Tests
 *
 * TDD: RED phase - Write failing tests first
 */
import { describe, it, expect } from 'vitest';
import {
  EASING_CURVES,
  SPRING_CONFIGS,
  type EasingCurveName,
  type SpringConfigName,
  type SpringConfig,
} from '../../../../src/render/tokens/easing';

describe('EASING_CURVES', () => {
  it('should export snapSettle curve', () => {
    expect(EASING_CURVES.snapSettle).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
  });

  it('should export punchyPop curve', () => {
    expect(EASING_CURVES.punchyPop).toBe('cubic-bezier(0.34, 1.56, 0.64, 1)');
  });

  it('should export smoothGlide curve', () => {
    expect(EASING_CURVES.smoothGlide).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
  });

  it('should export linear curve', () => {
    expect(EASING_CURVES.linear).toBe('cubic-bezier(0, 0, 1, 1)');
  });

  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(EASING_CURVES)).toBe(true);
  });

  it('should have correct type for curve names', () => {
    const curveNames: EasingCurveName[] = ['snapSettle', 'punchyPop', 'smoothGlide', 'linear'];
    curveNames.forEach((name) => {
      expect(EASING_CURVES[name]).toBeDefined();
    });
  });
});

describe('SPRING_CONFIGS', () => {
  it('should export snappy config', () => {
    expect(SPRING_CONFIGS.snappy).toEqual({
      damping: 15,
      stiffness: 200,
      mass: 1,
    });
  });

  it('should export bouncy config', () => {
    expect(SPRING_CONFIGS.bouncy).toEqual({
      damping: 10,
      stiffness: 150,
      mass: 1,
    });
  });

  it('should export gentle config', () => {
    expect(SPRING_CONFIGS.gentle).toEqual({
      damping: 20,
      stiffness: 100,
      mass: 1,
    });
  });

  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(SPRING_CONFIGS)).toBe(true);
    expect(Object.isFrozen(SPRING_CONFIGS.snappy)).toBe(true);
    expect(Object.isFrozen(SPRING_CONFIGS.bouncy)).toBe(true);
    expect(Object.isFrozen(SPRING_CONFIGS.gentle)).toBe(true);
  });

  it('should have correct type for config names', () => {
    const configNames: SpringConfigName[] = ['snappy', 'bouncy', 'gentle'];
    configNames.forEach((name) => {
      expect(SPRING_CONFIGS[name]).toBeDefined();
    });
  });

  it('should match SpringConfig interface', () => {
    const config: SpringConfig = SPRING_CONFIGS.snappy;
    expect(config.damping).toBeTypeOf('number');
    expect(config.stiffness).toBeTypeOf('number');
    expect(config.mass).toBeTypeOf('number');
  });
});
