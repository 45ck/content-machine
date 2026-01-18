import { describe, expect, it } from 'vitest';

import { CaptionConfigSchema } from '../../../../src/render/captions/config';

describe('CaptionConfigSchema', () => {
  it('accepts highlightMode=none', () => {
    const parsed = CaptionConfigSchema.parse({ highlightMode: 'none' });
    expect(parsed.highlightMode).toBe('none');
  });

  it('accepts wordAnimation config', () => {
    const parsed = CaptionConfigSchema.parse({
      wordAnimation: 'pop',
      wordAnimationMs: 110,
      wordAnimationIntensity: 0.5,
    });
    expect(parsed.wordAnimation).toBe('pop');
    expect(parsed.wordAnimationMs).toBe(110);
    expect(parsed.wordAnimationIntensity).toBe(0.5);
  });
});
