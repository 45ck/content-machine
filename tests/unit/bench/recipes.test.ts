import { describe, expect, it } from 'vitest';
import { buildDefaultBenchVariants } from '../../../src/bench/recipes';

describe('bench recipes', () => {
  it('buildDefaultBenchVariants emits variants with expectedMetric', () => {
    const variants = buildDefaultBenchVariants({ proSourcePath: '/tmp/pro.mp4' });
    expect(variants.length).toBeGreaterThan(0);
    for (const v of variants) {
      expect(v.proSourcePath).toBe('/tmp/pro.mp4');
      expect(v.recipeId).toBeTruthy();
      expect(v.expectedMetric).toBeTruthy();
      expect(v.severity).toBeGreaterThan(0);
      expect(v.recipeParams).toBeTruthy();
    }
  });

  it('includes an audio desync ladder', () => {
    const variants = buildDefaultBenchVariants({ proSourcePath: '/tmp/pro.mp4' });
    const desync = variants.filter((v) => v.recipeId === 'audio-desync');
    expect(desync.length).toBeGreaterThan(0);
    for (const v of desync) {
      expect(v.expectedMetric).toBe('sync.rating');
      expect(v.recipeParams?.delayMs).toBeTruthy();
    }
  });
});
