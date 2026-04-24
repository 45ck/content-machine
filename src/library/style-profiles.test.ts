import { describe, expect, it } from 'vitest';
import { upsertStyleProfile } from './style-profiles';

describe('upsertStyleProfile', () => {
  it('adds or replaces profiles by id', () => {
    const result = upsertStyleProfile({
      id: 'fast-shorts',
      name: 'Fast Shorts',
      description: null,
      captionStyle: 'karaoke-ass',
      pacing: 'fast',
      visualRules: ['caption-clean'],
      renderDefaults: { orientation: 'portrait' },
      references: [],
      updatedAt: '2026-04-24T00:00:00.000Z',
    });

    expect(result.profiles).toHaveLength(1);
    expect(result.profiles[0]?.id).toBe('fast-shorts');
    expect(result.profiles[0]?.pacing).toBe('fast');
  });
});
