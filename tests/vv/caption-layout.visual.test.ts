/**
 * FAIL-FIRST VISUAL TESTS: Ensures caption line spacing and safe zones.
 */
import path from 'path';
import { beforeAll, describe, expect, it } from 'vitest';
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import type { VideoConfig } from 'remotion';
import type { CaptionConfigInput } from '../../src/render/captions/config';
import {
  decodePng,
  computeMinVerticalGapBetweenInkRuns,
  findInkBoundingBox,
} from '../helpers/image';
import { SAFE_ZONES } from '../../src/render/tokens/safe-zone';

const entryPoint = path.join(process.cwd(), 'src', 'render', 'remotion', 'index.ts');

let bundleLocation = '';
let composition: VideoConfig;

beforeAll(async () => {
  bundleLocation = await bundle({
    entryPoint,
    onProgress: () => undefined,
  });

  composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'caption-spacing-test',
  });
}, 60000);

async function renderCaptionStill(inputProps: Record<string, unknown>, frameSeconds: number) {
  const frame = Math.round(frameSeconds * composition.fps);
  const { buffer } = await renderStill({
    serveUrl: bundleLocation,
    composition,
    frame,
    imageFormat: 'png',
    inputProps,
  });

  if (!buffer) {
    throw new Error('renderStill did not return a buffer.');
  }

  return decodePng(buffer);
}

describe('V&V: caption layout (visual)', () => {
  it('keeps readable line spacing for multi-line captions', async () => {
    const words = [
      { word: 'Tight', start: 0, end: 0.4 },
      { word: 'lines', start: 0.4, end: 0.8 },
      { word: 'feel', start: 0.8, end: 1.2 },
      { word: 'cramped', start: 1.2, end: 1.6 },
      { word: 'in', start: 1.6, end: 2.0 },
      { word: 'shorts', start: 2.0, end: 2.4 },
    ];
    const config: CaptionConfigInput = {
      displayMode: 'page',
      lineHeight: 1.2,
      layout: {
        maxCharsPerLine: 10,
        maxLinesPerPage: 2,
      },
    };

    const image = await renderCaptionStill({ words, config }, 1.0);
    const minGap = computeMinVerticalGapBetweenInkRuns(image, {
      background: { r: 0, g: 0, b: 0 },
      threshold: 20,
      minInkPixels: 6,
    });

    expect(minGap).toBeGreaterThanOrEqual(16);
  });

  it('respects TikTok safe zone at the bottom', async () => {
    const words = [
      { word: 'Safe', start: 0, end: 0.5 },
      { word: 'zone', start: 0.5, end: 1.0 },
      { word: 'check', start: 1.0, end: 1.5 },
    ];
    const config: CaptionConfigInput = {
      displayMode: 'page',
      position: 'bottom',
      positionOffset: { edgeDistance: 0, horizontalPadding: 40 },
      safeZone: { enabled: true, platform: 'tiktok' },
    };

    const image = await renderCaptionStill({ words, config }, 0.8);
    const bounds = findInkBoundingBox(image, { r: 0, g: 0, b: 0 }, 20);
    const bottomSafe = SAFE_ZONES.tiktok.bottom;
    const maxAllowed = image.height - bottomSafe + 2;

    expect(bounds.maxY).toBeLessThanOrEqual(maxAllowed);
  });
});
