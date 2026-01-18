import { describe, expect, it } from 'vitest';

import { CaptionConfigSchema } from '../../../../src/render/captions/config';

describe('CaptionConfigSchema', () => {
  it('accepts highlightMode=none', () => {
    const parsed = CaptionConfigSchema.parse({ highlightMode: 'none' });
    expect(parsed.highlightMode).toBe('none');
  });
});
