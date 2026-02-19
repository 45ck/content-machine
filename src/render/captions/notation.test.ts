import { describe, expect, it } from 'vitest';
import { applyCaptionDisplayTransform, applyNotationTransform } from './notation';

describe('applyNotationTransform', () => {
  it('keeps text unchanged when disabled', () => {
    expect(applyNotationTransform('x^2 -> y', 'none')).toBe('x^2 -> y');
  });

  it('renders core symbol operators in unicode mode', () => {
    expect(applyNotationTransform('x<=y and x!=z and x->z', 'unicode')).toBe(
      'x≤y and x≠z and x→z'
    );
  });

  it('renders simple powers/subscripts and greek words', () => {
    expect(applyNotationTransform('theta x^2 x_1 pi', 'unicode')).toBe('θ x² x₁ π');
  });
});

describe('applyCaptionDisplayTransform', () => {
  it('applies text transform before notation conversion', () => {
    const value = applyCaptionDisplayTransform('theta x^2', {
      textTransform: 'uppercase',
      notationMode: 'unicode',
    });
    expect(value).toBe('θ X²');
  });
});
