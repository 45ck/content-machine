/**
 * Color Tokens Unit Tests
 *
 * TDD: RED phase - Write failing tests first
 */
import { describe, it, expect } from 'vitest';
import { COLORS, type ColorName } from '../../../../src/render/tokens/color';

describe('COLORS', () => {
  describe('neutrals', () => {
    it('should export white', () => {
      expect(COLORS.white).toBe('#FFFFFF');
    });

    it('should export black', () => {
      expect(COLORS.black).toBe('#000000');
    });
  });

  describe('Earthy Comfort palette (Pantone 2025)', () => {
    it('should export mochaMousse', () => {
      expect(COLORS.mochaMousse).toBe('#A47551');
    });

    it('should export warmTaupe', () => {
      expect(COLORS.warmTaupe).toBe('#8B7355');
    });

    it('should export dustyRose', () => {
      expect(COLORS.dustyRose).toBe('#D4A5A5');
    });

    it('should export oliveGreen', () => {
      expect(COLORS.oliveGreen).toBe('#6B7B3C');
    });
  });

  describe('Future Pop palette (WGSN Future Dusk)', () => {
    it('should export electricBlue', () => {
      expect(COLORS.electricBlue).toBe('#00D4FF');
    });

    it('should export neonPink', () => {
      expect(COLORS.neonPink).toBe('#FF2D95');
    });

    it('should export cyberPurple', () => {
      expect(COLORS.cyberPurple).toBe('#9D4EDD');
    });

    it('should export limeAccent', () => {
      expect(COLORS.limeAccent).toBe('#B8FF00');
    });
  });

  describe('TikTok Brand', () => {
    it('should export tikTokPink', () => {
      expect(COLORS.tikTokPink).toBe('#FF0050');
    });

    it('should export tikTokCyan', () => {
      expect(COLORS.tikTokCyan).toBe('#00F2EA');
    });
  });

  describe('Functional colors', () => {
    it('should export highlightYellow', () => {
      expect(COLORS.highlightYellow).toBe('#FFE135');
    });

    it('should export errorRed', () => {
      expect(COLORS.errorRed).toBe('#FF3B30');
    });

    it('should export successGreen', () => {
      expect(COLORS.successGreen).toBe('#34C759');
    });
  });

  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(COLORS)).toBe(true);
  });

  it('should have all values as valid hex colors', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    Object.values(COLORS).forEach((color) => {
      expect(color).toMatch(hexRegex);
    });
  });

  it('should have correct ColorName type coverage', () => {
    const colorNames: ColorName[] = [
      'white',
      'black',
      'mochaMousse',
      'warmTaupe',
      'dustyRose',
      'oliveGreen',
      'electricBlue',
      'neonPink',
      'cyberPurple',
      'limeAccent',
      'tikTokPink',
      'tikTokCyan',
      'highlightYellow',
      'errorRed',
      'successGreen',
    ];
    colorNames.forEach((name) => {
      expect(COLORS[name]).toBeDefined();
    });
  });
});
