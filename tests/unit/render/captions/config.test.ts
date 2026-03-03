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

  it('accepts listBadges config overrides', () => {
    const parsed = CaptionConfigSchema.parse({
      listBadges: {
        enabled: true,
        durationMs: 1400,
        fadeInMs: 120,
        fadeOutMs: 220,
        sizePx: 96,
        fontSizePx: 44,
        gapPx: 140,
        captionSafetyPx: 100,
      },
    });
    expect(parsed.listBadges.enabled).toBe(true);
    expect(parsed.listBadges.durationMs).toBe(1400);
    expect(parsed.listBadges.sizePx).toBe(96);
    expect(parsed.listBadges.gapPx).toBe(140);
  });
});
