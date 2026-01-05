/**
 * Palette Presets Unit Tests
 *
 * TDD: RED phase - Write failing tests first
 */
import { describe, it, expect } from 'vitest';
import {
  PALETTES,
  type PaletteName,
  type ColorPalette,
} from '../../../../src/render/presets/palette';
import { COLORS } from '../../../../src/render/tokens/color';

describe('PALETTES', () => {
  it('should be frozen (immutable)', () => {
    expect(Object.isFrozen(PALETTES)).toBe(true);
  });

  it('should have all palettes frozen', () => {
    Object.values(PALETTES).forEach((palette) => {
      expect(Object.isFrozen(palette)).toBe(true);
    });
  });

  describe('earthyComfort', () => {
    it('should exist', () => {
      expect(PALETTES.earthyComfort).toBeDefined();
    });

    it('should use Pantone 2025 colors', () => {
      expect(PALETTES.earthyComfort.primary).toBe(COLORS.mochaMousse);
      expect(PALETTES.earthyComfort.secondary).toBe(COLORS.warmTaupe);
      expect(PALETTES.earthyComfort.accent).toBe(COLORS.dustyRose);
    });

    it('should have all required palette properties', () => {
      const palette = PALETTES.earthyComfort;
      expect(palette.primary).toBeDefined();
      expect(palette.secondary).toBeDefined();
      expect(palette.accent).toBeDefined();
      expect(palette.background).toBeDefined();
      expect(palette.text).toBeDefined();
      expect(palette.textMuted).toBeDefined();
      expect(palette.highlight).toBeDefined();
      expect(palette.stroke).toBeDefined();
    });
  });

  describe('futurePop', () => {
    it('should exist', () => {
      expect(PALETTES.futurePop).toBeDefined();
    });

    it('should use WGSN Future Dusk colors', () => {
      expect(PALETTES.futurePop.primary).toBe(COLORS.electricBlue);
      expect(PALETTES.futurePop.secondary).toBe(COLORS.neonPink);
      expect(PALETTES.futurePop.accent).toBe(COLORS.cyberPurple);
    });

    it('should have lime accent as highlight', () => {
      expect(PALETTES.futurePop.highlight).toBe(COLORS.limeAccent);
    });
  });

  describe('tikTokNative', () => {
    it('should exist', () => {
      expect(PALETTES.tikTokNative).toBeDefined();
    });

    it('should use TikTok brand colors', () => {
      expect(PALETTES.tikTokNative.primary).toBe(COLORS.tikTokPink);
      expect(PALETTES.tikTokNative.secondary).toBe(COLORS.tikTokCyan);
    });
  });

  describe('cleanMinimal', () => {
    it('should exist', () => {
      expect(PALETTES.cleanMinimal).toBeDefined();
    });

    it('should have high contrast (white on black)', () => {
      expect(PALETTES.cleanMinimal.text).toBe(COLORS.white);
      expect(PALETTES.cleanMinimal.background).toBe(COLORS.black);
    });

    it('should use yellow highlight', () => {
      expect(PALETTES.cleanMinimal.highlight).toBe(COLORS.highlightYellow);
    });
  });

  describe('boldTech', () => {
    it('should exist', () => {
      expect(PALETTES.boldTech).toBeDefined();
    });

    it('should use high-energy colors', () => {
      expect(PALETTES.boldTech.primary).toBe(COLORS.electricBlue);
      expect(PALETTES.boldTech.accent).toBe(COLORS.neonPink);
    });
  });

  it('should have correct type coverage', () => {
    const names: PaletteName[] = [
      'earthyComfort',
      'futurePop',
      'tikTokNative',
      'cleanMinimal',
      'boldTech',
    ];
    names.forEach((name) => {
      expect(PALETTES[name]).toBeDefined();
    });
  });

  it('should match ColorPalette interface for all palettes', () => {
    Object.values(PALETTES).forEach((palette: ColorPalette) => {
      expect(palette.primary).toBeTypeOf('string');
      expect(palette.secondary).toBeTypeOf('string');
      expect(palette.accent).toBeTypeOf('string');
      expect(palette.background).toBeTypeOf('string');
      expect(palette.text).toBeTypeOf('string');
      expect(palette.textMuted).toBeTypeOf('string');
      expect(palette.highlight).toBeTypeOf('string');
      expect(palette.stroke).toBeTypeOf('string');
    });
  });

  it('should have all colors as valid hex or valid color strings', () => {
    const hexRegex = /^#[0-9A-Fa-f]{6}$/;
    Object.values(PALETTES).forEach((palette) => {
      Object.values(palette).forEach((color) => {
        expect(color).toMatch(hexRegex);
      });
    });
  });
});
