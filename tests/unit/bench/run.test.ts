import { describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runBench } from '../../../src/bench/run';
import type { BenchStressManifest } from '../../../src/bench/types';

function makeCaptionReport(params: {
  overall: number;
  safeArea: number;
  errors?: Array<{ type: string }>;
}): any {
  return {
    captionQuality: {
      overall: { score: params.overall, passed: true },
      safeArea: { score: params.safeArea, violationCount: 0, minMarginRatio: 1 },
      flicker: { score: 1, flickerEvents: 0 },
      jitter: { score: 1, meanCenterDeltaPx: 0, p95CenterDeltaPx: 0 },
      ocrConfidence: { score: 1, mean: 1, min: 1, stddev: 0 },
    },
    errors: params.errors ?? [],
  };
}

function makeSyncReport(params: { rating: number; errors?: Array<{ type: string }> }): any {
  return { rating: params.rating, errors: params.errors ?? [] };
}

describe('bench run', () => {
  it('passes determinism + stress monotonicity (caption + sync)', async () => {
    const root = mkdtempSync(join(tmpdir(), 'cm-bench-'));
    try {
      const proDir = join(root, 'pro');
      const ourDir = join(root, 'our');
      const stressDir = join(root, 'stress');
      mkdirSync(proDir, { recursive: true });
      mkdirSync(ourDir, { recursive: true });
      mkdirSync(stressDir, { recursive: true });

      const proPath = join(proDir, 'pro1.mp4');
      const ourPath = join(ourDir, 'our1.mp4');
      writeFileSync(proPath, '');
      writeFileSync(ourPath, '');

      const crop10 = join(stressDir, 'pro1', 'crop-bottom', '10.mp4');
      const crop20 = join(stressDir, 'pro1', 'crop-bottom', '20.mp4');
      const crop40 = join(stressDir, 'pro1', 'crop-bottom', '40.mp4');
      mkdirSync(join(stressDir, 'pro1', 'crop-bottom'), { recursive: true });
      writeFileSync(crop10, '');
      writeFileSync(crop20, '');
      writeFileSync(crop40, '');

      const d80 = join(stressDir, 'pro1', 'audio-desync', '80.mp4');
      const d160 = join(stressDir, 'pro1', 'audio-desync', '160.mp4');
      const d400 = join(stressDir, 'pro1', 'audio-desync', '400.mp4');
      mkdirSync(join(stressDir, 'pro1', 'audio-desync'), { recursive: true });
      writeFileSync(d80, '');
      writeFileSync(d160, '');
      writeFileSync(d400, '');

      const manifest: BenchStressManifest = {
        schemaVersion: '1.0.0',
        createdAt: new Date().toISOString(),
        rootDir: root,
        variants: [
          {
            schemaVersion: '1.0.0',
            id: 'pro1:crop-bottom:10',
            recipeId: 'crop-bottom',
            recipeLabel: 'Crop bottom 10px',
            severity: 10,
            proSourcePath: proPath,
            outputPath: crop10,
            description: 'crop',
            recipeParams: { cropBottomPx: 10 },
            expectedMetric: 'safeArea.score',
            expectedErrorType: 'caption_safe_margin',
          },
          {
            schemaVersion: '1.0.0',
            id: 'pro1:crop-bottom:20',
            recipeId: 'crop-bottom',
            recipeLabel: 'Crop bottom 20px',
            severity: 20,
            proSourcePath: proPath,
            outputPath: crop20,
            description: 'crop',
            recipeParams: { cropBottomPx: 20 },
            expectedMetric: 'safeArea.score',
            expectedErrorType: 'caption_safe_margin',
          },
          {
            schemaVersion: '1.0.0',
            id: 'pro1:crop-bottom:40',
            recipeId: 'crop-bottom',
            recipeLabel: 'Crop bottom 40px',
            severity: 40,
            proSourcePath: proPath,
            outputPath: crop40,
            description: 'crop',
            recipeParams: { cropBottomPx: 40 },
            expectedMetric: 'safeArea.score',
            expectedErrorType: 'caption_safe_margin',
          },
          {
            schemaVersion: '1.0.0',
            id: 'pro1:audio-desync:80',
            recipeId: 'audio-desync',
            recipeLabel: 'Audio delay +80ms',
            severity: 80,
            proSourcePath: proPath,
            outputPath: d80,
            description: 'desync',
            recipeParams: { delayMs: 80 },
            expectedMetric: 'sync.rating',
            expectedErrorType: 'global_offset',
          },
          {
            schemaVersion: '1.0.0',
            id: 'pro1:audio-desync:160',
            recipeId: 'audio-desync',
            recipeLabel: 'Audio delay +160ms',
            severity: 160,
            proSourcePath: proPath,
            outputPath: d160,
            description: 'desync',
            recipeParams: { delayMs: 160 },
            expectedMetric: 'sync.rating',
            expectedErrorType: 'global_offset',
          },
          {
            schemaVersion: '1.0.0',
            id: 'pro1:audio-desync:400',
            recipeId: 'audio-desync',
            recipeLabel: 'Audio delay +400ms',
            severity: 400,
            proSourcePath: proPath,
            outputPath: d400,
            description: 'desync',
            recipeParams: { delayMs: 400 },
            expectedMetric: 'sync.rating',
            expectedErrorType: 'global_offset',
          },
        ],
      };
      writeFileSync(join(stressDir, 'manifest.json'), JSON.stringify(manifest));

      const captionReports = new Map<string, any>([
        [proPath, makeCaptionReport({ overall: 0.95, safeArea: 1.0 })],
        [ourPath, makeCaptionReport({ overall: 0.85, safeArea: 1.0 })],
        [crop10, makeCaptionReport({ overall: 0.95, safeArea: 0.9 })],
        [crop20, makeCaptionReport({ overall: 0.95, safeArea: 0.8 })],
        [
          crop40,
          makeCaptionReport({
            overall: 0.95,
            safeArea: 0.6,
            errors: [{ type: 'caption_safe_margin' }],
          }),
        ],
      ]);
      const syncReports = new Map<string, any>([
        [proPath, makeSyncReport({ rating: 100 })],
        [d80, makeSyncReport({ rating: 92 })],
        [d160, makeSyncReport({ rating: 80 })],
        [d400, makeSyncReport({ rating: 40, errors: [{ type: 'global_offset' }] })],
      ]);

      const report = await runBench({
        rootDir: root,
        includeStress: true,
        determinismRuns: 3,
        determinismEpsilon: 0,
        deps: {
          rateCaption: async (videoPath) => {
            const v = captionReports.get(videoPath);
            if (!v) throw new Error(`Missing caption report for: ${videoPath}`);
            return v;
          },
          rateSync: async (videoPath) => {
            const v = syncReports.get(videoPath);
            if (!v) throw new Error(`Missing sync report for: ${videoPath}`);
            return v;
          },
        },
      });

      expect(report.summary.passed).toBe(true);
      expect(report.determinism.passed).toBe(true);
      expect(report.stress.length).toBe(2);
      expect(report.stress.every((s) => s.monotonicPassed)).toBe(true);
      expect(report.stress.find((s) => s.recipeId === 'crop-bottom')?.errorTriggered).toBe(true);
      expect(report.stress.find((s) => s.recipeId === 'audio-desync')?.errorTriggered).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
