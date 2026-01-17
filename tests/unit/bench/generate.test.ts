import { describe, expect, it } from 'vitest';
import { buildFfmpegArgsForVariant } from '../../../src/bench/generate';
import type { BenchStressVariant } from '../../../src/bench/types';

function baseVariant(overrides: Partial<BenchStressVariant>): BenchStressVariant {
  return {
    schemaVersion: '1.0.0',
    id: 'v1',
    recipeId: 'crop-bottom',
    recipeLabel: 'label',
    severity: 1,
    proSourcePath: '/tmp/pro.mp4',
    outputPath: '/tmp/out.mp4',
    description: 'desc',
    expectedMetric: 'overall.score',
    ...overrides,
  };
}

describe('bench generate', () => {
  it('builds audio desync args with audio delay and video copy', () => {
    const variant = baseVariant({
      recipeId: 'audio-desync',
      recipeLabel: 'Audio delay +160ms',
      severity: 160,
      expectedMetric: 'sync.rating',
      recipeParams: { delayMs: 160 },
    });

    const { args } = buildFfmpegArgsForVariant({
      variant,
      proInfo: { width: 1080, height: 1920 },
    });

    expect(args).toContain('-filter_complex');
    const filterIdx = args.indexOf('-filter_complex');
    expect(args[filterIdx + 1]).toContain('adelay=160|160');

    expect(args).toContain('-c:v');
    const cvIdx = args.indexOf('-c:v');
    expect(args[cvIdx + 1]).toBe('copy');

    expect(args[args.length - 1]).toBe('/tmp/out.mp4');
  });

  it('builds caption flicker args using configured period', () => {
    const variant = baseVariant({
      recipeId: 'caption-flicker',
      recipeLabel: 'Caption flicker every 120 frames',
      severity: 9,
      expectedMetric: 'flicker.score',
      recipeParams: { periodFrames: 120, bandYRatio: 0.65, bandHeightRatio: 0.35 },
    });

    const { args } = buildFfmpegArgsForVariant({
      variant,
      proInfo: { width: 1080, height: 1920 },
    });

    expect(args).toContain('-vf');
    const vfIdx = args.indexOf('-vf');
    expect(args[vfIdx + 1]).toContain('drawbox=');
    expect(args[vfIdx + 1]).toContain('mod(n\\,120)');
  });
});
