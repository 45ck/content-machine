import { describe, it, expect } from 'vitest';
import { computeScriptMatchMetrics } from './script-match';

describe('computeScriptMatchMetrics', () => {
  it('returns perfect match for identical tokens', () => {
    const m = computeScriptMatchMetrics({
      scriptText: "Hello, world! It's me.",
      asrWords: [{ word: 'hello' }, { word: 'world' }, { word: "it's" }, { word: 'me' }],
    });
    expect(m.lcsRatio).toBe(1);
    expect(m.scriptCoverage).toBe(1);
    expect(m.asrCoverage).toBe(1);
  });

  it('penalizes missing tokens', () => {
    const m = computeScriptMatchMetrics({
      scriptText: 'one two three four',
      asrWords: [{ word: 'one' }, { word: 'three' }, { word: 'four' }],
    });
    expect(m.scriptCoverage).toBeLessThan(1);
    expect(m.asrCoverage).toBe(1);
  });
});
