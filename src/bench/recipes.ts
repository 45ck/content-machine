import type { BenchStressVariant } from './types';
import { basename, extname } from 'node:path';

function baseNameNoExt(path: string): string {
  const b = basename(path);
  const ext = extname(b);
  return ext ? b.slice(0, -ext.length) : b;
}

export function buildDefaultBenchVariants(params: { proSourcePath: string }): BenchStressVariant[] {
  const proSourcePath = params.proSourcePath;
  const base = baseNameNoExt(proSourcePath);

  const variants: BenchStressVariant[] = [];

  // Caption crop / safe-area violation by cropping bottom pixels.
  const cropPxLevels = [10, 20, 40, 80];
  for (const px of cropPxLevels) {
    variants.push({
      schemaVersion: '1.0.0',
      id: `${base}:crop-bottom:${px}px`,
      recipeId: 'crop-bottom',
      recipeLabel: `Crop bottom ${px}px`,
      severity: px,
      proSourcePath,
      outputPath: '',
      description:
        'Crops the bottom of the frame and pads back to original height (cuts captions).',
      recipeParams: { cropBottomPx: px },
      expectedMetric: 'safeArea.score',
      expectedErrorType: 'caption_safe_margin',
    });
  }

  // Flicker injection by blanking the caption band periodically.
  const flickerPeriods = [120, 60, 30, 15]; // frames between dropouts (smaller = worse)
  for (const period of flickerPeriods) {
    variants.push({
      schemaVersion: '1.0.0',
      id: `${base}:caption-flicker:1/${period}`,
      recipeId: 'caption-flicker',
      recipeLabel: `Caption flicker every ${period} frames`,
      severity: Math.round(1000 / period),
      proSourcePath,
      outputPath: '',
      description:
        'Draws a black box over the caption region for one frame at a fixed interval (simulates caption dropout).',
      recipeParams: { periodFrames: period, bandYRatio: 0.65, bandHeightRatio: 0.35 },
      expectedMetric: 'flicker.score',
      expectedErrorType: 'caption_flicker',
    });
  }

  // Contrast/legibility sabotage (expect OCR confidence to drop).
  const contrastLevels = [0.85, 0.7, 0.55, 0.4];
  for (const contrast of contrastLevels) {
    variants.push({
      schemaVersion: '1.0.0',
      id: `${base}:contrast:${contrast}`,
      recipeId: 'contrast-sabotage',
      recipeLabel: `Contrast ${contrast}`,
      severity: Math.round((1 - contrast) * 100),
      proSourcePath,
      outputPath: '',
      description:
        'Lowers contrast and slightly raises brightness to reduce text/background separation.',
      recipeParams: { contrast, brightness: 0.05, saturation: 1.0 },
      expectedMetric: 'ocrConfidence.score',
      expectedErrorType: 'caption_low_confidence',
    });
  }

  // Micro-shake injection (global transform that moves captions in the frame).
  const shakePx = [1, 2, 4, 8];
  for (const px of shakePx) {
    variants.push({
      schemaVersion: '1.0.0',
      id: `${base}:shake:${px}px`,
      recipeId: 'shake',
      recipeLabel: `Shake ${px}px`,
      severity: px,
      proSourcePath,
      outputPath: '',
      description: 'Applies a small frame-to-frame crop window offset (simulates shake/jitter).',
      recipeParams: { amplitudePx: px },
      expectedMetric: 'jitter.score',
    });
  }

  // Compression artifacts by re-encoding at low bitrates (expect OCR confidence to drop).
  const bitratesK = [3000, 1500, 800];
  for (const kbps of bitratesK) {
    variants.push({
      schemaVersion: '1.0.0',
      id: `${base}:compression:${kbps}k`,
      recipeId: 'compression',
      recipeLabel: `H.264 ${kbps}k`,
      severity: Math.round(10_000 / kbps),
      proSourcePath,
      outputPath: '',
      description: 'Re-encodes at a low video bitrate to induce macroblocking and ringing.',
      recipeParams: { bitrateKbps: kbps },
      expectedMetric: 'ocrConfidence.score',
    });
  }

  // Audio/caption desync by shifting audio later relative to video.
  // Requires a captioned PRO video where OCR words should align to spoken audio.
  const audioDelayMsLevels = [80, 160, 250, 400];
  for (const delayMs of audioDelayMsLevels) {
    variants.push({
      schemaVersion: '1.0.0',
      id: `${base}:audio-desync:+${delayMs}ms`,
      recipeId: 'audio-desync',
      recipeLabel: `Audio delay +${delayMs}ms`,
      severity: delayMs,
      proSourcePath,
      outputPath: '',
      description: 'Delays the audio track relative to video to simulate caption-audio desync.',
      recipeParams: { delayMs },
      expectedMetric: 'sync.rating',
      expectedErrorType: 'global_offset',
    });
  }

  return variants;
}
