import { describe, expect, it } from 'vitest';
import { getValidateProfile } from '../../../src/validate/profiles';

describe('validate profiles', () => {
  it('keeps the portrait profile strict enough to reject static short-form edits', () => {
    const profile = getValidateProfile('portrait');

    expect(profile.flickerMin).toBe(0.65);
    expect(profile.maxDuplicateFrameRatio).toBe(0.2);
  });

  it('keeps the landscape profile strict enough to reject static short-form edits', () => {
    const profile = getValidateProfile('landscape');

    expect(profile.flickerMin).toBe(0.65);
    expect(profile.maxDuplicateFrameRatio).toBe(0.18);
  });
});
