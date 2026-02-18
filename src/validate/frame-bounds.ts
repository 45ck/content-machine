import sharp from 'sharp';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFfmpeg } from '../core/video/ffmpeg';
import { probeVideoWithFfprobe } from './ffprobe';

export type FrameEdgeMetrics = {
  meanLumaBorder: number;
  meanLumaInner: number;
  meanSatBorder: number;
  meanSatInner: number;
  brightRatioBorder: number;
  chromaRatioBorder: number;
  borderWidthPx: number;
};

export type FrameBoundsFrameResult = {
  timestampSeconds: number;
  width: number;
  height: number;
  sides: {
    top: FrameEdgeMetrics;
    bottom: FrameEdgeMetrics;
    left: FrameEdgeMetrics;
    right: FrameEdgeMetrics;
  };
};

export type FrameBoundsSummary = {
  schemaVersion: '1.0.0';
  videoPath: string;
  frames: FrameBoundsFrameResult[];
  thresholds: {
    borderRatio: number;
    maxDarkening: number;
    maxEdgeContentRatio: number;
    brightLuma: number;
    chromaSat: number;
  };
  worst: {
    maxDarkening: number;
    maxEdgeContentRatio: number;
    side: 'top' | 'bottom' | 'left' | 'right';
    timestampSeconds: number;
  };
};

