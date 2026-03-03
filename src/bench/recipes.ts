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

  // Safe-area violation by shifting the entire frame content downward.
  // This moves captions closer to the bottom edge so `safeArea.score` worsens.
  const shiftDownPxLevels = [80, 160, 240, 320];
  for (const px of shiftDownPxLevels) {
    variants.push({
      schemaVersion: '1.0.0',
      id: `${base}:safe-area-down:${px}px`,
      recipeId: 'safe-area-down',
      recipeLabel: `Shift down ${px}px`,
      severity: px,
      proSourcePath,
      outputPath: '',
      description: 'Shifts the full frame down, pushing captions into the unsafe bottom margin.',
      recipeParams: { shiftDownPx: px },
      expectedMetric: 'safeArea.score',
      expectedErrorType: 'caption_safe_margin',
    });
  }

  // Flicker injection by blanking the caption band for a short time periodically.
  // Use time-based gating so the effect survives later frame sampling (e.g., OCR at 2fps).
  // Keep the smallest period >= 1s so the signal doesn't degenerate into "missing captions"
  // at high severity (which would confound the flicker metric).
  const flickerPeriodsSeconds = [4, 2, 1.5, 1]; // smaller = worse (more frequent)
  // Use a gap long enough to be reliably observed at the default OCR sampling rate (2fps).
  const flickerGapSeconds = 0.45; // <= 0.5s so `flashDurationSecondsMax` counts it as flicker
  for (const periodSeconds of flickerPeriodsSeconds) {
    variants.push({
      schemaVersion: '1.0.0',
      id: `${base}:caption-flicker:${periodSeconds}s`,
      recipeId: 'caption-flicker',
      recipeLabel: `Caption flicker every ${periodSeconds}s`,
      severity: Math.round(1000 / periodSeconds),
      proSourcePath,
      outputPath: '',
      description:
        'Draws a black box over the caption region for a short time at a fixed interval (simulates caption dropout).',
      recipeParams: {
        periodSeconds,
        gapSeconds: flickerGapSeconds,
        bandYRatio: 0.65,
        bandHeightRatio: 0.35,
      },
      expectedMetric: 'flicker.score',
      expectedErrorType: 'caption_flicker',
    });
  }

  // Contrast/legibility sabotage (expect OCR confidence to drop).
  const contrastLevels = [
    { contrast: 0.65, blurSigma: 1.2, noise: 6 },
    { contrast: 0.45, blurSigma: 2.8, noise: 12 },
    { contrast: 0.3, blurSigma: 5.0, noise: 22 },
    { contrast: 0.2, blurSigma: 8.0, noise: 36 },
  ];
  for (const { contrast, blurSigma, noise } of contrastLevels) {
    variants.push({
      schemaVersion: '1.0.0',
      id: `${base}:contrast:${contrast}`,
      recipeId: 'contrast-sabotage',
      recipeLabel: `Contrast ${contrast}`,
      severity: Math.round((1 - contrast) * 100),
      proSourcePath,
      outputPath: '',
      description:
        'Lowers contrast, raises brightness, and blurs slightly to reduce text/background separation.',
      recipeParams: { contrast, brightness: 0.18, saturation: 0.9, blurSigma, noise },
      expectedMetric: 'ocrConfidence.score',
      expectedErrorType: 'caption_low_confidence',
    });
  }

  // Micro-shake injection (global transform that moves captions in the frame).
  const shakePx = [8, 16, 32, 64];
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
  const compressionLadder = [
    { kbps: 800, downscaleFactor: 0.25, blurSigma: 1.2 },
    { kbps: 400, downscaleFactor: 0.2, blurSigma: 2.4 },
    { kbps: 200, downscaleFactor: 0.15, blurSigma: 3.6 },
    { kbps: 100, downscaleFactor: 0.1, blurSigma: 5.0 },
  ];
  for (const { kbps, downscaleFactor, blurSigma } of compressionLadder) {
    variants.push({
      schemaVersion: '1.0.0',
      id: `${base}:compression:${kbps}k`,
      recipeId: 'compression',
      recipeLabel: `H.264 ${kbps}k`,
      severity: Math.round(10_000 / kbps),
      proSourcePath,
      outputPath: '',
      description: 'Re-encodes at a low video bitrate to induce macroblocking and ringing.',
      recipeParams: { bitrateKbps: kbps, downscaleFactor, blurSigma },
      expectedMetric: 'ocrConfidence.score',
    });
  }

  // Audio/caption desync by shifting audio later relative to video.
  // Requires a captioned PRO video where OCR words should align to spoken audio.
  const audioDelayMsLevels = [40, 80, 120, 160, 240, 320];
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
