import { describe, it, expect } from 'vitest';
import { runVisualQualityGate } from './quality';
import type { ValidateProfile } from './profiles';

describe('runVisualQualityGate (BRISQUE)', () => {
  const profile: ValidateProfile = {
    id: 'portrait',
    width: 1080,
    height: 1920,
    minDurationSeconds: 30,
    maxDurationSeconds: 60,
    container: 'mp4',
    videoCodec: 'h264',
    audioCodec: 'aac',
    brisqueMax: 40,
  };

  it('passes when mean < threshold', () => {
    const gate = runVisualQualityGate(
      { brisque: { mean: 35, min: 30, max: 38 }, framesAnalyzed: 60 },
      profile
    );
    expect(gate.passed).toBe(true);
    expect(gate.gateId).toBe('visual-quality');
  });

  it('fails when mean >= threshold', () => {
    const gate = runVisualQualityGate(
      { brisque: { mean: 45, min: 42, max: 55 }, framesAnalyzed: 60 },
      profile
    );
    expect(gate.passed).toBe(false);
    expect(gate.fix).toBe('reduce-compression');
  });
});