export type FrameBoundsGate = {
  schemaVersion: '1.0.0';
  passed: boolean;
  summary: string;
  details: {
    maxDarkening: number;
    maxEdgeContentRatio: number;
    side: 'top' | 'bottom' | 'left' | 'right';
    timestampSeconds: number;
    thresholds: FrameBoundsSummary['thresholds'];
  };
  analysis: FrameBoundsSummary;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function luma709(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/**
 * Fast saturation proxy in [0..1].
 * Uses (max-min)/max to avoid HSL conversion cost.
 */
function satProxy(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max <= 0) return 0;
  return (max - min) / max;
}

export function analyzeFrameEdgesFromRgb(params: {
  width: number;
  height: number;
  data: Uint8Array;
  borderRatio: number;
  brightLuma: number;
  chromaSat: number;
  sampleStepPx?: number;
}): FrameBoundsFrameResult['sides'] & { borderWidthPx: number } {
  const { width, height, data } = params;
  const borderWidthPx = Math.max(2, Math.floor(Math.min(width, height) * params.borderRatio));
  const innerOffset = borderWidthPx;
  const innerWidthPx = borderWidthPx;
  const step = Math.max(1, params.sampleStepPx ?? 3);

  function idx(x: number, y: number): number {
    return (y * width + x) * 3;
  }

  function analyzeRegion(region: { x0: number; y0: number; x1: number; y1: number }): {
    meanLuma: number;
    meanSat: number;
    brightRatio: number;
    chromaRatio: number;
    n: number;
  } {
    let n = 0;
    let lumaSum = 0;
    let satSum = 0;
    let brightCount = 0;
    let chromaCount = 0;

    const x0 = clamp(region.x0, 0, width - 1);
    const y0 = clamp(region.y0, 0, height - 1);
    const x1 = clamp(region.x1, 0, width);
    const y1 = clamp(region.y1, 0, height);

    for (let y = y0; y < y1; y += step) {
      for (let x = x0; x < x1; x += step) {
        const i = idx(x, y);
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const l = luma709(r, g, b);
        const s = satProxy(r, g, b);
        n++;
        lumaSum += l;
        satSum += s;
        if (l >= params.brightLuma) brightCount++;
        if (s >= params.chromaSat && l >= 0.2) chromaCount++;
      }
    }

    return {
      meanLuma: n > 0 ? lumaSum / n : 0,
      meanSat: n > 0 ? satSum / n : 0,
      brightRatio: n > 0 ? brightCount / n : 0,
      chromaRatio: n > 0 ? chromaCount / n : 0,
      n,
    };
  }

  function sideMetrics(side: 'top' | 'bottom' | 'left' | 'right'): FrameEdgeMetrics {
    const border =
      side === 'top'
        ? { x0: 0, y0: 0, x1: width, y1: borderWidthPx }
        : side === 'bottom'
          ? { x0: 0, y0: height - borderWidthPx, x1: width, y1: height }
          : side === 'left'
            ? { x0: 0, y0: 0, x1: borderWidthPx, y1: height }
            : { x0: width - borderWidthPx, y0: 0, x1: width, y1: height };

    const inner =
      side === 'top'
        ? { x0: 0, y0: innerOffset, x1: width, y1: innerOffset + innerWidthPx }
        : side === 'bottom'
          ? { x0: 0, y0: height - innerOffset - innerWidthPx, x1: width, y1: height - innerOffset }
          : side === 'left'
            ? { x0: innerOffset, y0: 0, x1: innerOffset + innerWidthPx, y1: height }
            : { x0: width - innerOffset - innerWidthPx, y0: 0, x1: width - innerOffset, y1: height };

    const b = analyzeRegion(border);
    const inn = analyzeRegion(inner);

    return {
      meanLumaBorder: b.meanLuma,
      meanLumaInner: inn.meanLuma,
      meanSatBorder: b.meanSat,
      meanSatInner: inn.meanSat,
      brightRatioBorder: b.brightRatio,
      chromaRatioBorder: b.chromaRatio,
      borderWidthPx,
    };
  }

  return {
    borderWidthPx,
    top: sideMetrics('top'),
    bottom: sideMetrics('bottom'),
    left: sideMetrics('left'),
    right: sideMetrics('right'),
  };
}

export async function analyzeFrameBounds(videoPath: string, opts?: { frameCount?: number }): Promise<FrameBoundsSummary> {
  const frameCount = Math.max(3, Math.min(9, opts?.frameCount ?? 5));
  const info = await probeVideoWithFfprobe(videoPath);

  const thresholds = {
    // Outer strip width. 1% is enough to catch clipping and vignette without being too sensitive.
    borderRatio: 0.01,
    // If border is this much darker than inner strip, we likely have an unintended vignette / crop.
    maxDarkening: 0.12,
    // If too much colorful/bright content shows on the border, it usually means something is touching/clipped.
    maxEdgeContentRatio: 0.035,
    // Bright pixel threshold in luma.
    brightLuma: 0.78,
    // Chroma proxy threshold.
    chromaSat: 0.42,
  };

  const duration = Math.max(0.001, info.durationSeconds);
  const times: number[] = [];
  for (let i = 0; i < frameCount; i++) {
    const t = duration * (i / (frameCount - 1));
    // Avoid requesting a frame past EOF (ffmpeg can output 0 frames).
    const safeT = i === frameCount - 1 ? Math.max(0, duration - 0.5) : t;
    times.push(Number(safeT.toFixed(3)));
  }

  const framesDir = join(tmpdir(), `cm-frame-bounds-${Date.now()}`);
  mkdirSync(framesDir, { recursive: true });

  const outPaths: string[] = [];
  try {
    for (let i = 0; i < times.length; i++) {
      const t = times[i];
      const out = join(framesDir, `frame_${String(i + 1).padStart(2, '0')}_${t.toFixed(3)}.png`);
      outPaths.push(out);
      await execFfmpeg(
        ['-hide_banner', '-loglevel', 'error', '-ss', String(t), '-i', videoPath, '-frames:v', '1', out],
        { dependencyMessage: 'ffmpeg is required for frame bounds analysis' }
      );
    }

    const frames: FrameBoundsFrameResult[] = [];
    for (let i = 0; i < outPaths.length; i++) {
      const p = outPaths[i];
      const t = times[i];
      const img = sharp(p);
      const { data, info: meta } = await img.raw().toBuffer({ resolveWithObject: true });
      // raw() returns RGBA by default for some inputs; enforce RGB.
      const channels = meta.channels;
      const width = meta.width;
      const height = meta.height;
      const rgb =
        channels === 3
          ? data
          : channels === 4
            ? (() => {
                const out = new Uint8Array(width * height * 3);
                for (let j = 0, k = 0; j < data.length; j += 4, k += 3) {
                  out[k] = data[j];
                  out[k + 1] = data[j + 1];
                  out[k + 2] = data[j + 2];
                }
                return out;
              })()
            : new Uint8Array(data); // best-effort

      const sides = analyzeFrameEdgesFromRgb({
        width,
        height,
        data: rgb,
        borderRatio: thresholds.borderRatio,
        brightLuma: thresholds.brightLuma,
        chromaSat: thresholds.chromaSat,
        sampleStepPx: 3,
      });

      frames.push({
        timestampSeconds: t,
        width,
        height,
        sides: {
          top: sides.top,
          bottom: sides.bottom,
          left: sides.left,
          right: sides.right,
        },
      });
    }

    // Find worst-case.
    let worst: FrameBoundsSummary['worst'] = {
      maxDarkening: 0,
      maxEdgeContentRatio: 0,
      side: 'top',
      timestampSeconds: times[0] ?? 0,
    };

    for (const f of frames) {
      for (const side of ['top', 'bottom', 'left', 'right'] as const) {
        const m = f.sides[side];
        const darkening = Math.max(0, m.meanLumaInner - m.meanLumaBorder);
        const edgeContent = Math.max(m.brightRatioBorder, m.chromaRatioBorder);
        if (darkening > worst.maxDarkening || edgeContent > worst.maxEdgeContentRatio) {
          // prioritize darkening first, then edge content.
          const scoreCurrent = darkening * 0.65 + edgeContent * 0.35;
          const scoreWorst = worst.maxDarkening * 0.65 + worst.maxEdgeContentRatio * 0.35;
          if (scoreCurrent >= scoreWorst) {
            worst = {
              maxDarkening: Math.max(worst.maxDarkening, darkening),
              maxEdgeContentRatio: Math.max(worst.maxEdgeContentRatio, edgeContent),
              side,
              timestampSeconds: f.timestampSeconds,
            };
          }
        }
      }
    }

    return {
      schemaVersion: '1.0.0',
      videoPath,
      frames,
      thresholds,
      worst,
    };
  } finally {
    // Best-effort cleanup.
    try {
      rmSync(framesDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
}

export function runFrameBoundsGate(summary: FrameBoundsSummary): FrameBoundsGate {
  const { maxDarkening, maxEdgeContentRatio, side, timestampSeconds } = summary.worst;
  const passed =
    maxDarkening <= summary.thresholds.maxDarkening &&
    maxEdgeContentRatio <= summary.thresholds.maxEdgeContentRatio;

  const s = passed
    ? `Frame bounds OK (max darkening ${(maxDarkening * 100).toFixed(1)}%, edge content ${(maxEdgeContentRatio * 100).toFixed(1)}%)`
    : `Frame bounds suspect (max darkening ${(maxDarkening * 100).toFixed(1)}% on ${side} @ ${timestampSeconds.toFixed(2)}s, edge content ${(maxEdgeContentRatio * 100).toFixed(1)}%)`;

  return {
    schemaVersion: '1.0.0',
    passed,
    summary: s,
    details: {
      maxDarkening,
      maxEdgeContentRatio,
      side,
      timestampSeconds,
      thresholds: summary.thresholds,
    },
    analysis: summary,
  };
}
